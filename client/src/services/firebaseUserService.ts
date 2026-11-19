import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { db } from '../firebase/config';
import { UserProfile, UserStats, RankTier } from '../types';

export function calculateDerivedStats(rawStats: any): UserStats {
  const rating = Number(rawStats?.rating ?? 1200);
  const rank_tier = (rawStats?.rankTier || rawStats?.rank_tier || 'Silver') as RankTier;
  const xp = Number(rawStats?.xp ?? 0);
  const level = Number(rawStats?.level ?? 1);
  const coins = Number(rawStats?.coins ?? 100);
  const total_battles = Number(rawStats?.totalBattles ?? rawStats?.total_battles ?? 0);
  const wins = Number(rawStats?.wins ?? 0);
  const losses = Number(rawStats?.losses ?? 0);
  const draws = Number(rawStats?.draws ?? 0);
  const win_streak = Number(rawStats?.winStreak ?? rawStats?.win_streak ?? 0);
  const best_streak = Number(rawStats?.bestStreak ?? rawStats?.best_streak ?? 0);
  const total_questions = Number(rawStats?.totalQuestions ?? rawStats?.total_questions ?? 0);
  const correct_questions = Number(rawStats?.correctQuestions ?? rawStats?.correct_questions ?? 0);

  const accuracy = total_questions > 0 ? Math.round((correct_questions / total_questions) * 100) : 0;
  const winRate = total_battles > 0 ? Math.round((wins / total_battles) * 100) : 0;
  const nextLevelXp = level * 250;
  const progressPercent = Math.min(100, Math.round((xp / nextLevelXp) * 100));

  return {
    rating,
    rank_tier,
    xp,
    level,
    coins,
    total_battles,
    wins,
    losses,
    draws,
    win_streak,
    best_streak,
    total_questions,
    correct_questions,
    accuracy,
    winRate,
    nextLevelXp,
    progressPercent
  };
}

export async function syncUserProfileOnLogin(
  firebaseUser: FirebaseUser,
  customProfile?: { username?: string; avatar?: string }
): Promise<UserProfile> {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const statsRef = doc(db, 'user_stats', firebaseUser.uid);

  const [userSnap, statsSnap] = await Promise.all([
    getDoc(userRef),
    getDoc(statsRef)
  ]);

  let username: string = customProfile?.username?.trim() || '';
  if (!username) {
    if (userSnap.exists() && userSnap.data()?.username) {
      username = userSnap.data().username;
    } else if (firebaseUser.displayName) {
      username = firebaseUser.displayName.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 20);
    } else {
      username = `Aspirant_${firebaseUser.uid.slice(0, 6)}`;
    }
  }

  let avatar: string = customProfile?.avatar || '';
  if (!avatar) {
    if (userSnap.exists() && userSnap.data()?.avatar) {
      avatar = userSnap.data().avatar;
    } else if (firebaseUser.photoURL) {
      avatar = firebaseUser.photoURL;
    } else {
      avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;
    }
  }

  const now = Timestamp.now();

  // Create or Update /users/{userId}
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      id: firebaseUser.uid,
      username,
      email: firebaseUser.email || null,
      avatar,
      isGuest: Boolean(firebaseUser.isAnonymous),
      createdAt: now,
      lastLoginAt: now
    });
  } else {
    await updateDoc(userRef, {
      lastLoginAt: now
    });
  }

  // Create /user_stats/{userId} if not exists
  let rawStatsData: any;
  if (!statsSnap.exists()) {
    rawStatsData = {
      userId: firebaseUser.uid,
      rating: 1200,
      rankTier: 'Silver',
      xp: 0,
      level: 1,
      coins: 100,
      totalBattles: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      winStreak: 0,
      bestStreak: 0,
      totalQuestions: 0,
      correctQuestions: 0,
      updatedAt: now
    };
    await setDoc(statsRef, rawStatsData);
  } else {
    rawStatsData = statsSnap.data();
  }

  const derivedStats = calculateDerivedStats(rawStatsData);

  return {
    id: firebaseUser.uid,
    username,
    email: firebaseUser.email || undefined,
    avatar,
    is_guest: firebaseUser.isAnonymous ? 1 : 0,
    is_admin: 0,
    created_at: new Date().toISOString(),
    stats: derivedStats,
    achievements: []
  };
}

