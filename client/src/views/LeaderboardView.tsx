import React, { useState, useEffect } from 'react';
import { Trophy, Shield, Flame, Medal, RefreshCw, Award, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BUNDLED_LEADERBOARD } from '../data/bundledQuestions';

interface LeaderboardViewProps {
  onNavigateTab?: (tab: any) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ onNavigateTab }) => {
  const { user, lang } = useAuth();
  const [leaderboard, setLeaderboard] = useState<any[]>(BUNDLED_LEADERBOARD);
  const [loading, setLoading] = useState<boolean>(false);
  const [tierFilter, setTierFilter] = useState<string>('all');

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard/global?limit=50');
      if (res.ok) {
        const data = await res.json();
        if (data.leaderboard && data.leaderboard.length > 0) {
          setLeaderboard(data.leaderboard);
        }
      }
    } catch {
      // Keep bundled leaderboard
      setLeaderboard(BUNDLED_LEADERBOARD);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const filtered = leaderboard.filter(item => {
    if (tierFilter === 'all') return true;
    return item.rank_tier?.toLowerCase() === tierFilter.toLowerCase();
  });

  const getRankBadgeClass = (rank?: string) => {
    switch (rank) {
      case 'Bronze': return 'bg-amber-900/60 text-amber-300 border-amber-700';
      case 'Silver': return 'bg-slate-700/60 text-slate-300 border-slate-500';
      case 'Gold': return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
      case 'Platinum': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
      case 'Diamond': return 'bg-cyan-500/20 text-cyan-300 border-cyan-400/60';
      case 'Master': return 'bg-purple-500/20 text-purple-300 border-purple-400/60';
      case 'Grandmaster': return 'bg-red-500/20 text-red-300 border-red-500/60';
      case 'Legend': return 'bg-yellow-500/30 text-yellow-300 border-yellow-400 animate-pulse';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 pb-24 flex flex-col gap-4">
      {/* Back to Home Button */}
      {onNavigateTab && (
        <div>
          <button
            onClick={() => onNavigateTab('home')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-gaming font-bold transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'hi' ? '← मुख्य पृष्ठ (Home)' : '← Back to Home'}</span>
          </button>
        </div>
      )}

      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-gaming font-black text-2xl text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            GLOBAL ARENA RANKS
          </h1>
          <p className="text-xs text-slate-400">Competitive Elo leaderboard of Indian exam aspirants</p>
        </div>

        <button
          onClick={fetchLeaderboard}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tier Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-gaming font-bold no-scrollbar">
        {['all', 'Legend', 'Grandmaster', 'Master', 'Diamond', 'Gold', 'Silver', 'Bronze'].map((tier) => (
          <button
            key={tier}
            onClick={() => setTierFilter(tier)}
            className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-colors capitalize ${
              tierFilter === tier
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            {tier === 'all' ? 'All Tiers' : tier}
          </button>
        ))}
      </div>

      {/* Leaderboard Table */}
      {loading ? (
        <div className="bg-arena-card border border-arena-border rounded-2xl p-8 flex flex-col items-center justify-center">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
          <p className="text-sm text-slate-300 font-gaming">Calculating rankings...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-arena-card border border-arena-border rounded-2xl p-8 text-center text-slate-400 text-xs">
          No aspirants found in this tier.
        </div>
      ) : (
        <div className="bg-arena-card border border-arena-border rounded-2xl overflow-hidden shadow-xl">
          <div className="divide-y divide-slate-800/80">
            {filtered.map((item, index) => {
              const isMe = item.id === user?.id;
              const pos = index + 1;

              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3.5 transition-colors ${
                    isMe ? 'bg-indigo-950/40 border-l-4 border-indigo-500' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank Position */}
                    <div className="w-7 text-center font-gaming font-black text-sm">
                      {pos === 1 ? (
                        <span className="text-amber-400 text-base">🥇</span>
                      ) : pos === 2 ? (
                        <span className="text-slate-300 text-base">🥈</span>
                      ) : pos === 3 ? (
                        <span className="text-amber-600 text-base">🥉</span>
                      ) : (
                        <span className="text-slate-500">#{pos}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full border border-slate-700 overflow-hidden bg-slate-800">
                      <img src={item.avatar} alt={item.username} className="w-full h-full object-cover" />
                    </div>

                    {/* Name & Tier */}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold text-xs sm:text-sm ${isMe ? 'text-cyan-400' : 'text-white'}`}>
                          {item.username} {isMe && '(You)'}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getRankBadgeClass(item.rank_tier)}`}>
                          {item.rank_tier}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span>{item.wins} Wins</span>
                        <span>·</span>
                        <span>{item.win_rate}% Win Rate</span>
                        {item.win_streak > 1 && (
                          <>
                            <span>·</span>
                            <span className="text-amber-400 font-semibold flex items-center">
                              <Flame className="w-3 h-3 fill-amber-400" /> {item.win_streak}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="text-right">
                    <span className="font-gaming font-black text-base text-cyan-400 block">
                      {item.rating}
                    </span>
                    <span className="text-[10px] text-slate-500 font-gaming uppercase">
                      Elo
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
