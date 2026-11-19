import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { getUserFullProfile } from '../services/stats.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'exam_arena_super_secret_key_2026';

// Guest login / auto-generation
router.post('/guest', (req: Request, res: Response) => {
  try {
    const guestNum = Math.floor(1000 + Math.random() * 9000);
    const guestId = `guest-${uuidv4().substring(0, 8)}`;
    const username = `Aspirant_${guestNum}`;
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;

    db.run(
      'INSERT INTO users (id, username, email, avatar, is_guest, is_admin) VALUES (?, ?, ?, ?, 1, 0)',
      [guestId, username, null, avatar]
    );

    db.run(`
      INSERT INTO user_stats (user_id, rating, rank_tier, xp, level, coins, total_battles, wins, losses, draws, win_streak, best_streak, total_questions, correct_questions)
      VALUES (?, 1200, 'Silver', 0, 1, 100, 0, 0, 0, 0, 0, 0, 0, 0)
    `, [guestId]);

    const token = jwt.sign({ userId: guestId, username, isGuest: true }, JWT_SECRET, { expiresIn: '30d' });
    const profile = getUserFullProfile(guestId);

    return res.json({ token, user: profile });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, avatar } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const existing = db.queryOne('SELECT id FROM users WHERE username = ? OR (email IS NOT NULL AND email = ?)', [username, email || '']);
    if (existing) {
      return res.status(409).json({ error: 'Username or email already registered' });
    }

    const userId = `user-${uuidv4().substring(0, 8)}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const avatarUrl = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;

    db.run(
      'INSERT INTO users (id, username, email, password_hash, avatar, is_guest, is_admin) VALUES (?, ?, ?, ?, ?, 0, 0)',
      [userId, username, email || null, passwordHash, avatarUrl]
    );

    db.run(`
      INSERT INTO user_stats (user_id, rating, rank_tier, xp, level, coins, total_battles, wins, losses, draws, win_streak, best_streak, total_questions, correct_questions)
      VALUES (?, 1200, 'Silver', 0, 1, 150, 0, 0, 0, 0, 0, 0, 0, 0)
    `, [userId]);

    const token = jwt.sign({ userId, username, isGuest: false }, JWT_SECRET, { expiresIn: '30d' });
    const profile = getUserFullProfile(userId);

    return res.json({ token, user: profile });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body; // username or email
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required' });
    }

    const user = db.queryOne<{ id: string; username: string; password_hash: string }>(
      'SELECT id, username, password_hash FROM users WHERE username = ? OR email = ?',
      [identifier, identifier]
    );

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username, isGuest: false }, JWT_SECRET, { expiresIn: '30d' });
    const profile = getUserFullProfile(user.id);

    return res.json({ token, user: profile });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Firebase Sync endpoint (bridges Firebase Auth/Firestore user with local database & sockets)
router.post('/firebase-sync', async (req: Request, res: Response) => {
  try {
    const { firebaseUid, username, email, avatar, isGuest } = req.body;
    if (!firebaseUid) {
      return res.status(400).json({ error: 'firebaseUid is required' });
    }

    const cleanUsername = username 
      ? String(username).replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 30) 
      : `Aspirant_${firebaseUid.substring(0, 6)}`;
    const avatarUrl = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`;

    const isAdmin = (email === 'op21plus@gmail.com') ? 1 : 0;

    // Ensure user exists in local database for matchmaker & socket support
    const existing = db.queryOne<{ id: string; is_admin: number }>('SELECT id, is_admin FROM users WHERE id = ?', [firebaseUid]);
    const finalAdmin = isAdmin || (existing?.is_admin === 1 ? 1 : 0);

    if (!existing) {
      db.run(
        'INSERT OR REPLACE INTO users (id, username, email, avatar, is_guest, is_admin) VALUES (?, ?, ?, ?, ?, ?)',
        [firebaseUid, cleanUsername, email || null, avatarUrl, isGuest ? 1 : 0, finalAdmin]
      );
      db.run(`
        INSERT OR IGNORE INTO user_stats (user_id, rating, rank_tier, xp, level, coins, total_battles, wins, losses, draws, win_streak, best_streak, total_questions, correct_questions)
        VALUES (?, 1200, 'Silver', 0, 1, 100, 0, 0, 0, 0, 0, 0, 0, 0)
      `, [firebaseUid]);
    } else {
      if (email) {
        db.run('UPDATE users SET email = ?, is_admin = ? WHERE id = ?', [email, finalAdmin, firebaseUid]);
      } else if (finalAdmin) {
        db.run('UPDATE users SET is_admin = 1 WHERE id = ?', [firebaseUid]);
      }
    }

    const token = jwt.sign(
      { userId: firebaseUid, username: cleanUsername, isGuest: Boolean(isGuest) }, 
      JWT_SECRET, 
      { expiresIn: '30d' }
    );
    const profile = getUserFullProfile(firebaseUid);

    return res.json({ token, user: profile });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Current user profile
router.get('/me', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const profile = getUserFullProfile(decoded.userId);
    if (!profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: profile });
  } catch (err: any) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Update Profile
router.put('/profile', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const { username, avatar } = req.body;
    if (username) {
      db.run('UPDATE users SET username = ? WHERE id = ?', [username, decoded.userId]);
    }
    if (avatar) {
      db.run('UPDATE users SET avatar = ? WHERE id = ?', [avatar, decoded.userId]);
    }

    const updated = getUserFullProfile(decoded.userId);
    return res.json({ user: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
