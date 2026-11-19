import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';

const router = Router();

// Get daily missions with user progress
router.get('/missions/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const today = new Date().toISOString().split('T')[0];

    const allMissions = db.query<any>('SELECT * FROM daily_missions');

    const result = allMissions.map(m => {
      const userProgress = db.queryOne<{ current_count: number; is_claimed: number }>(
        'SELECT current_count, is_claimed FROM user_missions WHERE user_id = ? AND mission_id = ? AND date_str = ?',
        [userId, m.id, today]
      );

      const count = userProgress ? userProgress.current_count : 0;
      const isClaimed = userProgress ? Boolean(userProgress.is_claimed) : false;
      const isCompleted = count >= m.target_count;

      return {
        ...m,
        current_count: count,
        is_completed: isCompleted,
        is_claimed: isClaimed,
        progress_percent: Math.min(100, Math.round((count / m.target_count) * 100))
      };
    });

    return res.json({ missions: result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Claim daily mission reward
router.post('/missions/claim', (req: Request, res: Response) => {
  try {
    const { userId, missionId } = req.body;
    const today = new Date().toISOString().split('T')[0];

    const mission = db.queryOne<{ id: string; reward_xp: number; reward_coins: number; target_count: number }>(
      'SELECT id, reward_xp, reward_coins, target_count FROM daily_missions WHERE id = ?',
      [missionId]
    );

    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    const progress = db.queryOne<{ id: string; current_count: number; is_claimed: number }>(
      'SELECT id, current_count, is_claimed FROM user_missions WHERE user_id = ? AND mission_id = ? AND date_str = ?',
      [userId, missionId, today]
    );

    if (!progress || progress.current_count < mission.target_count) {
      return res.status(400).json({ error: 'Mission requirements not yet completed' });
    }

    if (progress.is_claimed) {
      return res.status(400).json({ error: 'Mission reward already claimed today' });
    }

    // Mark claimed & award rewards
    db.run('UPDATE user_missions SET is_claimed = 1 WHERE id = ?', [progress.id]);
    db.run(
      'UPDATE user_stats SET xp = xp + ?, coins = coins + ? WHERE user_id = ?',
      [mission.reward_xp, mission.reward_coins, userId]
    );

    return res.json({
      success: true,
      message: 'Reward claimed successfully!',
      reward_xp: mission.reward_xp,
      reward_coins: mission.reward_coins
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get all achievements with user unlocked status
router.get('/achievements/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const achievements = db.query(`
      SELECT
        a.*,
        CASE WHEN ua.id IS NOT NULL THEN 1 ELSE 0 END as is_unlocked,
        ua.unlocked_at
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
      ORDER BY a.reward_xp ASC
    `, [userId]);

    return res.json({ achievements });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
