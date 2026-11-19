import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { calculateElo } from './elo.js';
import { recordBattleStats, getUserFullProfile } from './stats.js';

export interface SanitizedQuestion {
  id: string;
  exam_id: string;
  subject_id: string;
  topic_id: string;
  difficulty: string;
  question_en: string;
  question_hi: string;
  option_a_en: string;
  option_a_hi: string;
  option_b_en: string;
  option_b_hi: string;
  option_c_en: string;
  option_c_hi: string;
  option_d_en: string;
  option_d_hi: string;
  pyq_source: string;
}

export interface PlayerSession {
  userId: string;
  username: string;
  avatar: string;
  rating: number;
  rankTier: string;
  socketId: string;
  score: number;
  answers: {
    questionId: string;
    selectedOption: number | null;
    isCorrect: boolean;
    responseTimeMs: number;
    points: number;
  }[];
  answeredCurrent: boolean;
  readyForRematch: boolean;
  isBot?: boolean;
}

export interface ActiveBattle {
  id: string;
  mode: 'quick' | 'friend' | 'subject' | 'practice';
  examId?: string;
  subjectId?: string;
  players: PlayerSession[];
  // For backwards compatibility in 2-player mode:
  player1: PlayerSession;
  player2: PlayerSession;
  questions: any[];
  sanitizedQuestions: SanitizedQuestion[];
  currentQuestionIndex: number;
  questionStartTime: number;
  timerInterval: NodeJS.Timeout | null;
  botTimeout: NodeJS.Timeout | null;
  state: 'vs' | 'countdown' | 'question' | 'review' | 'ended';
  roomCode?: string;
}

export const activeBattles = new Map<string, ActiveBattle>();
export const userToBattle = new Map<string, string>();

export function calculateSpeedBonus(elapsedMs: number, isCorrect: boolean): number {
  if (!isCorrect) return 0;
  if (elapsedMs <= 2000) return 50;
  if (elapsedMs <= 4000) return 35;
  if (elapsedMs <= 6000) return 20;
  if (elapsedMs <= 8000) return 10;
  return 0;
}

