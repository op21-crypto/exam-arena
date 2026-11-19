import { db } from '../db/database.js';
import { getRankTier, calculateLevel } from './elo.js';

export interface UserStatsRecord {
  user_id: string;
  rating: number;
  rank_tier: string;
  xp: number;
  level: number;
  coins: number;
  total_battles: number;
  wins: number;
  losses: number;
  draws: number;
  win_streak: number;
  best_streak: number;
  total_questions: number;
  correct_questions: number;
}

export function getUserFullProfile(userId: string) {
  const user = db.queryOne<{
    id: string;
    username: string;
    email: string;
    avatar: string;
    is_guest: number;
    is_admin: number;
    created_at: string;
  }>('SELECT id, username, email, avatar, is_guest, is_admin, created_at FROM users WHERE id = ?', [userId]);

  if (!user) return null;

  let stats = db.queryOne<UserStatsRecord>('SELECT * FROM user_stats WHERE user_id = ?', [userId]);
  if (!stats) {
    db.run(`
      INSERT INTO user_stats (user_id, rating, rank_tier, xp, level, coins, total_battles, wins, losses, draws, win_streak, best_streak, total_questions, correct_questions)
      VALUES (?, 1200, 'Silver', 0, 1, 100, 0, 0, 0, 0, 0, 0, 0, 0)
    `, [userId]);
    stats = db.queryOne<UserStatsRecord>('SELECT * FROM user_stats WHERE user_id = ?', [userId])!;
  }

  const levelInfo = calculateLevel(stats.xp);

  // Unlocked achievements
  const achievements = db.query(`
    SELECT a.*, ua.unlocked_at
    FROM achievements a
    JOIN user_achievements ua ON a.id = ua.achievement_id
    WHERE ua.user_id = ?
    ORDER BY ua.unlocked_at DESC
  `, [userId]);

  return {
    ...user,
    stats: {
      ...stats,
      level: levelInfo.level,
      nextLevelXp: levelInfo.nextLevelXp,
      progressPercent: levelInfo.progressPercent,
      accuracy: stats.total_questions > 0 ? Math.round((stats.correct_questions / stats.total_questions) * 100) : 0,
      winRate: stats.total_battles > 0 ? Math.round((stats.wins / stats.total_battles) * 100) : 0
    },
    achievements
  };
}

export function recordBattleStats(
  userId: string,
  result: 'win' | 'loss' | 'draw',
  ratingDelta: number,
  earnedXp: number,
  earnedCoins: number,
  questionsAttempted: number,
  questionsCorrect: number
) {
  const current = db.queryOne<UserStatsRecord>('SELECT * FROM user_stats WHERE user_id = ?', [userId]);
  if (!current) return;

  const newRating = Math.max(100, current.rating + ratingDelta);
  const newRank = getRankTier(newRating);
  const newXp = current.xp + earnedXp;
  const newLevel = calculateLevel(newXp).level;
  const newCoins = current.coins + earnedCoins;

  const wins = current.wins + (result === 'win' ? 1 : 0);
  const losses = current.losses + (result === 'loss' ? 1 : 0);
  const draws = current.draws + (result === 'draw' ? 1 : 0);
  const totalBattles = current.total_battles + 1;

  let winStreak = current.win_streak;
  if (result === 'win') {
    winStreak += 1;
  } else if (result === 'loss') {
    winStreak = 0;
  }
  const bestStreak = Math.max(current.best_streak, winStreak);

  const totalQuestions = current.total_questions + questionsAttempted;
  const correctQuestions = current.correct_questions + questionsCorrect;

  db.run(`
    UPDATE user_stats
    SET rating = ?, rank_tier = ?, xp = ?, level = ?, coins = ?,
        total_battles = ?, wins = ?, losses = ?, draws = ?,
        win_streak = ?, best_streak = ?,
        total_questions = ?, correct_questions = ?
    WHERE user_id = ?
  `, [
    newRating, newRank, newXp, newLevel, newCoins,
    totalBattles, wins, losses, draws,
    winStreak, bestStreak,
    totalQuestions, correctQuestions,
    userId
  ]);

  // Check achievements
  checkAchievements(userId, {
    totalWins: wins,
    winStreak,
    newRating,
    result,
    accuracy: questionsAttempted > 0 ? (questionsCorrect / questionsAttempted) : 0
  });

  // Check daily missions
  trackDailyMission(userId, 'win_battle', result === 'win' ? 1 : 0);
  trackDailyMission(userId, 'answer_question', questionsAttempted);
  if (winStreak >= 2) {
    trackDailyMission(userId, 'win_streak', 1);
  }
}

export function trackDailyMission(userId: string, actionType: string, count: number = 1) {
  if (count <= 0) return;
  const today = new Date().toISOString().split('T')[0];

  const missions = db.query<{ id: string; target_count: number }>(
    'SELECT id, target_count FROM daily_missions WHERE action_type = ?',
    [actionType]
  );

  for (const m of missions) {
    const existing = db.queryOne<{ id: string; current_count: number; is_claimed: number }>(
      'SELECT id, current_count, is_claimed FROM user_missions WHERE user_id = ? AND mission_id = ? AND date_str = ?',
      [userId, m.id, today]
    );

    if (existing) {
      const updated = existing.current_count + count;
      db.run('UPDATE user_missions SET current_count = ? WHERE id = ?', [updated, existing.id]);
    } else {
      const umId = `um-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      db.run(`
        INSERT INTO user_missions (id, user_id, mission_id, current_count, is_claimed, date_str)
        VALUES (?, ?, ?, ?, 0, ?)
      `, [umId, userId, m.id, count, today]);
    }
  }
}

function checkAchievements(
  userId: string,
  ctx: { totalWins: number; winStreak: number; newRating: number; result: string; accuracy: number }
) {
  const unlock = (code: string) => {
    const ach = db.queryOne<{ id: string; reward_xp: number; reward_coins: number }>(
      'SELECT id, reward_xp, reward_coins FROM achievements WHERE code = ?',
      [code]
    );
    if (!ach) return;

    const alreadyUnlocked = db.queryOne(
      'SELECT id FROM user_achievements WHERE user_id = ? AND achievement_id = ?',
      [userId, ach.id]
    );
    if (!alreadyUnlocked) {
      const uaId = `ua-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      db.run('INSERT INTO user_achievements (id, user_id, achievement_id) VALUES (?, ?, ?)', [uaId, userId, ach.id]);
      // Give rewards
      db.run('UPDATE user_stats SET xp = xp + ?, coins = coins + ? WHERE user_id = ?', [ach.reward_xp, ach.reward_coins, userId]);
    }
  };

  if (ctx.totalWins >= 1) unlock('FIRST_VICTORY');
  if (ctx.totalWins >= 10) unlock('DECATHLON_WINNER');
  if (ctx.winStreak >= 5) unlock('FIVE_STREAK');
  if (ctx.newRating >= 1300) unlock('QUIZ_CHAMPION');
  if (ctx.accuracy === 1) unlock('ACCURACY_MASTER');
}
