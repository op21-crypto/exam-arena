export type RankTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master' | 'Grandmaster' | 'Legend';

export interface UserStats {
  rating: number;
  rank_tier: RankTier;
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
  accuracy: number;
  winRate: number;
  nextLevelXp: number;
  progressPercent: number;
}

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  avatar: string;
  is_guest: number;
  is_admin: number;
  created_at: string;
  stats: UserStats;
  achievements: Achievement[];
}

export interface Exam {
  id: string;
  name: string;
  slug: string;
  category: string;
  icon: string;
  description: string;
}

export interface Subject {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export interface Topic {
  id: string;
  subject_id: string;
  name: string;
  slug: string;
}

export interface Question {
  id: string;
  exam_id: string;
  subject_id: string;
  topic_id: string;
  difficulty: 'easy' | 'moderate' | 'hard';
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
  correct_option: number; // 0: A, 1: B, 2: C, 3: D
  explanation_en: string;
  explanation_hi: string;
  pyq_source: string;
}

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

export interface DailyMission {
  id: string;
  title_en: string;
  title_hi: string;
  description_en: string;
  description_hi: string;
  action_type: string;
  target_count: number;
  reward_xp: number;
  reward_coins: number;
  current_count: number;
  is_completed: boolean;
  is_claimed: boolean;
  progress_percent: number;
}

export interface Achievement {
  id: string;
  code: string;
  title_en: string;
  title_hi: string;
  description_en: string;
  description_hi: string;
  icon: string;
  reward_xp: number;
  reward_coins: number;
  is_unlocked: number;
  unlocked_at?: string;
}

export interface BattlePlayerInfo {
  userId: string;
  username: string;
  avatar: string;
  rating: number;
  rankTier: string;
  score?: number;
  correctCount?: number;
  incorrectCount?: number;
  accuracy?: number;
  avgResponseTimeMs?: number;
  ratingChange?: number;
  newRating?: number;
  earnedXp?: number;
  earnedCoins?: number;
  outcome?: 'win' | 'loss' | 'draw';
  weakTopics?: { topic: string; accuracy: number }[];
}

export interface BattleFinishedData {
  battleId: string;
  winnerId: string | null;
  player1: BattlePlayerInfo;
  player2: BattlePlayerInfo;
  questions: {
    index: number;
    id: string;
    question_en: string;
    question_hi: string;
    correct_option: number;
    explanation_en: string;
    explanation_hi: string;
    pyq_source: string;
    p1Choice: number | null;
    p1Correct: boolean;
    p2Choice: number | null;
    p2Correct: boolean;
  }[];
}
