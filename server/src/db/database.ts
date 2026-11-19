import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'exam_arena.db');

let SQL: SqlJsStatic;
let rawDb: Database;

export interface DBWrapper {
  query<T = any>(sql: string, params?: any[]): T[];
  queryOne<T = any>(sql: string, params?: any[]): T | null;
  run(sql: string, params?: any[]): { changes: number };
  exec(sql: string): void;
  save(): void;
}

export const db: DBWrapper = {
  query<T = any>(sql: string, params: any[] = []): T[] {
    if (!rawDb) throw new Error('Database not initialized');
    const stmt = rawDb.prepare(sql);
    try {
      stmt.bind(params);
      const results: T[] = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject() as unknown as T);
      }
      return results;
    } finally {
      stmt.free();
    }
  },

  queryOne<T = any>(sql: string, params: any[] = []): T | null {
    const list = this.query<T>(sql, params);
    return list.length > 0 ? list[0] : null;
  },

  run(sql: string, params: any[] = []): { changes: number } {
    if (!rawDb) throw new Error('Database not initialized');
    rawDb.run(sql, params);
    this.save();
    return { changes: rawDb.getRowsModified() };
  },

  exec(sql: string): void {
    if (!rawDb) throw new Error('Database not initialized');
    rawDb.exec(sql);
    this.save();
  },

  save(): void {
    if (!rawDb) return;
    try {
      const data = rawDb.export();
      fs.writeFileSync(DB_PATH, Buffer.from(data));
    } catch (err) {
      console.error('Failed to persist database:', err);
    }
  }
};

export async function initDatabase(): Promise<DBWrapper> {
  if (!SQL) {
    SQL = await initSqlJs();
  }

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    rawDb = new SQL.Database(fileBuffer);
  } else {
    rawDb = new SQL.Database();
  }

  // Create table schemas
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT,
      password_hash TEXT,
      avatar TEXT NOT NULL,
      is_guest INTEGER DEFAULT 0,
      is_admin INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_stats (
      user_id TEXT PRIMARY KEY,
      rating INTEGER DEFAULT 1200,
      rank_tier TEXT DEFAULT 'Silver',
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      coins INTEGER DEFAULT 100,
      total_battles INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      draws INTEGER DEFAULT 0,
      win_streak INTEGER DEFAULT 0,
      best_streak INTEGER DEFAULT 0,
      total_questions INTEGER DEFAULT 0,
      correct_questions INTEGER DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      icon TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      icon TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      topic_id TEXT,
      difficulty TEXT CHECK(difficulty IN ('easy', 'moderate', 'hard')) DEFAULT 'moderate',
      question_en TEXT NOT NULL,
      question_hi TEXT NOT NULL,
      option_a_en TEXT NOT NULL,
      option_a_hi TEXT NOT NULL,
      option_b_en TEXT NOT NULL,
      option_b_hi TEXT NOT NULL,
      option_c_en TEXT NOT NULL,
      option_c_hi TEXT NOT NULL,
      option_d_en TEXT NOT NULL,
      option_d_hi TEXT NOT NULL,
      correct_option INTEGER NOT NULL CHECK(correct_option IN (0, 1, 2, 3)),
      explanation_en TEXT NOT NULL,
      explanation_hi TEXT NOT NULL,
      pyq_source TEXT,
      is_verified INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(exam_id) REFERENCES exams(id),
      FOREIGN KEY(subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS battles (
      id TEXT PRIMARY KEY,
      mode TEXT NOT NULL CHECK(mode IN ('quick', 'friend', 'subject', 'practice')),
      room_code TEXT,
      exam_id TEXT,
      subject_id TEXT,
      player1_id TEXT NOT NULL,
      player2_id TEXT,
      player1_score INTEGER DEFAULT 0,
      player2_score INTEGER DEFAULT 0,
      winner_id TEXT,
      status TEXT CHECK(status IN ('waiting', 'in_progress', 'completed', 'abandoned')) DEFAULT 'waiting',
      rating_change_p1 INTEGER DEFAULT 0,
      rating_change_p2 INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY(player1_id) REFERENCES users(id),
      FOREIGN KEY(player2_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS battle_answers (
      id TEXT PRIMARY KEY,
      battle_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      selected_option INTEGER,
      is_correct INTEGER DEFAULT 0,
      response_time_ms INTEGER DEFAULT 0,
      speed_bonus INTEGER DEFAULT 0,
      points_awarded INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(battle_id) REFERENCES battles(id) ON DELETE CASCADE,
      FOREIGN KEY(question_id) REFERENCES questions(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS daily_missions (
      id TEXT PRIMARY KEY,
      title_en TEXT NOT NULL,
      title_hi TEXT NOT NULL,
      description_en TEXT NOT NULL,
      description_hi TEXT NOT NULL,
      action_type TEXT NOT NULL,
      target_count INTEGER NOT NULL,
      reward_xp INTEGER NOT NULL,
      reward_coins INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_missions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      mission_id TEXT NOT NULL,
      current_count INTEGER DEFAULT 0,
      is_claimed INTEGER DEFAULT 0,
      date_str TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(mission_id) REFERENCES daily_missions(id) ON DELETE CASCADE,
      UNIQUE(user_id, mission_id, date_str)
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      title_en TEXT NOT NULL,
      title_hi TEXT NOT NULL,
      description_en TEXT NOT NULL,
      description_hi TEXT NOT NULL,
      icon TEXT NOT NULL,
      reward_xp INTEGER NOT NULL,
      reward_coins INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      achievement_id TEXT NOT NULL,
      unlocked_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
      UNIQUE(user_id, achievement_id)
    );

    CREATE TABLE IF NOT EXISTS question_reports (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(question_id) REFERENCES questions(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_questions_exam_subject ON questions(exam_id, subject_id);
    CREATE INDEX IF NOT EXISTS idx_user_stats_rating ON user_stats(rating DESC);
    CREATE INDEX IF NOT EXISTS idx_user_stats_xp ON user_stats(xp DESC);
    CREATE INDEX IF NOT EXISTS idx_battles_players ON battles(player1_id, player2_id);
    CREATE INDEX IF NOT EXISTS idx_battles_room_code ON battles(room_code);
  `);

  db.save();
  return db;
}