export function startBattleWithPlayers(
  io: Server,
  playerConfigs: { userId: string; socketId: string; isBot?: boolean; customProfile?: any }[],
  options: { mode: 'quick' | 'friend' | 'subject' | 'practice'; examId?: string; subjectId?: string; roomCode?: string }
): ActiveBattle {
  const battleId = `battle-${uuidv4().substring(0, 8)}`;

  // Fetch 10 questions for battle
  let query = 'SELECT * FROM questions WHERE is_verified = 1';
  const params: any[] = [];

  if (options.examId) {
    query += ' AND exam_id = ?';
    params.push(options.examId);
  }
  if (options.subjectId) {
    query += ' AND subject_id = ?';
    params.push(options.subjectId);
  }

  query += ' ORDER BY RANDOM() LIMIT 10';
  let fetchedQuestions = db.query(query, params);

  if (fetchedQuestions.length < 5) {
    fetchedQuestions = db.query('SELECT * FROM questions WHERE is_verified = 1 ORDER BY RANDOM() LIMIT 10');
  }

  const sanitizedQuestions: SanitizedQuestion[] = fetchedQuestions.map(q => ({
    id: q.id,
    exam_id: q.exam_id,
    subject_id: q.subject_id,
    topic_id: q.topic_id,
    difficulty: q.difficulty,
    question_en: q.question_en,
    question_hi: q.question_hi,
    option_a_en: q.option_a_en,
    option_a_hi: q.option_a_hi,
    option_b_en: q.option_b_en,
    option_b_hi: q.option_b_hi,
    option_c_en: q.option_c_en,
    option_c_hi: q.option_c_hi,
    option_d_en: q.option_d_en,
    option_d_hi: q.option_d_hi,
    pyq_source: q.pyq_source,
  }));

  const players: PlayerSession[] = playerConfigs.map(p => {
    const prof = p.customProfile || getUserFullProfile(p.userId);
    return {
      userId: p.userId,
      username: prof?.username || 'Aspirant',
      avatar: prof?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + p.userId,
      rating: prof?.stats?.rating || 1200,
      rankTier: prof?.stats?.rank_tier || 'Silver',
      socketId: p.socketId,
      score: 0,
      answers: [],
      answeredCurrent: false,
      readyForRematch: false,
      isBot: Boolean(p.isBot)
    };
  });

  const battle: ActiveBattle = {
    id: battleId,
    mode: options.mode,
    examId: options.examId,
    subjectId: options.subjectId,
    roomCode: options.roomCode,
    players,
    player1: players[0],
    player2: players[1] || players[0],
    questions: fetchedQuestions,
    sanitizedQuestions,
    currentQuestionIndex: 0,
    questionStartTime: 0,
    timerInterval: null,
    botTimeout: null,
    state: 'vs'
  };

  activeBattles.set(battleId, battle);
  players.forEach(p => {
    userToBattle.set(p.userId, battleId);
    if (!p.isBot && p.socketId) {
      const s = io.sockets.sockets.get(p.socketId);
      if (s) s.join(battleId);
    }
  });

  // DB insertion for battle
  db.run(`
    INSERT INTO battles (id, mode, room_code, exam_id, subject_id, player1_id, player2_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'in_progress')
  `, [battleId, options.mode, options.roomCode || null, options.examId || null, options.subjectId || null, players[0].userId, players[1]?.userId || null]);

  // Broadcast battle matched to all players
  io.to(battleId).emit('battle_matched', {
    battleId,
    players: players.map(p => ({
      userId: p.userId,
      username: p.username,
      avatar: p.avatar,
      rating: p.rating,
      rankTier: p.rankTier,
      isBot: p.isBot
    })),
    player1: {
      userId: battle.player1.userId,
      username: battle.player1.username,
      avatar: battle.player1.avatar,
      rating: battle.player1.rating,
      rankTier: battle.player1.rankTier
    },
    player2: {
      userId: battle.player2.userId,
      username: battle.player2.username,
      avatar: battle.player2.avatar,
      rating: battle.player2.rating,
      rankTier: battle.player2.rankTier
    },
    totalQuestions: battle.sanitizedQuestions.length
  });

  // Countdown
  setTimeout(() => {
    battle.state = 'countdown';
    let count = 3;
    io.to(battleId).emit('battle_countdown', { count });

    const cInterval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        io.to(battleId).emit('battle_countdown', { count });
      } else {
        clearInterval(cInterval);
        io.to(battleId).emit('battle_countdown', { count: 0, message: 'BATTLE!' });
        setTimeout(() => {
          advanceToQuestion(io, battleId, 0);
        }, 1000);
      }
    }, 1000);
  }, 2200);

  return battle;
}

export function advanceToQuestion(io: Server, battleId: string, qIndex: number) {
  const battle = activeBattles.get(battleId);
  if (!battle) return;

  if (qIndex >= battle.sanitizedQuestions.length) {
    finishBattle(io, battleId);
    return;
  }

  battle.currentQuestionIndex = qIndex;
  battle.state = 'question';
  battle.questionStartTime = Date.now();

  // Reset answer states
  battle.players.forEach(p => {
    p.answeredCurrent = false;
  });

  const currentQ = battle.sanitizedQuestions[qIndex];

  io.to(battleId).emit('question_start', {
    battleId,
    questionIndex: qIndex,
    totalQuestions: battle.sanitizedQuestions.length,
    question: currentQ,
    timeLimitSeconds: 10,
    startTime: battle.questionStartTime,
    players: battle.players.map(p => ({
      userId: p.userId,
      username: p.username,
      avatar: p.avatar,
      score: p.score,
      answered: false
    }))
  });

  if (battle.timerInterval) clearInterval(battle.timerInterval);
  if (battle.botTimeout) clearTimeout(battle.botTimeout);

  // Schedule Bot answers if any bots are present
  battle.players.forEach(p => {
    if (p.isBot) {
      // Simulate realistic human answer delay (1.8s - 6.2s)
      const thinkTime = Math.floor(1800 + Math.random() * 4400);
      battle.botTimeout = setTimeout(() => {
        simulateBotAnswer(io, battleId, p.userId);
      }, thinkTime);
    }
  });

  let remainingSeconds = 10;
  battle.timerInterval = setInterval(() => {
    remainingSeconds -= 1;
    io.to(battleId).emit('timer_tick', { remainingSeconds });

    if (remainingSeconds <= 0) {
      if (battle.timerInterval) clearInterval(battle.timerInterval);
      handleQuestionTimeout(io, battleId, qIndex);
    }
  }, 1000);
}

