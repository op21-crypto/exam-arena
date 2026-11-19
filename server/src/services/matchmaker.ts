import { Server, Socket } from 'socket.io';
import { startBattleWithPlayers, activeBattles, PlayerSession } from './battleEngine.js';
import { getUserFullProfile } from './stats.js';

export interface QueueEntry {
  userId: string;
  socketId: string;
  username: string;
  rating: number;
  examId?: string;
  subjectId?: string;
  joinedAt: number;
}

export interface FriendRoomMember {
  userId: string;
  username: string;
  avatar: string;
  rating: number;
  rankTier: string;
  socketId: string;
  isReady: boolean;
  isHost: boolean;
  isBot?: boolean;
}

export interface FriendRoom {
  roomCode: string;
  hostUserId: string;
  maxPlayers: number; // 2 to 6
  members: FriendRoomMember[];
  examId?: string;
  subjectId?: string;
  createdAt: number;
}

const matchmakingQueue: QueueEntry[] = [];
const friendRooms = new Map<string, FriendRoom>(); // roomCode -> FriendRoom

// Realistic AI Aspirant Bot Personas
export const BOT_ASPIRANTS = [
  { id: 'bot-arjun', username: 'Topper_Arjun 🤖', rating: 1780, rankTier: 'Diamond', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Topper_Arjun' },
  { id: 'bot-priya', username: 'Aspirant_Priya 🤖', rating: 1450, rankTier: 'Gold', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Aspirant_Priya' },
  { id: 'bot-kavya', username: 'Speedy_Kavya 🤖', rating: 1320, rankTier: 'Silver', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Speedy_Kavya' },
  { id: 'bot-warrior', username: 'UPSC_Warrior 🤖', rating: 1560, rankTier: 'Platinum', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=UPSC_Warrior' },
  { id: 'bot-wizard', username: 'Math_Wizard 🤖', rating: 1690, rankTier: 'Platinum', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Math_Wizard' },
  { id: 'bot-ninja', username: 'GK_Ninja 🤖', rating: 1420, rankTier: 'Gold', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=GK_Ninja' },
];

export function initMatchmaking(io: Server) {
  // Loop checking queue every 800ms
  setInterval(() => {
    processMatchmakingQueue(io);
  }, 800);
}

export function addToQueue(io: Server, socket: Socket, data: { userId: string; examId?: string; subjectId?: string; forceBot?: boolean }) {
  removeFromQueue(socket.id);

  const profile = getUserFullProfile(data.userId);
  if (!profile) return;

  const entry: QueueEntry = {
    userId: data.userId,
    socketId: socket.id,
    username: profile.username,
    rating: profile.stats.rating,
    examId: data.examId,
    subjectId: data.subjectId,
    joinedAt: Date.now()
  };

  matchmakingQueue.push(entry);
  socket.emit('queue_joined', { message: 'Searching for an opponent in the arena...' });

  // If forceBot requested or immediate fallback
  if (data.forceBot) {
    matchWithBot(io, entry);
    return;
  }

  processMatchmakingQueue(io);
}

export function removeFromQueue(socketId: string) {
  const idx = matchmakingQueue.findIndex(q => q.socketId === socketId);
  if (idx !== -1) {
    matchmakingQueue.splice(idx, 1);
  }
}

function processMatchmakingQueue(io: Server) {
  if (matchmakingQueue.length === 0) return;

  const now = Date.now();

  // 1. Try pairing two human players
  for (let i = 0; i < matchmakingQueue.length; i++) {
    const p1 = matchmakingQueue[i];

    for (let j = i + 1; j < matchmakingQueue.length; j++) {
      const p2 = matchmakingQueue[j];

      const examMatch = !p1.examId || !p2.examId || p1.examId === p2.examId;
      const subMatch = !p1.subjectId || !p2.subjectId || p1.subjectId === p2.subjectId;

      if (examMatch && subMatch) {
        matchmakingQueue.splice(j, 1);
        matchmakingQueue.splice(i, 1);

        startBattleWithPlayers(
          io,
          [
            { userId: p1.userId, socketId: p1.socketId },
            { userId: p2.userId, socketId: p2.socketId }
          ],
          { mode: 'quick', examId: p1.examId || p2.examId, subjectId: p1.subjectId || p2.subjectId }
        );
        return;
      }
    }

    // 2. Fallback to AI Aspirant Bot if queued > 3 seconds so the player never waits!
    if (now - p1.joinedAt >= 3000) {
      matchmakingQueue.splice(i, 1);
      matchWithBot(io, p1);
      return;
    }
  }
}

function matchWithBot(io: Server, p1: QueueEntry) {
  // Pick a bot closest to player rating or random
  const sortedBots = [...BOT_ASPIRANTS].sort((a, b) => Math.abs(a.rating - p1.rating) - Math.abs(b.rating - p1.rating));
  const bot = sortedBots[Math.floor(Math.random() * Math.min(3, sortedBots.length))];

  startBattleWithPlayers(
    io,
    [
      { userId: p1.userId, socketId: p1.socketId },
      {
        userId: bot.id,
        socketId: '',
        isBot: true,
        customProfile: {
          username: bot.username,
          avatar: bot.avatar,
          stats: { rating: bot.rating, rank_tier: bot.rankTier }
        }
      }
    ],
    { mode: 'quick', examId: p1.examId, subjectId: p1.subjectId }
  );
}

// ---------------- FRIEND ROOMS (2 to 6+ PLAYERS) ----------------

export function createFriendRoom(
  socket: Socket,
  data: { userId: string; examId?: string; subjectId?: string; maxPlayers?: number }
): FriendRoom {
  const profile = getUserFullProfile(data.userId);

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let roomCode = '';
  for (let i = 0; i < 6; i++) {
    roomCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const room: FriendRoom = {
    roomCode,
    hostUserId: data.userId,
    maxPlayers: Math.max(2, Math.min(6, data.maxPlayers || 4)),
    members: [
      {
        userId: data.userId,
        username: profile?.username || 'Host',
        avatar: profile?.avatar || '',
        rating: profile?.stats.rating || 1200,
        rankTier: profile?.stats.rank_tier || 'Silver',
        socketId: socket.id,
        isReady: true,
        isHost: true
      }
    ],
    examId: data.examId,
    subjectId: data.subjectId,
    createdAt: Date.now()
  };

  friendRooms.set(roomCode, room);
  socket.join(`room-${roomCode}`);

  socket.emit('friend_room_created', {
    roomCode,
    maxPlayers: room.maxPlayers,
    members: room.members,
    examId: data.examId,
    subjectId: data.subjectId
  });

  return room;
}

export function joinFriendRoom(
  io: Server,
  socket: Socket,
  data: { roomCode: string; userId: string }
) {
  const code = data.roomCode.toUpperCase().trim();
  const room = friendRooms.get(code);

  if (!room) {
    socket.emit('friend_room_error', { message: 'Invalid or expired room code: ' + code });
    return;
  }

  if (room.members.length >= room.maxPlayers && !room.members.some(m => m.userId === data.userId)) {
    socket.emit('friend_room_error', { message: `Room is full (${room.maxPlayers} players maximum)` });
    return;
  }

  const existingMember = room.members.find(m => m.userId === data.userId);
  if (existingMember) {
    existingMember.socketId = socket.id;
  } else {
    const profile = getUserFullProfile(data.userId);
    room.members.push({
      userId: data.userId,
      username: profile?.username || 'Aspirant',
      avatar: profile?.avatar || '',
      rating: profile?.stats.rating || 1200,
      rankTier: profile?.stats.rank_tier || 'Silver',
      socketId: socket.id,
      isReady: false,
      isHost: false
    });
  }

  socket.join(`room-${room.roomCode}`);

  io.to(`room-${room.roomCode}`).emit('friend_room_updated', {
    roomCode: room.roomCode,
    maxPlayers: room.maxPlayers,
    members: room.members,
    examId: room.examId,
    subjectId: room.subjectId
  });
}

export function addBotToFriendRoom(
  io: Server,
  socket: Socket,
  data: { roomCode: string }
) {
  const room = friendRooms.get(data.roomCode);
  if (!room) return;
  if (room.members.length >= room.maxPlayers) return;

  const availableBots = BOT_ASPIRANTS.filter(b => !room.members.some(m => m.userId === b.id));
  const bot = availableBots[0] || BOT_ASPIRANTS[0];

  room.members.push({
    userId: bot.id,
    username: bot.username,
    avatar: bot.avatar,
    rating: bot.rating,
    rankTier: bot.rankTier,
    socketId: '',
    isReady: true,
    isHost: false,
    isBot: true
  });

  io.to(`room-${room.roomCode}`).emit('friend_room_updated', {
    roomCode: room.roomCode,
    maxPlayers: room.maxPlayers,
    members: room.members,
    examId: room.examId,
    subjectId: room.subjectId
  });
}

export function toggleFriendReady(
  io: Server,
  socket: Socket,
  data: { roomCode: string; isReady: boolean }
) {
  const room = friendRooms.get(data.roomCode);
  if (!room) return;

  const member = room.members.find(m => m.socketId === socket.id);
  if (member) {
    member.isReady = data.isReady;
  }

  io.to(`room-${room.roomCode}`).emit('friend_room_updated', {
    roomCode: room.roomCode,
    maxPlayers: room.maxPlayers,
    members: room.members,
    examId: room.examId,
    subjectId: room.subjectId
  });

  // Check if at least 2 players and ALL joined members are ready!
  const readyCount = room.members.filter(m => m.isReady).length;
  if (room.members.length >= 2 && readyCount === room.members.length) {
    friendRooms.delete(room.roomCode);

    const playerConfigs = room.members.map(m => ({
      userId: m.userId,
      socketId: m.socketId,
      isBot: m.isBot,
      customProfile: {
        username: m.username,
        avatar: m.avatar,
        stats: { rating: m.rating, rank_tier: m.rankTier }
      }
    }));

    startBattleWithPlayers(
      io,
      playerConfigs,
      { mode: 'friend', examId: room.examId, subjectId: room.subjectId, roomCode: room.roomCode }
    );
  }
}

export function handleRematchRequest(
  io: Server,
  socket: Socket,
  battleId: string
) {
  // Rematch restart with same players
  const battle = activeBattles.get(battleId);
  if (!battle) return;

  const player = battle.players.find((p: PlayerSession) => p.socketId === socket.id);
  if (player) player.readyForRematch = true;

  // Bots always auto-ready for rematch
  battle.players.forEach((p: PlayerSession) => {
    if (p.isBot) p.readyForRematch = true;
  });

  io.to(battleId).emit('rematch_status', {
    readyCount: battle.players.filter((p: PlayerSession) => p.readyForRematch).length,
    totalCount: battle.players.length
  });

  if (battle.players.every((p: PlayerSession) => p.readyForRematch)) {
    const playerConfigs = battle.players.map((p: PlayerSession) => ({
      userId: p.userId,
      socketId: p.socketId,
      isBot: p.isBot,
      customProfile: {
        username: p.username,
        avatar: p.avatar,
        stats: { rating: p.rating, rank_tier: p.rankTier }
      }
    }));

    startBattleWithPlayers(
      io,
      playerConfigs,
      { mode: battle.mode, examId: battle.examId, subjectId: battle.subjectId }
    );
  }
}
