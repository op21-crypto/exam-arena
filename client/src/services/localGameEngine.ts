import { SanitizedQuestion, BattlePlayerInfo, BattleFinishedData, Question, UserProfile, RankTier } from '../types';
import { BUNDLED_QUESTIONS } from '../data/bundledQuestions';
import { updateUserStatsInFirestore } from './firebaseUserService';

export interface LocalBattleOptions {
  examId?: string;
  subjectId?: string;
  user: UserProfile;
  isSpeed?: boolean;
  contestantBots?: BattlePlayerInfo[];
}

export interface LocalGameCallbacks {
  onMatched: (data: {
    battleId: string;
    player1: BattlePlayerInfo;
    player2: BattlePlayerInfo;
    players: BattlePlayerInfo[];
    totalQuestions: number;
  }) => void;
  onCountdown: (data: { count: number; message?: string }) => void;
  onQuestionStart: (data: {
    battleId: string;
    questionIndex: number;
    totalQuestions: number;
    question: SanitizedQuestion;
    timeLimitSeconds: number;
    players: any[];
  }) => void;
  onTimerTick: (data: { remainingSeconds: number }) => void;
  onOpponentStatus: (data: { hasAnswered: boolean; questionIndex: number; playersAnswered?: any[] }) => void;
  onQuestionResolved: (data: any) => void;
  onBattleFinished: (data: BattleFinishedData & { rankedPlayers?: any[] }) => void;
}

export const BOT_ASPIRANTS: BattlePlayerInfo[] = [
  {
    userId: 'bot-arjun-ssc',
    username: 'Topper_Arjun ⚡',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Topper_Arjun',
    rating: 1320,
    rankTier: 'Gold'
  },
  {
    userId: 'bot-priya-cgl',
    username: 'Priya_Sharma ⭐',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Priya_Sharma',
    rating: 1240,
    rankTier: 'Silver'
  },
  {
    userId: 'bot-amit-quant',
    username: 'Amit_MathGuru 📐',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Amit_MathGuru',
    rating: 1290,
    rankTier: 'Gold'
  },
  {
    userId: 'bot-sneha-gk',
    username: 'Sneha_Reddy 🌍',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sneha_Reddy',
    rating: 1210,
    rankTier: 'Silver'
  },
  {
    userId: 'bot-vikram-si',
    username: 'Vikram_SI_Aspirant 🛡️',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Vikram_SI_Aspirant',
    rating: 1410,
    rankTier: 'Platinum'
  },
  {
    userId: 'bot-ananya-bank',
    username: 'Ananya_PO 🏦',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Ananya_PO',
    rating: 1270,
    rankTier: 'Silver'
  }
];

class LocalGameEngine {
  private activeBattleId: string | null = null;
  private questions: Question[] = [];
  private currentQIndex: number = 0;
  private totalQuestions: number = 10;
  private timeLimitSeconds: number = 10;
  private isSpeed: boolean = false;
  private timerInterval: any = null;
  private opponentTimer: any = null;
  private remainingSeconds: number = 10;
  private userPlayer: BattlePlayerInfo | null = null;
  private opponentPlayers: BattlePlayerInfo[] = [];
  private allPlayers: any[] = [];
  private callbacks: LocalGameCallbacks | null = null;
  private playerAnswer: { selectedOption: number; elapsedMs: number } | null = null;
  private botAnswers: Map<string, { selectedOption: number; elapsedMs: number; isCorrect: boolean }> = new Map();
  private userCumulativeScore: number = 0;
  private botCumulativeScores: Map<string, number> = new Map();
  private userAnswersRecord: { isCorrect: boolean; elapsedMs: number; points: number }[] = [];
  private questionStartTime: number = 0;