export function simulateBotAnswer(io: Server, battleId: string, botUserId: string) {
  const battle = activeBattles.get(battleId);
  if (!battle || battle.state !== 'question') return;

  const bot = battle.players.find(p => p.userId === botUserId);
  if (!bot || bot.answeredCurrent) return;

  const currentQ = battle.questions[battle.currentQuestionIndex];
  // 78% accuracy probability for competitive feel
  const willAnswerCorrect = Math.random() < 0.78;
  let chosenOption = currentQ.correct_option;
  if (!willAnswerCorrect) {
    const wrongOptions = [0, 1, 2, 3].filter(o => o !== currentQ.correct_option);
    chosenOption = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
  }

  const elapsedMs = Math.min(9500, Math.max(1400, Date.now() - battle.questionStartTime));
  bot.answeredCurrent = true;

  const isCorrect = chosenOption === currentQ.correct_option;
  const speedBonus = calculateSpeedBonus(elapsedMs, isCorrect);
  const basePoints = isCorrect ? 100 : 0;
  const totalPoints = basePoints + speedBonus;
  bot.score += totalPoints;

  bot.answers.push({
    questionId: currentQ.id,
    selectedOption: chosenOption,
    isCorrect,
    responseTimeMs: elapsedMs,
    points: totalPoints
  });

  // Broadcast to other non-bot sockets
  battle.players.forEach(p => {
    if (!p.isBot && p.socketId) {
      io.to(p.socketId).emit('opponent_status', {
        hasAnswered: true,
        questionIndex: battle.currentQuestionIndex,
        userId: botUserId,
        playersAnswered: battle.players.map(pl => ({ userId: pl.userId, answered: pl.answeredCurrent }))
      });
    }
  });

  // Check if all players answered
  if (battle.players.every(p => p.answeredCurrent)) {
    if (battle.timerInterval) clearInterval(battle.timerInterval);
    resolveQuestion(io, battleId);
  }
}

export function handleAnswerSubmission(
  io: Server,
  socket: Socket,
  battleId: string,
  data: { questionIndex: number; selectedOption: number; elapsedMs: number }
) {
  const battle = activeBattles.get(battleId);
  if (!battle || battle.state !== 'question') return;
  if (data.questionIndex !== battle.currentQuestionIndex) return;

  const player = battle.players.find(p => p.socketId === socket.id);
  if (!player || player.answeredCurrent) return;

  player.answeredCurrent = true;

  const currentQ = battle.questions[battle.currentQuestionIndex];
  const trueElapsedMs = Math.min(10000, Math.max(50, Date.now() - battle.questionStartTime));
  const isCorrect = data.selectedOption === currentQ.correct_option;
  const speedBonus = calculateSpeedBonus(trueElapsedMs, isCorrect);
  const basePoints = isCorrect ? 100 : 0;
  const totalPoints = basePoints + speedBonus;

  player.score += totalPoints;

  player.answers.push({
    questionId: currentQ.id,
    selectedOption: data.selectedOption,
    isCorrect,
    responseTimeMs: trueElapsedMs,
    points: totalPoints
  });

  // Confirm to submitting player
  socket.emit('answer_acknowledged', {
    questionIndex: data.questionIndex,
    selectedOption: data.selectedOption
  });

  // Broadcast to other players
  battle.players.forEach(p => {
    if (p.socketId !== socket.id && !p.isBot) {
      io.to(p.socketId).emit('opponent_status', {
        hasAnswered: true,
        questionIndex: data.questionIndex,
        userId: player.userId,
        playersAnswered: battle.players.map(pl => ({ userId: pl.userId, answered: pl.answeredCurrent }))
      });
    }
  });

  // If all players have answered, resolve question immediately
  if (battle.players.every(p => p.answeredCurrent)) {
    if (battle.timerInterval) clearInterval(battle.timerInterval);
    if (battle.botTimeout) clearTimeout(battle.botTimeout);
    resolveQuestion(io, battleId);
  }
}

