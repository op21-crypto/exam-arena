import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DailyMission } from '../types';
import {
  Swords, Users, Zap, Target, BookOpen, Trophy, Flame,
  CheckCircle2, ChevronRight, Award, Shield, Sparkles
} from 'lucide-react';

interface HomeDashboardProps {
  onStartQuickBattle: (examId?: string, subjectId?: string) => void;
  onOpenFriendRoom: () => void;
  onOpenPractice: () => void;
  onNavigateTab: (tab: any) => void;
  isSearching: boolean;
  onCancelSearch: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onStartQuickBattle,
  onOpenFriendRoom,
  onOpenPractice,
  onNavigateTab,
  isSearching,
  onCancelSearch
}) => {
  const { user, lang, refreshUser } = useAuth();
  const [missions, setMissions] = useState<DailyMission[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);

  const fetchMissions = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/gamification/missions/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setMissions(data.missions || []);
      }
    } catch (err) {
      console.error('Error fetching missions:', err);
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
      }
    } catch (err) {
      console.error('Error claiming mission:', err);
    } finally {
      setClaiming(null);
    }
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
              1V1 COMPETITIVE MULTIPLAYER
            </span>

            {/* Streak Badge */}
            {(user?.stats.win_streak || 0) > 0 && (
              <div className="flex items-center gap-1 text-xs font-gaming font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                <Flame className="w-3.5 h-3.5 fill-amber-400" />
                <span>{user?.stats.win_streak} WIN STREAK</span>
              </div>
            )}
          </div>

          <h1 className="font-gaming font-black text-2xl sm:text-3xl text-white tracking-wide">
            ENTER THE ARENA
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xs leading-relaxed">
            Real-time 1v1 battle against live aspirants. 10 questions, 10s timer, server-authoritative scoring.
          </p>

          <div className="mt-5 flex items-center gap-3">
            {isSearching ? (
              <button
                onClick={onCancelSearch}
                className="flex-1 py-3.5 px-5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-gaming font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-rose-900/40 animate-pulse transition-all"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                <span>Matchmaking in progress... (Cancel)</span>
              </button>
            ) : (
              <button
                onClick={() => onStartQuickBattle()}
                className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-purple-500 text-white font-gaming font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-indigo-900/50 hover:shadow-cyan-500/30 active:scale-95 transition-all"
              >
                <Swords className="w-5 h-5" />
                <span>⚔️ FIND RANDOM OPPONENT</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Game Mode Cards Grid */}
      <div>
        <h2 className="font-gaming font-bold text-lg text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          Game Modes & Battles
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
              <h3 className="font-gaming font-bold text-base text-white">Play with Friends</h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Create or join private room with room code.
              </p>
            </div>
            <span className="text-[10px] font-bold text-purple-400 flex items-center gap-1 mt-3">
              Custom Room <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
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
              <h3 className="font-gaming font-bold text-base text-white">Subject Battle</h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Pick Math, Reasoning, English, or GK specifically.
              </p>
            </div>
            <span className="text-[10px] font-bold text-cyan-400 flex items-center gap-1 mt-3">
              Choose Subject <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>

          {/* Speed Challenge */}
          <div
            onClick={() => onStartQuickBattle()}
            className="group cursor-pointer bg-arena-card hover:bg-slate-800/90 border border-arena-border hover:border-amber-500/50 rounded-2xl p-4 transition-all duration-200 active:scale-98 shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-gaming font-bold text-base text-white">Speed Challenge</h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Rapid answers earn up to +50 speed bonus points!
              </p>
            </div>
            <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1 mt-3">
              Fast Reflexes <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
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
              <h3 className="font-gaming font-bold text-base text-white">Practice Mode</h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Untimed practice with bilingual explanations.
              </p>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 mt-3">
              Solo Drill <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </div>
      </div>

      {/* 3. Daily Missions */}
      <div className="bg-arena-card border border-arena-border rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <h3 className="font-gaming font-bold text-base text-white">Daily Missions</h3>
          </div>
          <span className="text-[10px] text-slate-400">Resets daily at 00:00</span>
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
                    Claimed ✓
                  </span>
                ) : m.is_completed ? (
                  <button
                    onClick={() => handleClaimMission(m.id)}
                    disabled={claiming === m.id}
                    className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-gaming font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-transform"
                  >
                    {claiming === m.id ? 'Claiming...' : 'Claim'}
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-500 font-medium">In Progress</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