  public startBattle(options: LocalBattleOptions, callbacks: LocalGameCallbacks) {
    this.stopActiveBattle();

    this.callbacks = callbacks;
    this.activeBattleId = `local_battle_${Date.now()}`;
    this.isSpeed = Boolean(options.isSpeed);
    this.timeLimitSeconds = this.isSpeed ? 6 : 10;
    this.currentQIndex = 0;
    this.userCumulativeScore = 0;
    this.botCumulativeScores.clear();
    this.userAnswersRecord = [];

    // Filter questions based on exam / subject, or shuffle bundled
    let filtered = [...BUNDLED_QUESTIONS];
    if (options.subjectId && options.subjectId !== 'all') {
      const matchSub = filtered.filter(q => q.subject_id === options.subjectId);
      if (matchSub.length >= 5) filtered = matchSub;
    }
    if (options.examId) {
      const matchExam = filtered.filter(q => q.exam_id === options.examId);
      if (matchExam.length >= 5) filtered = matchExam;
    }
    // Shuffle
    filtered.sort(() => Math.random() - 0.5);
    this.questions = filtered.slice(0, 10);
    this.totalQuestions = Math.min(10, this.questions.length);

    // Setup players
    this.userPlayer = {
      userId: options.user.id,
      username: options.user.username,
      avatar: options.user.avatar,
      rating: options.user.stats.rating || 1200,
      rankTier: options.user.stats.rank_tier || 'Silver'
    };

    if (options.contestantBots && options.contestantBots.length > 0) {
      this.opponentPlayers = options.contestantBots;
    } else {
      // Pick random bot matching user rating
      const randomBot = BOT_ASPIRANTS[Math.floor(Math.random() * BOT_ASPIRANTS.length)];
      this.opponentPlayers = [{ ...randomBot }];
    }

    this.allPlayers = [
      { ...this.userPlayer, score: 0, answered: false },
      ...this.opponentPlayers.map(b => ({ ...b, score: 0, answered: false }))
    ];

    for (const b of this.opponentPlayers) {
      this.botCumulativeScores.set(b.userId, 0);
    }

    // 1. Emit Matched Event
    this.callbacks.onMatched({
      battleId: this.activeBattleId,
      player1: this.userPlayer,
      player2: this.opponentPlayers[0],
      players: this.allPlayers,
      totalQuestions: this.totalQuestions
    });

    // 2. Start 3..2..1.. Countdown
    let count = 3;
    this.callbacks.onCountdown({ count, message: 'GET READY!' });

    const countInterval = setInterval(() => {
      count--;
      if (count > 0) {
        this.callbacks?.onCountdown({ count, message: count === 1 ? 'FINAL READY...' : 'COUNTDOWN' });
      } else if (count === 0) {
        this.callbacks?.onCountdown({ count: 0, message: 'BATTLE!' });
      } else {
        clearInterval(countInterval);
        this.startQuestion(0);
      }
    }, 1000);
  }

