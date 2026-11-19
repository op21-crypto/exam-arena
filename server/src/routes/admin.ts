import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { activeBattles, userToBattle } from '../services/battleEngine.js';

const router = Router();

// 1. Platform analytics
router.get('/analytics', (req: Request, res: Response) => {
  try {
    const totalUsers = db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users')?.count || 0;
    const totalBattles = db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM battles')?.count || 0;
    const totalQuestions = db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM questions')?.count || 0;
    const totalReports = db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM question_reports WHERE status = "pending"')?.count || 0;
    const avgRating = db.queryOne<{ avg: number }>('SELECT ROUND(AVG(rating), 0) as avg FROM user_stats')?.avg || 1200;

    const rankDistribution = db.query(`
      SELECT rank_tier, COUNT(*) as count
      FROM user_stats
      GROUP BY rank_tier
      ORDER BY count DESC
    `);

    const battlesByMode = db.query(`
      SELECT mode, COUNT(*) as count
      FROM battles
      GROUP BY mode
    `);

    return res.json({
      analytics: {
        totalUsers,
        totalBattles,
        totalQuestions,
        totalPendingReports: totalReports,
        avgRating,
        activeBattlesNow: activeBattles.size,
        rankDistribution,
        battlesByMode
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. List questions with filtering & search
router.get('/questions', (req: Request, res: Response) => {
  try {
    const { search, examId, subjectId, difficulty, page = 1, limit = 50 } = req.query;
    let query = 'SELECT q.*, e.name as exam_name, s.name as subject_name FROM questions q LEFT JOIN exams e ON q.exam_id = e.id LEFT JOIN subjects s ON q.subject_id = s.id WHERE 1=1';
    const params: any[] = [];

    if (search) {
      query += ' AND (q.question_en LIKE ? OR q.question_hi LIKE ? OR q.pyq_source LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (examId && examId !== 'all') {
      query += ' AND q.exam_id = ?';
      params.push(examId);
    }
    if (subjectId && subjectId !== 'all') {
      query += ' AND q.subject_id = ?';
      params.push(subjectId);
    }
    if (difficulty && difficulty !== 'all') {
      query += ' AND q.difficulty = ?';
      params.push(difficulty);
    }

    query += ' ORDER BY q.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), (Number(page) - 1) * Number(limit));

    const questions = db.query(query, params);
    const total = db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM questions')?.count || 0;

    return res.json({ questions, total, page: Number(page), limit: Number(limit) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Add single question
router.post('/questions', (req: Request, res: Response) => {
  try {
    const {
      exam_id, subject_id, topic_id, difficulty,
      question_en, question_hi,
      option_a_en, option_a_hi,
      option_b_en, option_b_hi,
      option_c_en, option_c_hi,
      option_d_en, option_d_hi,
      correct_option,
      explanation_en, explanation_hi,
      pyq_source
    } = req.body;

    if (!question_en || !question_hi || correct_option === undefined) {
      return res.status(400).json({ error: 'Bilingual question text and correct option (0-3) are required' });
    }

    const qId = `q-${Date.now()}-${uuidv4().substring(0, 4)}`;

    db.run(`
      INSERT INTO questions (
        id, exam_id, subject_id, topic_id, difficulty,
        question_en, question_hi,
        option_a_en, option_a_hi,
        option_b_en, option_b_hi,
        option_c_en, option_c_hi,
        option_d_en, option_d_hi,
        correct_option,
        explanation_en, explanation_hi,
        pyq_source, is_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [
      qId, exam_id || 'exam-cgl', subject_id || 'sub-math', topic_id || null, difficulty || 'moderate',
      question_en, question_hi,
      option_a_en, option_a_hi || option_a_en,
      option_b_en, option_b_hi || option_b_en,
      option_c_en, option_c_hi || option_c_en,
      option_d_en, option_d_hi || option_d_en,
      Number(correct_option),
      explanation_en || '', explanation_hi || '',
      pyq_source || 'Verified Source'
    ]);

    const created = db.queryOne('SELECT * FROM questions WHERE id = ?', [qId]);
    return res.json({ success: true, question: created });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Update existing question
router.put('/questions/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      exam_id, subject_id, topic_id, difficulty,
      question_en, question_hi,
      option_a_en, option_a_hi,
      option_b_en, option_b_hi,
      option_c_en, option_c_hi,
      option_d_en, option_d_hi,
      correct_option,
      explanation_en, explanation_hi,
      pyq_source
    } = req.body;

    const existing = db.queryOne('SELECT id FROM questions WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Question not found' });
    }

    db.run(`
      UPDATE questions SET
        exam_id = ?, subject_id = ?, topic_id = ?, difficulty = ?,
        question_en = ?, question_hi = ?,
        option_a_en = ?, option_a_hi = ?,
        option_b_en = ?, option_b_hi = ?,
        option_c_en = ?, option_c_hi = ?,
        option_d_en = ?, option_d_hi = ?,
        correct_option = ?,
        explanation_en = ?, explanation_hi = ?,
        pyq_source = ?
      WHERE id = ?
    `, [
      exam_id || 'exam-cgl', subject_id || 'sub-math', topic_id || null, difficulty || 'moderate',
      question_en, question_hi,
      option_a_en, option_a_hi || option_a_en,
      option_b_en, option_b_hi || option_b_en,
      option_c_en, option_c_hi || option_c_en,
      option_d_en, option_d_hi || option_d_en,
      Number(correct_option),
      explanation_en || '', explanation_hi || '',
      pyq_source || 'Verified Source',
      id
    ]);

    const updated = db.queryOne('SELECT * FROM questions WHERE id = ?', [id]);
    return res.json({ success: true, question: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. Bulk import questions
router.post('/questions/bulk', (req: Request, res: Response) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Array of questions required' });
    }

    let inserted = 0;
    for (const q of questions) {
      if (!q.question_en || !q.question_hi || q.correct_option === undefined) continue;

      const qId = `q-bulk-${Date.now()}-${uuidv4().substring(0, 4)}`;
      db.run(`
        INSERT INTO questions (
          id, exam_id, subject_id, topic_id, difficulty,
          question_en, question_hi,
          option_a_en, option_a_hi,
          option_b_en, option_b_hi,
          option_c_en, option_c_hi,
          option_d_en, option_d_hi,
          correct_option,
          explanation_en, explanation_hi,
          pyq_source, is_verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `, [
        qId, q.exam_id || 'exam-cgl', q.subject_id || 'sub-math', q.topic_id || null, q.difficulty || 'moderate',
        q.question_en, q.question_hi,
        q.option_a_en, q.option_a_hi || q.option_a_en,
        q.option_b_en, q.option_b_hi || q.option_b_en,
        q.option_c_en, q.option_c_hi || q.option_c_en,
        q.option_d_en, q.option_d_hi || q.option_d_en,
        Number(q.correct_option),
        q.explanation_en || '', q.explanation_hi || '',
        q.pyq_source || 'Verified PYQ'
      ]);
      inserted++;
    }

    return res.json({ success: true, count: inserted });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. Delete question
router.delete('/questions/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.run('DELETE FROM questions WHERE id = ?', [id]);
    db.run('DELETE FROM question_reports WHERE question_id = ?', [id]);
    return res.json({ success: true, message: 'Question deleted' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 7. List users for moderation
router.get('/users', (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT u.id, u.username, u.email, u.avatar, u.is_admin, u.is_guest, u.created_at,
             s.rating, s.rank_tier, s.total_battles, s.wins, s.losses, s.xp, s.coins, s.level, s.win_streak
      FROM users u
      LEFT JOIN user_stats s ON u.id = s.user_id
    `;
    const params: any[] = [];
    if (search) {
      sql += ' WHERE u.username LIKE ? OR u.email LIKE ?';
      const s = `%${search}%`;
      params.push(s, s);
    }
    sql += ' ORDER BY u.created_at DESC LIMIT 100';

    const users = db.query(sql, params);
    return res.json({ users });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 8. Update user stats & role
router.put('/users/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { coins, rating, rank_tier, xp, level, is_admin } = req.body;

    const existingUser = db.queryOne('SELECT id FROM users WHERE id = ?', [id]);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (is_admin !== undefined) {
      db.run('UPDATE users SET is_admin = ? WHERE id = ?', [Number(is_admin), id]);
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (coins !== undefined) { updates.push('coins = ?'); params.push(Number(coins)); }
    if (rating !== undefined) { updates.push('rating = ?'); params.push(Number(rating)); }
    if (rank_tier !== undefined) { updates.push('rank_tier = ?'); params.push(rank_tier); }
    if (xp !== undefined) { updates.push('xp = ?'); params.push(Number(xp)); }
    if (level !== undefined) { updates.push('level = ?'); params.push(Number(level)); }

    if (updates.length > 0) {
      params.push(id);
      db.run(`UPDATE user_stats SET ${updates.join(', ')} WHERE user_id = ?`, params);
    }

    const updated = db.queryOne(`
      SELECT u.id, u.username, u.email, u.avatar, u.is_admin,
             s.rating, s.rank_tier, s.coins, s.xp, s.level
      FROM users u
      LEFT JOIN user_stats s ON u.id = s.user_id
      WHERE u.id = ?
    `, [id]);

    return res.json({ success: true, user: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 9. Delete/Ban user
router.delete('/users/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.run('DELETE FROM user_stats WHERE user_id = ?', [id]);
    db.run('DELETE FROM user_missions WHERE user_id = ?', [id]);
    db.run('DELETE FROM user_achievements WHERE user_id = ?', [id]);
    db.run('DELETE FROM question_reports WHERE user_id = ?', [id]);
    db.run('DELETE FROM users WHERE id = ?', [id]);
    return res.json({ success: true, message: 'User banned and removed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 10. Get reported questions
router.get('/reports', (req: Request, res: Response) => {
  try {
    const reports = db.query(`
      SELECT r.*, q.question_en, q.question_hi, q.correct_option, u.username as reporter_username
      FROM question_reports r
      LEFT JOIN questions q ON r.question_id = q.id
      LEFT JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
    `);
    return res.json({ reports });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 11. Update report status (Resolve / Dismiss)
router.put('/reports/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'resolved' | 'dismissed' | 'pending'
    db.run('UPDATE question_reports SET status = ? WHERE id = ?', [status || 'resolved', id]);
    return res.json({ success: true, message: `Report marked as ${status}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 12. Delete report
router.delete('/reports/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.run('DELETE FROM question_reports WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Report dismissed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 13. Battles Monitoring (Live ongoing + Past matches history)
router.get('/battles', (req: Request, res: Response) => {
  try {
    // Collect active battles from memory
    const live: any[] = [];
    for (const [bId, b] of activeBattles.entries()) {
      live.push({
        battleId: bId,
        state: b.state,
        currentQuestionIndex: b.currentQuestionIndex,
        totalQuestions: b.sanitizedQuestions?.length || 10,
        player1: {
          id: b.player1?.userId,
          username: b.player1?.username,
          avatar: b.player1?.avatar,
          score: b.player1?.score || 0,
        },
        player2: {
          id: b.player2?.userId,
          username: b.player2?.username,
          avatar: b.player2?.avatar,
          score: b.player2?.score || 0,
        }
      });
    }

    // Recent past battles from database
    const recent = db.query(`
      SELECT
        b.id, b.mode, b.status, b.created_at, b.completed_at,
        b.player1_id, b.player2_id,
        b.player1_score, b.player2_score,
        b.winner_id,
        u1.username as player1_username, u1.avatar as player1_avatar,
        u2.username as player2_username, u2.avatar as player2_avatar
      FROM battles b
      LEFT JOIN users u1 ON b.player1_id = u1.id
      LEFT JOIN users u2 ON b.player2_id = u2.id
      ORDER BY b.created_at DESC
      LIMIT 30
    `);

    return res.json({ live, recent });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 14. Terminate an ongoing battle
router.post('/battles/:id/terminate', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const battle = activeBattles.get(id);
    if (battle) {
      if (battle.player1?.userId) userToBattle.delete(battle.player1.userId);
      if (battle.player2?.userId) userToBattle.delete(battle.player2.userId);
      activeBattles.delete(id);
    }
    db.run('UPDATE battles SET status = "abandoned" WHERE id = ?', [id]);
    return res.json({ success: true, message: `Battle ${id} terminated` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
