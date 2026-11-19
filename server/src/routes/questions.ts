import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { trackDailyMission } from '../services/stats.js';

const router = Router();

// Get list of all exams
router.get('/exams', (req: Request, res: Response) => {
  try {
    const exams = db.query('SELECT * FROM exams ORDER BY name ASC');
    return res.json({ exams });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get list of all subjects
router.get('/subjects', (req: Request, res: Response) => {
  try {
    const subjects = db.query('SELECT * FROM subjects ORDER BY name ASC');
    return res.json({ subjects });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get topics for a subject or all
router.get('/topics', (req: Request, res: Response) => {
  try {
    const { subjectId } = req.query;
    let query = 'SELECT * FROM topics';
    const params: any[] = [];
    if (subjectId) {
      query += ' WHERE subject_id = ?';
      params.push(subjectId);
    }
    query += ' ORDER BY name ASC';
    const topics = db.query(query, params);
    return res.json({ topics });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Practice mode questions
router.get('/practice', (req: Request, res: Response) => {
  try {
    const { examId, subjectId, topicId, difficulty, limit = 10 } = req.query;

    let query = 'SELECT * FROM questions WHERE is_verified = 1';
    const params: any[] = [];

    if (examId) {
      query += ' AND exam_id = ?';
      params.push(examId);
    }
    if (subjectId) {
      query += ' AND subject_id = ?';
      params.push(subjectId);
    }
    if (topicId) {
      query += ' AND topic_id = ?';
      params.push(topicId);
    }
    if (difficulty && difficulty !== 'mixed') {
      query += ' AND difficulty = ?';
      params.push(difficulty);
    }

    query += ' ORDER BY RANDOM() LIMIT ?';
    params.push(Number(limit));

    let questions = db.query(query, params);

    // Fallback if filter yielded 0 questions: return any questions
    if (questions.length === 0) {
      questions = db.query('SELECT * FROM questions WHERE is_verified = 1 ORDER BY RANDOM() LIMIT ?', [Number(limit)]);
    }

    return res.json({ questions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Submit practice mode session
router.post('/practice-submit', (req: Request, res: Response) => {
  try {
    const { userId, totalAnswered, correctCount } = req.body;
    if (userId) {
      // Award XP for practicing: 10 XP per correct, 3 XP per attempt
      const xpEarned = (correctCount * 10) + (totalAnswered * 3);
      const coinsEarned = Math.floor(correctCount * 1.5);

      db.run(`
        UPDATE user_stats
        SET xp = xp + ?, coins = coins + ?,
            total_questions = total_questions + ?, correct_questions = correct_questions + ?
        WHERE user_id = ?
      `, [xpEarned, coinsEarned, totalAnswered, correctCount, userId]);

      trackDailyMission(userId, 'practice_session', 1);
      trackDailyMission(userId, 'answer_question', totalAnswered);

      return res.json({ success: true, xpEarned, coinsEarned });
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Report a question
router.post('/report', (req: Request, res: Response) => {
  try {
    const { questionId, userId, reason } = req.body;
    if (!questionId || !reason) {
      return res.status(400).json({ error: 'Question ID and reason required' });
    }

    const reportId = `rep-${Date.now()}`;
    db.run(
      'INSERT INTO question_reports (id, question_id, user_id, reason, status) VALUES (?, ?, ?, ?, ?)',
      [reportId, questionId, userId || 'anonymous', reason, 'pending']
    );

    return res.json({ success: true, message: 'Question reported for review' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