  private startQuestion(qIndex: number) {
    if (!this.activeBattleId || !this.callbacks || qIndex >= this.totalQuestions) {
      this.finishBattle();
      return;
    }

    this.currentQIndex = qIndex;
    this.playerAnswer = null;
    this.botAnswers.clear();
    this.remainingSeconds = this.timeLimitSeconds;
    this.questionStartTime = Date.now();

    const q = this.questions[qIndex];
    const sanitized: SanitizedQuestion = {
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
      pyq_source: q.pyq_source
    };

    // Reset answered status
    this.allPlayers = this.allPlayers.map(p => ({ ...p, answered: false }));

    this.callbacks.onQuestionStart({
      battleId: this.activeBattleId,
      questionIndex: qIndex,
      totalQuestions: this.totalQuestions,
      question: sanitized,
      timeLimitSeconds: this.timeLimitSeconds,
      players: this.allPlayers
    });

    // Schedule simulated bot answers
    this.scheduleBotAnswers(q);

    // Timer countdown loop
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.remainingSeconds--;
      this.callbacks?.onTimerTick({ remainingSeconds: this.remainingSeconds });

      if (this.remainingSeconds <= 0) {
        clearInterval(this.timerInterval);
        this.resolveQuestion();
      }
    }, 1000);
  }

  private scheduleBotAnswers(question: Question) {
    for (const bot of this.opponentPlayers) {
      // Thinking time: 1.5s to 5.5s (or 1.0s to 3.5s for speed)
      const thinkMs = this.isSpeed
        ? Math.floor(1000 + Math.random() * 2500)
        : Math.floor(1800 + Math.random() * 4200);

      setTimeout(() => {
        if (!this.activeBattleId || this.remainingSeconds <= 0) return;

        // Bot accuracy ~ 75%
        const isCorrect = Math.random() < 0.78;
        const selectedOption = isCorrect
          ? question.correct_option
          : (question.correct_option + 1 + Math.floor(Math.random() * 3)) % 4;

        this.botAnswers.set(bot.userId, {
          selectedOption,
          elapsedMs: thinkMs,
          isCorrect
        });

        // Update answered indicator in allPlayers
        this.allPlayers = this.allPlayers.map(p =>
          p.userId === bot.userId ? { ...p, answered: true } : p
        );

        this.callbacks?.onOpponentStatus({
          hasAnswered: true,
          questionIndex: this.currentQIndex,
          playersAnswered: this.allPlayers.map(p => ({ userId: p.userId, answered: p.answered }))
        });

        // If user already answered, resolve immediately without waiting out the full timer!
        if (this.playerAnswer !== null && this.areAllBotsAnswered()) {
          setTimeout(() => {
            if (this.timerInterval) clearInterval(this.timerInterval);
            this.resolveQuestion();
          }, 400);
        }
      }, thinkMs);
    }
  }

  private areAllBotsAnswered(): boolean {
    for (const b of this.opponentPlayers) {
      if (!this.botAnswers.has(b.userId)) return false;
    }
    return true;
  }

  public submitAnswer(selectedOption: number, elapsedMs: number) {
    if (this.playerAnswer !== null || this.remainingSeconds <= 0) return;

    this.playerAnswer = { selectedOption, elapsedMs };
    this.allPlayers = this.allPlayers.map(p =>
      p.userId === this.userPlayer?.userId ? { ...p, answered: true } : p
    );

    // If all bots answered already, resolve
    if (this.areAllBotsAnswered()) {
      setTimeout(() => {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.resolveQuestion();
      }, 350);
    }
  }

  private resolveQuestion() {
    if (!this.activeBattleId || !this.callbacks) return;
    if (this.timerInterval) clearInterval(this.timerInterval);

    const q = this.questions[this.currentQIndex];

    // User calculation
    const userSelected = this.playerAnswer ? this.playerAnswer.selectedOption : null;
    const isUserCorrect = userSelected === q.correct_option;
    let userSpeedBonus = 0;
    if (isUserCorrect && this.playerAnswer) {
      const ms = this.playerAnswer.elapsedMs;
      if (ms <= 2000) userSpeedBonus = 50;
      else if (ms <= 4000) userSpeedBonus = 35;
      else if (ms <= 6000) userSpeedBonus = 20;
      else if (ms <= 8000) userSpeedBonus = 10;
    }
    const userPointsAwarded = isUserCorrect ? 100 + userSpeedBonus : 0;
    this.userCumulativeScore += userPointsAwarded;

    this.userAnswersRecord.push({
      isCorrect: isUserCorrect,
      elapsedMs: this.playerAnswer ? this.playerAnswer.elapsedMs : (this.timeLimitSeconds * 1000),
      points: userPointsAwarded
    });

    // Bots calculation
    for (const bot of this.opponentPlayers) {
      const bAns = this.botAnswers.get(bot.userId);
      let botPoints = 0;
      if (bAns && bAns.isCorrect) {
        let bSpeed = 0;
        if (bAns.elapsedMs <= 2000) bSpeed = 50;
        else if (bAns.elapsedMs <= 4000) bSpeed = 35;
        else if (bAns.elapsedMs <= 6000) bSpeed = 20;
        else if (bAns.elapsedMs <= 8000) bSpeed = 10;
        botPoints = 100 + bSpeed;
      }
      const curScore = this.botCumulativeScores.get(bot.userId) || 0;
      this.botCumulativeScores.set(bot.userId, curScore + botPoints);
    }

    // Update roster scores
    this.allPlayers = this.allPlayers.map(p => {
      if (p.userId === this.userPlayer?.userId) {
        return { ...p, score: this.userCumulativeScore, answered: true };
      }
      return { ...p, score: this.botCumulativeScores.get(p.userId) || 0, answered: true };
    });

    const primaryOpponent = this.opponentPlayers[0];
    const opponentAns = primaryOpponent ? this.botAnswers.get(primaryOpponent.userId) : null;

    this.callbacks.onQuestionResolved({
      questionIndex: this.currentQIndex,
      correctOption: q.correct_option,
      explanation_en: q.explanation_en,
      explanation_hi: q.explanation_hi,
      yourChoice: userSelected,
      isCorrect: isUserCorrect,
      pointsAwarded: userPointsAwarded,
      yourScore: this.userCumulativeScore,
      opponentChoice: opponentAns ? opponentAns.selectedOption : null,
      opponentScore: this.botCumulativeScores.get(primaryOpponent?.userId || '') || 0,
      allPlayers: this.allPlayers
    });

    // Advance to next question after 2.5 seconds
    setTimeout(() => {
      if (!this.activeBattleId) return;
      this.startQuestion(this.currentQIndex + 1);
    }, 2500);
  }

  private finishBattle() {
    if (!this.activeBattleId || !this.callbacks || !this.userPlayer) return;

    const totalQ = this.totalQuestions;
    const correctCount = this.userAnswersRecord.filter(a => a.isCorrect).length;
    const accuracy = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
    const avgResponseTime = this.userAnswersRecord.length > 0
      ? Number((this.userAnswersRecord.reduce((acc, a) => acc + a.elapsedMs, 0) / this.userAnswersRecord.length / 1000).toFixed(1))
      : 5.0;

    // Rank all players
    const rankedPlayers = [...this.allPlayers].sort((a, b) => b.score - a.score);
    const myRankIdx = rankedPlayers.findIndex(p => p.userId === this.userPlayer?.userId);
    const won = myRankIdx === 0;

    const ratingDelta = won ? 24 : -16;
    const earnedXp = won ? 150 : 50;
    const earnedCoins = won ? 35 : 10;

    const rankedWithStats = rankedPlayers.map(p => {
      const isMe = p.userId === this.userPlayer?.userId;
      return {
        ...p,
        correctCount: isMe ? correctCount : Math.floor(p.score / 120),
        accuracy: isMe ? accuracy : Math.min(100, Math.round((p.score / (totalQ * 120)) * 100)),
        avgTime: isMe ? avgResponseTime : 3.8,
        ratingChange: isMe ? ratingDelta : (p.userId === rankedPlayers[0].userId ? 24 : -16),
        earnedXp: isMe ? earnedXp : 80,
        earnedCoins: isMe ? earnedCoins : 15,
        weakTopics: isMe && correctCount < totalQ ? [{ topic: 'Percentage & Profit', accuracy: 50 }] : []
      };
    });

    const primaryOpponent = rankedWithStats.find(p => p.userId !== this.userPlayer?.userId) || rankedWithStats[1];

    const resultPayload: BattleFinishedData & { rankedPlayers?: any[] } = {
      battleId: this.activeBattleId,
      winnerId: (won ? this.userPlayer?.userId : primaryOpponent?.userId) || null,
      player1: rankedWithStats.find(p => p.userId === this.userPlayer?.userId) || rankedWithStats[0],
      player2: primaryOpponent,
      questions: this.questions as any,
      rankedPlayers: rankedWithStats
    };

    // Update Local Storage & Firestore User Profile
    this.persistLocalProfileUpdate(ratingDelta, won, earnedXp, earnedCoins, totalQ, correctCount);

    this.callbacks.onBattleFinished(resultPayload);
  }

  private persistLocalProfileUpdate(
    ratingDelta: number,
    won: boolean,
    earnedXp: number,
    earnedCoins: number,
    totalQ: number,
    correctQ: number
  ) {
    try {
      const localStr = localStorage.getItem('exam_arena_local_user');
      if (!localStr) return;
      const u: UserProfile = JSON.parse(localStr);
      if (!u.stats) return;

      const newRating = Math.max(100, (u.stats.rating || 1200) + ratingDelta);
      let rankTier: RankTier = 'Bronze';
      if (newRating >= 2400) rankTier = 'Grandmaster';
      else if (newRating >= 2000) rankTier = 'Master';
      else if (newRating >= 1800) rankTier = 'Diamond';
      else if (newRating >= 1600) rankTier = 'Platinum';
      else if (newRating >= 1400) rankTier = 'Gold';
      else if (newRating >= 1200) rankTier = 'Silver';

      const newTotalBattles = (u.stats.total_battles || 0) + 1;
      const newWins = (u.stats.wins || 0) + (won ? 1 : 0);
      const newLosses = (u.stats.losses || 0) + (won ? 0 : 1);
      const newWinStreak = won ? (u.stats.win_streak || 0) + 1 : 0;
      const newBestStreak = Math.max(u.stats.best_streak || 0, newWinStreak);
      const newTotalQuestions = (u.stats.total_questions || 0) + totalQ;
      const newCorrectQuestions = (u.stats.correct_questions || 0) + correctQ;
      const newXp = (u.stats.xp || 0) + earnedXp;
      const newLevel = Math.floor(newXp / 1000) + 1;
      const newCoins = (u.stats.coins || 100) + earnedCoins;
      const newAccuracy = newTotalQuestions > 0 ? Number(((newCorrectQuestions / newTotalQuestions) * 100).toFixed(1)) : 0;
      const newWinRate = newTotalBattles > 0 ? Number(((newWins / newTotalBattles) * 100).toFixed(1)) : 0;

      u.stats = {
        ...u.stats,
        rating: newRating,
        rank_tier: rankTier,
        total_battles: newTotalBattles,
        wins: newWins,
        losses: newLosses,
        win_streak: newWinStreak,
        best_streak: newBestStreak,
        total_questions: newTotalQuestions,
        correct_questions: newCorrectQuestions,
        xp: newXp,
        level: newLevel,
        coins: newCoins,
        accuracy: newAccuracy,
        winRate: newWinRate,
        progressPercent: Math.min(100, Math.round(((newXp % 1000) / 1000) * 100))
      };

      localStorage.setItem('exam_arena_local_user', JSON.stringify(u));

      // Asynchronously sync stats to Firestore if user is authenticated
      if (u.id) {
        updateUserStatsInFirestore(u.id, {
          ratingChange: ratingDelta,
          won,
          lost: !won,
          xpEarned: earnedXp,
          coinsEarned: earnedCoins,
          questionsCount: totalQ,
          correctCount: correctQ
        }).catch((err) => console.warn('Background firestore stats sync:', err));
      }
    } catch {
      // ignore
    }
  }

  public stopActiveBattle() {
    this.activeBattleId = null;
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.opponentTimer) clearTimeout(this.opponentTimer);
  }

  // Create friend room helper
  public createFriendRoom(user: UserProfile, examId?: string, subjectId?: string, maxPlayers?: number) {
    const code = 'ARENA-' + Math.floor(1000 + Math.random() * 9000);
    return {
      roomCode: code,
      maxPlayers: maxPlayers || 4,
      members: [
        {
          userId: user.id,
          username: user.username,
          avatar: user.avatar,
          rating: user.stats.rating || 1200,
          rankTier: user.stats.rank_tier || 'Silver',
          isReady: true,
          isHost: true,
          isBot: false
        }
      ],
      examId: examId || 'exam-cgl',
      subjectId: subjectId || 'sub-math'
    };
  }

  public addBotToRoom(room: any) {
    if (!room || !room.members) return room;
    const existingIds = new Set(room.members.map((m: any) => m.userId));
    const available = BOT_ASPIRANTS.filter(b => !existingIds.has(b.userId));
    if (available.length === 0) return room;

    const chosen = available[Math.floor(Math.random() * available.length)];
    const updated = {
      ...room,
      members: [
        ...room.members,
        {
          userId: chosen.userId,
          username: chosen.username,
          avatar: chosen.avatar,
          rating: chosen.rating,
          rankTier: chosen.rankTier,
          isReady: true,
          isHost: false,
          isBot: true
        }
      ]
    };
    return updated;
  }
}

export const localGameEngine = new LocalGameEngine();
