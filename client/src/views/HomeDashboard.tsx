import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DailyMission } from '../types';
import { BUNDLED_MISSIONS, BUNDLED_LEADERBOARD } from '../data/bundledQuestions';
import { TournamentModal } from '../components/TournamentModal';
import { sound } from '../sound/soundEngine';
import {
  Swords, Users, Zap, Target, BookOpen, Trophy, Flame,
  CheckCircle2, ChevronRight, Award, Shield, Sparkles, Medal, Sliders, Settings2,
  Gift, Coins, X
} from 'lucide-react';

interface HomeDashboardProps {
  onStartQuickBattle: (examId?: string, subjectId?: string, isSpeed?: boolean, customOptions?: any) => void;
  onOpenFriendRoom: () => void;
  onOpenCustomBattle?: () => void;
  onOpenPractice: () => void;
  onNavigateTab: (tab: any) => void;
  isSearching: boolean;
  onCancelSearch: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onStartQuickBattle,
  onOpenFriendRoom,
  onOpenCustomBattle,
  onOpenPractice,
  onNavigateTab,
  isSearching,
  onCancelSearch
}) => {
  const { user, lang, refreshUser } = useAuth();
  const [missions, setMissions] = useState<DailyMission[]>(BUNDLED_MISSIONS);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [showTournament, setShowTournament] = useState<boolean>(false);
  const [chestRewardModal, setChestRewardModal] = useState<{ coins: number; xp: number } | null>(null);
  const [lastChestClaim, setLastChestClaim] = useState<number>(() => {
    const saved = localStorage.getItem('exam_arena_last_chest_claim');
    return saved ? parseInt(saved, 10) : 0;
  });

  const COOLDOWN_MS = 24 * 60 * 60 * 1000;
  const timeSinceClaim = Date.now() - lastChestClaim;
  const canClaimChest = timeSinceClaim >= COOLDOWN_MS;
  const remainingHours = Math.max(0, Math.ceil((COOLDOWN_MS - timeSinceClaim) / (60 * 60 * 1000)));

  const handleClaimChest = () => {
    if (!canClaimChest) return;
    const coinsAwarded = Math.floor(100 + Math.random() * 150);
    const xpAwarded = Math.floor(150 + Math.random() * 150);

    const now = Date.now();
    setLastChestClaim(now);
    localStorage.setItem('exam_arena_last_chest_claim', now.toString());

    // Update local user stats
    const localStr = localStorage.getItem('exam_arena_local_user');
    if (localStr) {
      try {
        const u = JSON.parse(localStr);
        u.stats.coins = (u.stats.coins || 100) + coinsAwarded;
        u.stats.xp = (u.stats.xp || 0) + xpAwarded;
        localStorage.setItem('exam_arena_local_user', JSON.stringify(u));
      } catch {
        // ignore
      }
    }

    sound.playVictory();
    refreshUser();
    setChestRewardModal({ coins: coinsAwarded, xp: xpAwarded });
  };

  const fetchMissions = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/gamification/missions/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.missions && data.missions.length > 0) {
          setMissions(data.missions);
          return;
        }
      }
    } catch {
      // fallback to bundled missions
    }

    // Read local storage missions state
    const saved = localStorage.getItem('exam_arena_local_missions');
    if (saved) {
      try {
        setMissions(JSON.parse(saved));
      } catch {
        setMissions(BUNDLED_MISSIONS);
      }
    } else {
      setMissions(BUNDLED_MISSIONS);
    }
  };

  useEffect(() => {
    fetchMissions();
  }, [user?.id]);

  const handleClaimMission = async (missionId: string) => {
    if (!user) return;
    setClaiming(missionId);
    try {
      const res = await fetch('/api/gamification/missions/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, missionId })
      });
      if (res.ok) {
        await refreshUser();
        await fetchMissions();
        return;
      }
    } catch {
      // local fallback claim
    }

    // Local claim
    const updated = missions.map(m => m.id === missionId ? { ...m, is_claimed: true } : m);
    setMissions(updated);
    localStorage.setItem('exam_arena_local_missions', JSON.stringify(updated));

    // Award local coins and XP
    const mission = missions.find(m => m.id === missionId);
    if (mission && user.stats) {
      const localStr = localStorage.getItem('exam_arena_local_user');
      if (localStr) {
        const u = JSON.parse(localStr);
        u.stats.coins = (u.stats.coins || 100) + mission.reward_coins;
        u.stats.xp = (u.stats.xp || 0) + mission.reward_xp;
        localStorage.setItem('exam_arena_local_user', JSON.stringify(u));
        refreshUser();
      }
    }
    setClaiming(null);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 pb-24 flex flex-col gap-5">
      {/* 1. Quick Battle CTA Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/90 via-purple-950/80 to-slate-950 border border-indigo-500/30 p-5 sm:p-6 shadow-2xl neon-border-blue">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[11px] font-gaming font-bold tracking-wider uppercase">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              {lang === 'hi' ? '1V1 लाइव मुकाबला' : '1V1 COMPETITIVE MULTIPLAYER'}
            </span>

            {/* Streak Badge */}
            {(user?.stats?.win_streak || 0) > 0 && (
              <div className="flex items-center gap-1 text-xs font-gaming font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                <Flame className="w-3.5 h-3.5 fill-amber-400" />
                <span>{user?.stats.win_streak} {lang === 'hi' ? 'जीत का सिलसिला' : 'WIN STREAK'}</span>
              </div>
            )}
          </div>

          <h1 className="font-gaming font-black text-2xl sm:text-3xl text-white tracking-wide">
            {lang === 'hi' ? 'रणभूमि में प्रवेश करें' : 'ENTER THE ARENA'}
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xs leading-relaxed">
            {lang === 'hi'
              ? 'सजीव अभ्यार्थियों के साथ 1v1 मुकाबला। 10 प्रश्न, 10s टाइमर, प्रामाणिक सरकारी परीक्षा PYQ।'
              : 'Real-time 1v1 battle against live aspirants. 10 questions, 10s timer, authentic Gov Exam PYQs.'}
          </p>

          <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {isSearching ? (
              <button
                onClick={onCancelSearch}
                className="flex-1 py-3.5 px-5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-gaming font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-rose-900/40 animate-pulse transition-all"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                <span>{lang === 'hi' ? 'मैचमेकिंग जारी है... (रद्द करें)' : 'Matchmaking in progress... (Cancel)'}</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => onStartQuickBattle()}
                  className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-purple-500 text-white font-gaming font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-indigo-900/50 hover:shadow-cyan-500/30 active:scale-95 transition-all"
                >
                  <Swords className="w-4 h-4" />
                  <span>⚔️ {lang === 'hi' ? 'रैंडम मुकाबला (1V1)' : 'QUICK 1V1'}</span>
                </button>

                <button
                  onClick={onOpenCustomBattle}
                  className="py-3.5 px-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-indigo-500/40 hover:border-indigo-400 text-cyan-300 hover:text-white font-gaming font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                >
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>⚙️ {lang === 'hi' ? 'कस्टम बैटल' : 'CUSTOM BATTLE'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Game Mode Cards Grid */}
      <div>
        <h2 className="font-gaming font-bold text-lg text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          {lang === 'hi' ? 'गेम मोड्स और बैटल अरेना' : 'Game Modes & Battles'}
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {/* Play with Friends */}
          <div
            onClick={onOpenFriendRoom}
            className="group cursor-pointer bg-arena-card hover:bg-slate-800/90 border border-arena-border hover:border-purple-500/50 rounded-2xl p-4 transition-all duration-200 active:scale-98 shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-gaming font-bold text-base text-white">
                {lang === 'hi' ? 'दोस्तों के साथ खेलें' : 'Play with Friends'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                {lang === 'hi' ? 'रूम कोड बनाएं या दोस्तों को व्हाट्सएप पर आमंत्रित करें।' : 'Create or join private room with room code.'}
              </p>
            </div>
            <span className="text-[10px] font-bold text-purple-400 flex items-center gap-1 mt-3">
              {lang === 'hi' ? 'कस्टम रूम →' : 'Custom Room'} <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>

          {/* Custom Battle Rulemaker */}
          <div
            onClick={onOpenCustomBattle}
            className="group cursor-pointer bg-arena-card hover:bg-slate-800/90 border border-arena-border hover:border-amber-500/50 rounded-2xl p-4 transition-all duration-200 active:scale-98 shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="font-gaming font-bold text-base text-white">
                {lang === 'hi' ? 'कस्टम मुकाबला' : 'Custom Battle'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                {lang === 'hi' ? 'प्रश्न, समय व खिलाड़ी संख्या स्वयं चुनें।' : 'Customize question count, timer & contestants.'}
              </p>
            </div>
            <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1 mt-3">
              {lang === 'hi' ? 'नियम बनाएं →' : 'Custom Setup'} <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>

          {/* Subject Battle */}
          <div
            onClick={() => onNavigateTab('battle')}
            className="group cursor-pointer bg-arena-card hover:bg-slate-800/90 border border-arena-border hover:border-cyan-500/50 rounded-2xl p-4 transition-all duration-200 active:scale-98 shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="font-gaming font-bold text-base text-white">
                {lang === 'hi' ? 'विषय अनुसार मुकाबला' : 'Subject Battle'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                {lang === 'hi' ? 'गणित, रीजनिंग, अंग्रेजी या GK विशेष रूप से चुनें।' : 'Pick Math, Reasoning, English, or GK specifically.'}
              </p>
            </div>
            <span className="text-[10px] font-bold text-cyan-400 flex items-center gap-1 mt-3">
              {lang === 'hi' ? 'विषय चुनें →' : 'Choose Subject'} <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>

          {/* Speed Challenge */}
          <div
            onClick={() => onStartQuickBattle(undefined, undefined, true)}
            className="group cursor-pointer bg-arena-card hover:bg-slate-800/90 border border-arena-border hover:border-rose-500/50 rounded-2xl p-4 transition-all duration-200 active:scale-98 shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-gaming font-bold text-base text-white">
                {lang === 'hi' ? 'स्पीड चैलेंज' : 'Speed Challenge'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                {lang === 'hi' ? '6 सेकंड रैपिड मोड! +50 तक स्पीड बोनस प्वाइंट्स।' : '6s rapid timer! Earn up to +50 speed bonus points!'}
              </p>
            </div>
            <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1 mt-3">
              {lang === 'hi' ? 'रैपिड फायर →' : 'Fast Reflexes'} <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>

          {/* Practice Mode */}
          <div
            onClick={onOpenPractice}
            className="group cursor-pointer bg-arena-card hover:bg-slate-800/90 border border-arena-border hover:border-emerald-500/50 rounded-2xl p-4 transition-all duration-200 active:scale-98 shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-gaming font-bold text-base text-white">
                {lang === 'hi' ? 'अभ्यास मोड' : 'Practice Mode'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                {lang === 'hi' ? 'असीमित समय, द्विभाषी प्रश्न और विस्तृत व्याख्या।' : 'Untimed practice with bilingual explanations.'}
              </p>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 mt-3">
              {lang === 'hi' ? 'अभ्यास शुरू करें →' : 'Solo Drill'} <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </div>

        {/* Featured Tournament Card */}
        <div
          onClick={() => setShowTournament(true)}
          className="mt-3 cursor-pointer group rounded-2xl bg-gradient-to-r from-amber-950/70 via-indigo-950/80 to-slate-900 border border-amber-500/40 p-4 shadow-xl hover:border-amber-400 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Trophy className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-gaming font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {lang === 'hi' ? 'मेगा कप' : 'MEGA CUP'}
                </span>
                <span className="text-xs font-gaming text-amber-400 font-bold">10,000 Coins Prize</span>
              </div>
              <h4 className="font-gaming font-bold text-sm text-white mt-0.5">
                {lang === 'hi' ? 'अखिल भारतीय सरकारी परीक्षा चैंपियनशिप' : 'All-India Exam Championship 2026'}
              </h4>
              <p className="text-[11px] text-slate-300">
                {lang === 'hi' ? 'रविवार रात 8:00 बजे · 1,420 अभ्यार्थी पंजीकृत' : 'Sunday 8:00 PM · 1,420 Aspirants Registered'}
              </p>
            </div>
          </div>
          <button className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-gaming font-bold text-xs shrink-0 shadow-md">
            {lang === 'hi' ? 'विवरण' : 'Enter'}
          </button>
        </div>

        {/* Daily Mystery Rewards Chest */}
        <div
          onClick={canClaimChest ? handleClaimChest : undefined}
          className={`mt-3 rounded-2xl border p-4 shadow-xl transition-all flex items-center justify-between ${
            canClaimChest
              ? 'cursor-pointer bg-gradient-to-r from-purple-950/80 via-indigo-950/90 to-slate-900 border-indigo-500/50 hover:border-indigo-400 hover:shadow-indigo-500/20 active:scale-98'
              : 'bg-slate-900/80 border-slate-800 opacity-80'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
              canClaimChest
                ? 'bg-indigo-500/20 border-indigo-400/50 text-indigo-300 animate-bounce'
                : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}>
              <Gift className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-gaming font-extrabold px-2 py-0.5 rounded-full border ${
                  canClaimChest
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {lang === 'hi' ? 'दैनिक खजाना' : 'DAILY CHEST'}
                </span>
                <span className="text-xs font-gaming text-amber-400 font-bold">Free Coins & XP</span>
              </div>
              <h4 className="font-gaming font-bold text-sm text-white mt-0.5">
                {lang === 'hi' ? 'दैनिक मिस्ट्री रिवॉर्ड चेस्ट' : 'Daily Mystery Lucky Chest'}
              </h4>
              <p className="text-[11px] text-slate-300">
                {canClaimChest
                  ? (lang === 'hi' ? '✨ आज का इनाम तैयार है! टैप करके खोलें।' : '✨ Today’s chest is ready! Tap to unlock.')
                  : (lang === 'hi' ? `अगला खजाना: ~${remainingHours} घंटे में` : `Next chest unlocks in ~${remainingHours} hours`)}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (canClaimChest) handleClaimChest();
            }}
            disabled={!canClaimChest}
            className={`px-3.5 py-1.5 rounded-xl font-gaming font-bold text-xs shrink-0 shadow-md transition-all active:scale-95 ${
              canClaimChest
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-indigo-500/30 ring-1 ring-cyan-400/50'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            {canClaimChest ? (lang === 'hi' ? 'खोलें 🎁' : 'Open 🎁') : (lang === 'hi' ? 'प्राप्त ✓' : 'Claimed ✓')}
          </button>
        </div>
      </div>

      {/* 3. Global Leaderboard Preview */}
      <div className="bg-arena-card border border-arena-border rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Medal className="w-4 h-4 text-amber-400" />
            <h3 className="font-gaming font-bold text-base text-white">
              {lang === 'hi' ? 'शीर्ष अभ्यार्थी लीडरबोर्ड' : 'Top Aspirants Ranking'}
            </h3>
          </div>
          <button
            onClick={() => onNavigateTab('leaderboard')}
            className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
          >
            {lang === 'hi' ? 'सभी रैंक देखें' : 'View All'} <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {BUNDLED_LEADERBOARD.slice(0, 3).map((top, idx) => (
            <div
              key={top.id}
              onClick={() => onNavigateTab('leaderboard')}
              className="cursor-pointer bg-slate-900/80 hover:bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center text-center transition-all hover:scale-102"
            >
              <div className="relative mb-1.5">
                <img
                  src={top.avatar}
                  alt={top.username}
                  className="w-10 h-10 rounded-full object-cover border-2 border-amber-400/80 bg-slate-800"
                />
                <span className="absolute -bottom-1 -right-1 text-xs">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                </span>
              </div>
              <span className="font-bold text-xs text-white truncate max-w-[85px]">
                {top.username}
              </span>
              <span className="text-[10px] font-gaming font-bold text-cyan-400">
                {top.rating} Elo
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Daily Missions */}
      <div className="bg-arena-card border border-arena-border rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <h3 className="font-gaming font-bold text-base text-white">
              {lang === 'hi' ? 'दैनिक मिशन' : 'Daily Missions'}
            </h3>
          </div>
          <span className="text-[10px] text-slate-400">
            {lang === 'hi' ? 'प्रतिदिन 00:00 बजे रीसेट' : 'Resets daily at 00:00'}
          </span>
        </div>

        <div className="space-y-2.5">
          {missions.map((m) => (
            <div
              key={m.id}
              className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3"
            >
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-white">
                    {lang === 'hi' ? m.title_hi : m.title_en}
                  </span>
                  <span className="text-[11px] text-slate-400 font-gaming">
                    {m.current_count} / {m.target_count}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${m.progress_percent}%` }}
                  />
                </div>

                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                  <span className="text-indigo-400 font-semibold">+{m.reward_xp} XP</span>
                  <span>·</span>
                  <span className="text-amber-400 font-semibold">+{m.reward_coins} Coins</span>
                </div>
              </div>

              <div>
                {m.is_claimed ? (
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-lg">
                    {lang === 'hi' ? 'प्राप्त ✓' : 'Claimed ✓'}
                  </span>
                ) : m.is_completed ? (
                  <button
                    onClick={() => handleClaimMission(m.id)}
                    disabled={claiming === m.id}
                    className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-gaming font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-transform"
                  >
                    {claiming === m.id ? (lang === 'hi' ? 'प्राप्त हो रहा है...' : 'Claiming...') : (lang === 'hi' ? 'रिवॉर्ड लें' : 'Claim')}
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-500 font-medium">
                    {lang === 'hi' ? 'प्रगति पर' : 'In Progress'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showTournament && (
        <TournamentModal onClose={() => setShowTournament(false)} lang={lang} />
      )}

      {/* Daily Mystery Chest Unlocked Celebration Modal */}
      {chestRewardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-arena-surface border border-indigo-500/50 rounded-3xl p-6 shadow-2xl relative flex flex-col items-center text-center">
            <button
              onClick={() => setChestRewardModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border-2 border-indigo-400/60 flex items-center justify-center text-indigo-300 shadow-xl mb-3 animate-bounce">
              <Gift className="w-8 h-8 text-indigo-400" />
            </div>

            <h3 className="font-gaming font-black text-2xl text-white">
              {lang === 'hi' ? 'दैनिक खजाना खुला!' : 'Daily Chest Unlocked!'}
            </h3>
            <p className="text-xs text-slate-300 mt-1 mb-4 leading-relaxed">
              {lang === 'hi' ? 'बधाई! आपने आज का दैनिक मिस्ट्री खजाना प्राप्त कर लिया है।' : 'Congratulations! You unlocked today’s mystery lucky rewards.'}
            </p>

            <div className="grid grid-cols-2 gap-3 w-full mb-5">
              <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-3 flex flex-col items-center">
                <span className="text-2xl mb-1">🪙</span>
                <span className="font-gaming font-black text-lg text-amber-300">+{chestRewardModal.coins}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Coins</span>
              </div>

              <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-3 flex flex-col items-center">
                <span className="text-2xl mb-1">⚡</span>
                <span className="font-gaming font-black text-lg text-indigo-300">+{chestRewardModal.xp}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">XP</span>
              </div>
            </div>

            <button
              onClick={() => setChestRewardModal(null)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-gaming font-black text-sm shadow-lg shadow-indigo-900/50 hover:from-cyan-400 hover:to-indigo-500 active:scale-95 transition-all"
            >
              {lang === 'hi' ? 'शानदार! प्राप्त करें (Collect)' : 'Awesome! Collect'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