function handleQuestionTimeout(io: Server, battleId: string, qIndex: number) {
  const battle = activeBattles.get(battleId);
  if (!battle || battle.state !== 'question') return;

  const currentQ = battle.questions[qIndex];

  battle.players.forEach(p => {
    if (!p.answeredCurrent) {
      p.answeredCurrent = true;
      p.answers.push({
        questionId: currentQ.id,
        selectedOption: null,
        isCorrect: false,
        responseTimeMs: 10000,
        points: 0
      });
    }
  });

  resolveQuestion(io, battleId);
}

function resolveQuestion(io: Server, battleId: string) {
  const battle = activeBattles.get(battleId);
  if (!battle) return;

  battle.state = 'review';
  const qIndex = battle.currentQuestionIndex;
  const currentQ = battle.questions[qIndex];

  // Send resolution to each player
  battle.players.forEach(p => {
    if (!p.isBot && p.socketId) {
      const myAns = p.answers[qIndex];
      const otherPlayers = battle.players
        .filter(other => other.userId !== p.userId)
        .map(other => ({
          userId: other.userId,
          username: other.username,
          score: other.score,
          choice: other.answers[qIndex]?.selectedOption,
          isCorrect: other.answers[qIndex]?.isCorrect
        }));

      io.to(p.socketId).emit('question_resolved', {
        questionIndex: qIndex,
        correctOption: currentQ.correct_option,
        explanation_en: currentQ.explanation_en,
        explanation_hi: currentQ.explanation_hi,
        yourChoice: myAns?.selectedOption,
        isCorrect: myAns?.isCorrect,
        pointsAwarded: myAns?.points || 0,
        yourScore: p.score,
        opponentScore: otherPlayers[0]?.score || 0,
        opponentChoice: otherPlayers[0]?.choice,
        allPlayers: battle.players.map(pl => ({
          userId: pl.userId,
          username: pl.username,
          avatar: pl.avatar,
          score: pl.score,
          isCorrect: pl.answers[qIndex]?.isCorrect,
          choice: pl.answers[qIndex]?.selectedOption
        }))
      });
    }
  });

  // DB record answers
  battle.players.forEach(p => {
    if (!p.isBot) {
      const ans = p.answers[qIndex];
      if (ans) {
        const aId = `ans-${uuidv4().substring(0, 8)}`;
        db.run(`
          INSERT INTO battle_answers (id, battle_id, question_id, user_id, selected_option, is_correct, response_time_ms, speed_bonus, points_awarded)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [aId, battleId, currentQ.id, p.userId, ans.selectedOption, ans.isCorrect ? 1 : 0, ans.responseTimeMs, Math.max(0, ans.points - (ans.isCorrect ? 100 : 0)), ans.points]);
      }
    }
  });

  setTimeout(() => {
    advanceToQuestion(io, battleId, qIndex + 1);
  }, 2800);
}

function finishBattle(io: Server, battleId: string) {
  const battle = activeBattles.get(battleId);
  if (!battle) return;

  battle.state = 'ended';

  // Sort players by score descending
  const rankedPlayers = [...battle.players].sort((a, b) => b.score - a.score);
  const winner = rankedPlayers[0];

  rankedPlayers.forEach((p, rankIndex) => {
    if (p.isBot) return;

    const isWinner = rankIndex === 0;
    const isTop3 = rankIndex < 3;
    const outcome: 'win' | 'loss' | 'draw' = isWinner ? 'win' : 'loss';
    const ratingDelta = isWinner ? 24 : isTop3 ? 10 : -14;
    const xp = isWinner ? 150 : isTop3 ? 100 : 50;
    const coins = isWinner ? 30 : isTop3 ? 20 : 10;

    const correctCount = p.answers.filter(a => a.isCorrect).length;
    recordBattleStats(p.userId, outcome, ratingDelta, xp, coins, battle.sanitizedQuestions.length, correctCount);
  });

  // Build summary
  const summaryPlayers = battle.players.map(p => {
    const correctCount = p.answers.filter(a => a.isCorrect).length;
    const avgTime = p.answers.length > 0
      ? Math.round(p.answers.reduce((acc, a) => acc + a.responseTimeMs, 0) / p.answers.length)
      : 0;
    const isWin = p.userId === winner.userId;
    return {
      userId: p.userId,
      username: p.username,
      avatar: p.avatar,
      score: p.score,
      correctCount,
      incorrectCount: battle.sanitizedQuestions.length - correctCount,
      accuracy: Math.round((correctCount / battle.sanitizedQuestions.length) * 100),
      avgResponseTimeMs: avgTime,
      ratingChange: isWin ? 24 : -14,
      newRating: p.rating + (isWin ? 24 : -14),
      earnedXp: isWin ? 150 : 50,
      earnedCoins: isWin ? 30 : 10,
      outcome: isWin ? 'win' : 'loss',
      weakTopics: getWeakTopics(battle.questions, p.answers)
    };
  });

  const battleSummary = {
    battleId,
    winnerId: winner.userId,
    player1: summaryPlayers[0],
    player2: summaryPlayers[1] || summaryPlayers[0],
    rankedPlayers: summaryPlayers.sort((a, b) => b.score - a.score),
    questions: battle.questions.map((q, idx) => ({
      index: idx,
      id: q.id,
      question_en: q.question_en,
      question_hi: q.question_hi,
      correct_option: q.correct_option,
      explanation_en: q.explanation_en,
      explanation_hi: q.explanation_hi,
      pyq_source: q.pyq_source,
      p1Choice: battle.players[0]?.answers[idx]?.selectedOption,
      p1Correct: battle.players[0]?.answers[idx]?.isCorrect,
      p2Choice: battle.players[1]?.answers[idx]?.selectedOption,
      p2Correct: battle.players[1]?.answers[idx]?.isCorrect
    }))
  };

  io.to(battleId).emit('battle_finished', battleSummary);

  setTimeout(() => {
    activeBattles.delete(battleId);
    battle.players.forEach(p => userToBattle.delete(p.userId));
  }, 300000);
}

function getWeakTopics(questions: any[], answers: any[]) {
  const topicStats: Record<string, { total: number; wrong: number }> = {};
  questions.forEach((q, idx) => {
    const topic = q.topic_id || 'General';
    if (!topicStats[topic]) topicStats[topic] = { total: 0, wrong: 0 };
    topicStats[topic].total += 1;
    if (!answers[idx] || !answers[idx].isCorrect) {
      topicStats[topic].wrong += 1;
    }
  });

  return Object.entries(topicStats)
    .filter(([_, stat]) => stat.wrong > 0)
    .map(([topic, stat]) => ({
      topic,
      accuracy: Math.round(((stat.total - stat.wrong) / stat.total) * 100)
    }));
}

export function handlePlayerDisconnect(io: Server, socket: Socket) {
  for (const [battleId, battle] of activeBattles.entries()) {
    if (battle.state === 'ended') continue;

    const disconnectingPlayer = battle.players.find(p => p.socketId === socket.id);
    if (disconnectingPlayer) {
      battle.players.forEach(p => {
        if (p.socketId !== socket.id && !p.isBot) {
          io.to(p.socketId).emit('opponent_disconnected', {
            message: `${disconnectingPlayer.username} disconnected.`
          });
        }
      });
      break;
    }
  }
}
