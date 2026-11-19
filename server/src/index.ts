import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db/database.js';
import authRoutes from './routes/auth.js';
import questionRoutes from './routes/questions.js';
import leaderboardRoutes from './routes/leaderboards.js';
import gamificationRoutes from './routes/gamification.js';
import adminRoutes from './routes/admin.js';
import {
  initMatchmaking,
  addToQueue,
  removeFromQueue,
  createFriendRoom,
  joinFriendRoom,
  toggleFriendReady,
  handleRematchRequest
} from './services/matchmaker.js';
import {
  handleAnswerSubmission,
  handlePlayerDisconnect,
  userToBattle,
  activeBattles
} from './services/battleEngine.js';

dotenv.config();

const PORT = Number(process.env.PORT) || 4000;
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'EXAM ARENA Real-Time 1v1 Platform',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/admin', adminRoutes);

// Serve static frontend build if present
const clientDistCandidates = [
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), '../client/dist'),
];
const clientDist = clientDistCandidates.find(p => fs.existsSync(p));
if (clientDist) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Socket.IO Real-Time Battle Handling
io.on('connection', (socket: Socket) => {
  console.log(`⚡ Aspirant connected: ${socket.id}`);

  // Reconnection or socket binding
  socket.on('register_socket', (data: { userId: string }) => {
    socket.data.userId = data.userId;
    // Check if player has an active ongoing battle to rejoin
    const ongoingBattleId = userToBattle.get(data.userId);
    if (ongoingBattleId) {
      const battle = activeBattles.get(ongoingBattleId);
      if (battle && battle.state !== 'ended') {
        socket.join(ongoingBattleId);
        if (battle.player1.userId === data.userId) battle.player1.socketId = socket.id;
        if (battle.player2.userId === data.userId) battle.player2.socketId = socket.id;

        socket.emit('battle_reconnected', {
          battleId: ongoingBattleId,
          state: battle.state,
          currentQuestionIndex: battle.currentQuestionIndex,
          totalQuestions: battle.sanitizedQuestions.length,
          question: battle.sanitizedQuestions[battle.currentQuestionIndex],
          player1Score: battle.player1.score,
          player2Score: battle.player2.score
        });
      }
    }
  });

  // Quick Battle Queue
  socket.on('join_queue', (data: { userId: string; examId?: string; subjectId?: string }) => {
    socket.data.userId = data.userId;
    addToQueue(io, socket, data);
  });

  socket.on('leave_queue', () => {
    removeFromQueue(socket.id);
    socket.emit('queue_left', { message: 'Left matchmaking queue' });
  });

  // Friend Rooms
  socket.on('create_friend_room', (data: { userId: string; examId?: string; subjectId?: string }) => {
    socket.data.userId = data.userId;
    createFriendRoom(socket, data);
  });

  socket.on('join_friend_room', (data: { roomCode: string; userId: string }) => {
    socket.data.userId = data.userId;
    joinFriendRoom(io, socket, data);
  });

  socket.on('toggle_friend_ready', (data: { roomCode: string; isReady: boolean }) => {
    toggleFriendReady(io, socket, data);
  });

  socket.on('add_bot_to_room', (data: { roomCode: string }) => {
    import('./services/matchmaker.js').then(m => m.addBotToFriendRoom(io, socket, data));
  });

  // Battle In-Game Answer Submission
  socket.on('submit_answer', (data: { battleId: string; questionIndex: number; selectedOption: number; elapsedMs: number }) => {
    handleAnswerSubmission(io, socket, data.battleId, data);
  });

  // Rematch
  socket.on('request_rematch', (data: { battleId: string }) => {
    handleRematchRequest(io, socket, data.battleId);
  });

  // Disconnection
  socket.on('disconnect', () => {
    console.log(`🔌 Aspirant disconnected: ${socket.id}`);
    removeFromQueue(socket.id);
    handlePlayerDisconnect(io, socket);
  });
});

async function main() {
  await initDatabase();
  initMatchmaking(io);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`⚔️ EXAM ARENA Server running on http://localhost:${PORT}`);
  });
}

main().catch(err => {
  console.error('Fatal Server Boot Error:', err);
});
