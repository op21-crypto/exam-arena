import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { initDatabase, db } from '../db/database.js';
import {
  SEED_EXAMS,
  SEED_SUBJECTS,
  SEED_TOPICS,
  SEED_QUESTIONS,
  SEED_MISSIONS,
  SEED_ACHIEVEMENTS
} from './questionsData.js';

export async function runSeed() {
  console.log('🚀 Initializing Database & Seeding Data for EXAM ARENA...');
  await initDatabase();

  // 1. Seed Exams
  for (const ex of SEED_EXAMS) {
    const existing = db.queryOne('SELECT id FROM exams WHERE id = ?', [ex.id]);
    if (!existing) {
      db.run(
        'INSERT INTO exams (id, name, slug, category, icon, description) VALUES (?, ?, ?, ?, ?, ?)',
        [ex.id, ex.name, ex.slug, ex.category, ex.icon, ex.description]
      );
    }
  }
  console.log(`✅ Seeded ${SEED_EXAMS.length} Exams.`);

  // 2. Seed Subjects
  for (const sub of SEED_SUBJECTS) {
    const existing = db.queryOne('SELECT id FROM subjects WHERE id = ?', [sub.id]);
    if (!existing) {
      db.run(
        'INSERT INTO subjects (id, name, slug, icon) VALUES (?, ?, ?, ?)',
        [sub.id, sub.name, sub.slug, sub.icon]
      );
    }
  }
  console.log(`✅ Seeded ${SEED_SUBJECTS.length} Subjects.`);

  // 3. Seed Topics
  for (const top of SEED_TOPICS) {
    const existing = db.queryOne('SELECT id FROM topics WHERE id = ?', [top.id]);
    if (!existing) {
      db.run(
        'INSERT INTO topics (id, subject_id, name, slug) VALUES (?, ?, ?, ?)',
        [top.id, top.subject_id, top.name, top.slug]
      );
    }
  }
  console.log(`✅ Seeded ${SEED_TOPICS.length} Topics.`);

  // 4. Seed Questions
  // Map exam slug to exam id, subject slug to subject id, topic slug to topic id
  const examMap: Record<string, string> = {
    'ssc-cgl': 'exam-cgl',
    'ssc-chsl': 'exam-chsl',
    'ssc-cpo': 'exam-cpo',
    'ssc-gd': 'exam-gd',
    'banking': 'exam-banking',
    'railway': 'exam-railway',
    'state-exams': 'exam-state',
  };

  const subjectMap: Record<string, string> = {
    'mathematics': 'sub-math',
    'reasoning': 'sub-reasoning',
    'english': 'sub-english',
    'general-awareness': 'sub-gk',
  };

  const topicMap: Record<string, string> = {
    'percentage': 'top-percentage',
    'profit-loss': 'top-profit-loss',
    'time-work': 'top-time-work',
    'time-speed-distance': 'top-tsd',
    'algebra': 'top-algebra',
    'geometry': 'top-geometry',
    'number-system': 'top-number-system',
    'average': 'top-average',
    'analogy': 'top-analogy',
    'coding-decoding': 'top-coding',
    'series': 'top-series',
    'blood-relations': 'top-blood-relations',
    'direction-sense': 'top-direction',
    'syllogism': 'top-syllogism',
    'vocabulary': 'top-vocab',
    'synonyms-antonyms': 'top-synonyms',
    'error-detection': 'top-error-detection',
    'idioms-phrases': 'top-idioms',
    'one-word-substitution': 'top-ows',
    'polity': 'top-polity',
    'history': 'top-history',
    'geography': 'top-geography',
    'science': 'top-science',
    'economics': 'top-economics',
    'static-gk': 'top-static-gk',
  };

  for (let i = 0; i < SEED_QUESTIONS.length; i++) {
    const q = SEED_QUESTIONS[i];
    const qId = `q-${i + 1}`;
    const examId = examMap[q.exam_slug] || 'exam-cgl';
    const subId = subjectMap[q.subject_slug] || 'sub-math';
    const topId = topicMap[q.topic_slug] || 'top-percentage';

    db.run(`
      INSERT OR REPLACE INTO questions (
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
      qId, examId, subId, topId, q.difficulty,
      q.question_en, q.question_hi,
      q.option_a_en, q.option_a_hi,
      q.option_b_en, q.option_b_hi,
      q.option_c_en, q.option_c_hi,
      q.option_d_en, q.option_d_hi,
      q.correct_option,
      q.explanation_en, q.explanation_hi,
      q.pyq_source
    ]);
  }
  console.log(`✅ Seeded ${SEED_QUESTIONS.length} Questions with full bilingual text & authentic explanations.`);

  // 5. Seed Daily Missions
  for (const m of SEED_MISSIONS) {
    const existing = db.queryOne('SELECT id FROM daily_missions WHERE id = ?', [m.id]);
    if (!existing) {
      db.run(
        'INSERT INTO daily_missions (id, title_en, title_hi, description_en, description_hi, action_type, target_count, reward_xp, reward_coins) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [m.id, m.title_en, m.title_hi, m.description_en, m.description_hi, m.action_type, m.target_count, m.reward_xp, m.reward_coins]
      );
    }
  }
  console.log(`✅ Seeded ${SEED_MISSIONS.length} Daily Missions.`);

  // 6. Seed Achievements
  for (const a of SEED_ACHIEVEMENTS) {
    const existing = db.queryOne('SELECT id FROM achievements WHERE id = ?', [a.id]);
    if (!existing) {
      db.run(
        'INSERT INTO achievements (id, code, title_en, title_hi, description_en, description_hi, icon, reward_xp, reward_coins) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [a.id, a.code, a.title_en, a.title_hi, a.description_en, a.description_hi, a.icon, a.reward_xp, a.reward_coins]
      );
    }
  }
  console.log(`✅ Seeded ${SEED_ACHIEVEMENTS.length} Achievements.`);

  // 7. Seed Demo Users
  const passwordHash = await bcrypt.hash('password123', 8);
  const adminPasswordHash = await bcrypt.hash('admin123', 8);

  const demoUsers = [
    {
      id: 'user-admin',
      username: 'ArenaMaster',
      email: 'admin@examarena.com',
      password: adminPasswordHash,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ArenaMaster',
      is_guest: 0,
      is_admin: 1,
      rating: 2150,
      rank_tier: 'Grandmaster',
      xp: 12450,
      level: 25,
      coins: 4500,
      total_battles: 142,
      wins: 118,
      losses: 20,
      draws: 4,
      win_streak: 8,
      best_streak: 15,
      total_questions: 1420,
      correct_questions: 1285,
    },
    {
      id: 'user-topper',
      username: 'Topper_Arjun',
      email: 'arjun@examarena.com',
      password: passwordHash,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Topper_Arjun',
      is_guest: 0,
      is_admin: 0,
      rating: 1820,
      rank_tier: 'Diamond',
      xp: 8900,
      level: 18,
      coins: 2100,
      total_battles: 95,
      wins: 74,
      losses: 18,
      draws: 3,
      win_streak: 4,
      best_streak: 9,
      total_questions: 950,
      correct_questions: 812,
    },
    {
      id: 'user-priya',
      username: 'Aspirant_Priya',
      email: 'priya@examarena.com',
      password: passwordHash,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Aspirant_Priya',
      is_guest: 0,
      is_admin: 0,
      rating: 1460,
      rank_tier: 'Gold',
      xp: 5200,
      level: 12,
      coins: 1150,
      total_battles: 58,
      wins: 38,
      losses: 18,
      draws: 2,
      win_streak: 2,
      best_streak: 6,
      total_questions: 580,
      correct_questions: 462,
    },
    {
      id: 'user-kavya',
      username: 'Speedy_Kavya',
      email: 'kavya@examarena.com',
      password: passwordHash,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Speedy_Kavya',
      is_guest: 0,
      is_admin: 0,
      rating: 1280,
      rank_tier: 'Silver',
      xp: 3100,
      level: 7,
      coins: 680,
      total_battles: 32,
      wins: 19,
      losses: 12,
      draws: 1,
      win_streak: 1,
      best_streak: 4,
      total_questions: 320,
      correct_questions: 245,
    }
  ];

  for (const u of demoUsers) {
    const existing = db.queryOne('SELECT id FROM users WHERE id = ?', [u.id]);
    if (!existing) {
      db.run(
        'INSERT INTO users (id, username, email, password_hash, avatar, is_guest, is_admin) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [u.id, u.username, u.email, u.password, u.avatar, u.is_guest, u.is_admin]
      );

      db.run(`
        INSERT INTO user_stats (
          user_id, rating, rank_tier, xp, level, coins,
          total_battles, wins, losses, draws, win_streak, best_streak,
          total_questions, correct_questions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        u.id, u.rating, u.rank_tier, u.xp, u.level, u.coins,
        u.total_battles, u.wins, u.losses, u.draws, u.win_streak, u.best_streak,
        u.total_questions, u.correct_questions
      ]);
    }
  }
  console.log(`✅ Seeded ${demoUsers.length} Demo Aspirants & Admin.`);

  db.save();
  console.log('🎉 Database seeding complete!');
}

if (process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  runSeed().catch(console.error);
}
