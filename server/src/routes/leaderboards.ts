import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';

const router = Router();

// Global ranking
router.get('/global', (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 50;

    const leaders = db.query(`
      SELECT
        u.id, u.username, u.avatar,
        s.rating, s.rank_tier, s.level, s.xp, s.coins,
        s.total_battles, s.wins, s.losses, s.win_streak,
        s.total_questions, s.correct_questions,
        CASE WHEN s.total_battles > 0 THEN ROUND((CAST(s.wins AS FLOAT) / s.total_battles) * 100, 1) ELSE 0 END as win_rate
      FROM users u
      JOIN user_stats s ON u.id = s.user_id
      ORDER BY s.rating DESC, s.wins DESC
      LIMIT ?
    `, [limit]);

    return res.json({ leaderboard: leaders });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// User battle history
router.get('/history/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = Number(req.query.limit) || 20;

    const history = db.query(`
      SELECT
        b.id as battle_id, b.mode, b.status, b.created_at, b.completed_at,
        b.player1_id, b.player2_id,
        b.player1_score, b.player2_score,
        b.winner_id,
        b.rating_change_p1, b.rating_change_p2,
        u1.username as player1_username, u1.avatar as player1_avatar,
        u2.username as player2_username, u2.avatar as player2_avatar
      FROM battles b
      JOIN users u1 ON b.player1_id = u1.id
      LEFT JOIN users u2 ON b.player2_id = u2.id
      WHERE b.player1_id = ? OR b.player2_id = ?
      ORDER BY b.created_at DESC
      LIMIT ?
    `, [userId, userId, limit]);

    return res.json({ history });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