export async function fetchUserFirestoreProfile(userId: string): Promise<UserProfile | null> {
  const userRef = doc(db, 'users', userId);
  const statsRef = doc(db, 'user_stats', userId);

  const [userSnap, statsSnap] = await Promise.all([
    getDoc(userRef),
    getDoc(statsRef)
  ]);

  if (!userSnap.exists()) {
    return null;
  }

  const userData = userSnap.data();
  const rawStats = statsSnap.exists() ? statsSnap.data() : {};
  const stats = calculateDerivedStats(rawStats);

  return {
    id: userId,
    username: userData.username || 'Aspirant',
    email: userData.email || undefined,
    avatar: userData.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
    is_guest: userData.isGuest ? 1 : 0,
    is_admin: 0,
    created_at: userData.createdAt?.toDate ? userData.createdAt.toDate().toISOString() : new Date().toISOString(),
    stats,
    achievements: []
  };
}

export async function updateUserStatsInFirestore(
  userId: string, 
  updates: {
    ratingChange?: number;
    won?: boolean;
    lost?: boolean;
    xpEarned?: number;
    coinsEarned?: number;
    questionsCount?: number;
    correctCount?: number;
  }
): Promise<void> {
  const statsRef = doc(db, 'user_stats', userId);
  const statsSnap = await getDoc(statsRef);
  if (!statsSnap.exists()) return;

  const current = statsSnap.data();
  const currentRating = Number(current.rating ?? 1200);
  const newRating = Math.max(100, Math.min(5000, currentRating + (updates.ratingChange ?? 0)));

  let rankTier: RankTier = 'Bronze';
  if (newRating >= 2400) rankTier = 'Grandmaster';
  else if (newRating >= 2000) rankTier = 'Master';
  else if (newRating >= 1800) rankTier = 'Diamond';
  else if (newRating >= 1600) rankTier = 'Platinum';
  else if (newRating >= 1400) rankTier = 'Gold';
  else if (newRating >= 1200) rankTier = 'Silver';

  const newTotalBattles = Number(current.totalBattles ?? 0) + ((updates.won || updates.lost) ? 1 : 0);
  const newWins = Number(current.wins ?? 0) + (updates.won ? 1 : 0);
  const newLosses = Number(current.losses ?? 0) + (updates.lost ? 1 : 0);
  const newWinStreak = updates.won ? Number(current.winStreak ?? 0) + 1 : (updates.lost ? 0 : Number(current.winStreak ?? 0));
  const newBestStreak = Math.max(Number(current.bestStreak ?? 0), newWinStreak);
  const newXp = Number(current.xp ?? 0) + (updates.xpEarned ?? 0);
  const newCoins = Number(current.coins ?? 0) + (updates.coinsEarned ?? 0);
  const newLevel = Math.max(1, Math.floor(newXp / 500) + 1);
  const newTotalQuestions = Number(current.totalQuestions ?? 0) + (updates.questionsCount ?? 0);
  const newCorrectQuestions = Number(current.correctQuestions ?? 0) + (updates.correctCount ?? 0);

  await updateDoc(statsRef, {
    rating: newRating,
    rankTier,
    totalBattles: newTotalBattles,
    wins: newWins,
    losses: newLosses,
    winStreak: newWinStreak,
    bestStreak: newBestStreak,
    xp: newXp,
    coins: newCoins,
    level: newLevel,
    totalQuestions: newTotalQuestions,
    correctQuestions: newCorrectQuestions,
    updatedAt: serverTimestamp()
  });
}
