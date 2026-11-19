export type RankTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master' | 'Grandmaster' | 'Legend';

export function getRankTier(rating: number): RankTier {
  if (rating < 1100) return 'Bronze';
  if (rating < 1300) return 'Silver';
  if (rating < 1500) return 'Gold';
  if (rating < 1700) return 'Platinum';
  if (rating < 1900) return 'Diamond';
  if (rating < 2100) return 'Master';
  if (rating < 2400) return 'Grandmaster';
  return 'Legend';
}

export function calculateElo(
  ratingA: number,
  ratingB: number,
  scoreA: number, // 1 for win, 0.5 for draw, 0 for loss
  kFactor: number = 32
): { newRatingA: number; newRatingB: number; deltaA: number; deltaB: number } {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;
  const scoreB = 1 - scoreA;

  const deltaA = Math.round(kFactor * (scoreA - expectedA));
  const deltaB = Math.round(kFactor * (scoreB - expectedB));

  // Minimum rating clamp at 100
  const newRatingA = Math.max(100, ratingA + deltaA);
  const newRatingB = Math.max(100, ratingB + deltaB);

  return { newRatingA, newRatingB, deltaA, deltaB };
}

export function calculateLevel(xp: number): { level: number; currentXp: number; nextLevelXp: number; progressPercent: number } {
  // Level N requires N * 250 XP
  const level = Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1);
  const baseLevelXp = Math.pow(level - 1, 2) * 100;
  const nextLevelXp = Math.pow(level, 2) * 100;
  const levelSpan = nextLevelXp - baseLevelXp;
  const currentLevelProgress = Math.max(0, xp - baseLevelXp);
  const progressPercent = Math.min(100, Math.round((currentLevelProgress / (levelSpan || 1)) * 100));

  return { level, currentXp: xp, nextLevelXp, progressPercent };
}
