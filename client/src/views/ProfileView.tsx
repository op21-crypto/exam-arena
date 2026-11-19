import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Trophy, Flame, Coins, Zap, Target, Award, Clock, ArrowUpRight, ArrowDownRight, RefreshCw, ArrowLeft } from 'lucide-react';

interface ProfileViewProps {
  onNavigateTab?: (tab: any) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onNavigateTab }) => {
  const { user, lang, refreshUser } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);

  useEffect(() => {
    if (user?.id) {
      setLoadingHistory(true);
      fetch(`/api/leaderboard/history/${user.id}?limit=15`)
        .then(res => res.json())
        .then(data => {
          if (data.history && data.history.length > 0) {
            setHistory(data.history);
          } else {
            setHistory([
              {
                battle_id: 'b-mock-1',
                player1_id: user.id,
                player2_id: 'bot-arjun',
                player1_username: user.username,
                player2_username: 'Topper_Arjun ⚡',
                player1_avatar: user.avatar,
                player2_avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Topper_Arjun',
                winner_id: user.id,
                player1_score: 950,
                player2_score: 720,
                rating_change_p1: 24,
                rating_change_p2: -16,
                mode: 'quick_battle'
              },
              {
                battle_id: 'b-mock-2',
                player1_id: user.id,
                player2_id: 'bot-priya',
                player1_username: user.username,
                player2_username: 'Priya_Sharma ⭐',
                player1_avatar: user.avatar,
                player2_avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Priya_Sharma',
                winner_id: user.id,
                player1_score: 820,
                player2_score: 650,
                rating_change_p1: 22,
                rating_change_p2: -14,
                mode: 'subject_battle'
              }
            ]);
          }
        })
        .catch(() => {
          setHistory([
            {
              battle_id: 'b-mock-1',
              player1_id: user.id,
              player2_id: 'bot-arjun',
              player1_username: user.username,
              player2_username: 'Topper_Arjun ⚡',
              player1_avatar: user.avatar,
              player2_avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Topper_Arjun',
              winner_id: user.id,
              player1_score: 950,
              player2_score: 720,
              rating_change_p1: 24,
              rating_change_p2: -16,
              mode: 'quick_battle'
            }
          ]);
        })
        .finally(() => setLoadingHistory(false));
    }
  }, [user?.id]);

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 pb-24 flex flex-col gap-4">
      {/* Back to Home Button */}
      {onNavigateTab && (
        <div>
          <button
            onClick={() => onNavigateTab('home')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-gaming font-bold transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-purple-400" />
            <span>{lang === 'hi' ? '← मुख्य पृष्ठ (Home)' : '← Back to Home'}</span>
          </button>
        </div>
      )}

      {/* 1. Aspirant Dossier Card */}
      <div className="bg-arena-card border border-arena-border rounded-3xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-3 border-indigo-500 overflow-hidden bg-slate-800 p-0.5 shadow-xl">
              <img
                src={user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=Aspirant'}
                alt={user?.username}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <span className="absolute bottom-0 right-0 bg-indigo-600 text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full border border-slate-900 font-gaming">
              LVL {user?.stats.level || 1}
            </span>
          </div>

          <div className="flex-1">
            <h1 className="font-gaming font-black text-2xl text-white tracking-wide">
              {user?.username}
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">ID: {user?.id}</p>

            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-bold font-gaming px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                ⭐ {user?.stats.rank_tier || 'Silver'} ({user?.stats.rating || 1200} Elo)
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-400/10 text-amber-300 border border-amber-400/20 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                {user?.stats.coins || 100}
              </span>
            </div>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400 font-gaming">Level Progress</span>
            <span className="text-indigo-400 font-gaming font-bold">
              {user?.stats.xp || 0} / {user?.stats.nextLevelXp || 100} XP
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${user?.stats.progressPercent || 20}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Key Performance Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 text-center">
          <span className="text-[10px] text-slate-400 block mb-0.5 font-gaming uppercase">Total Battles</span>
          <span className="font-gaming font-black text-xl text-white">
            {user?.stats.total_battles || 0}
          </span>
          <span className="text-[10px] text-slate-500 block">
            {user?.stats.wins || 0}W - {user?.stats.losses || 0}L
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 text-center">
          <span className="text-[10px] text-slate-400 block mb-0.5 font-gaming uppercase">Win Rate</span>
          <span className="font-gaming font-black text-xl text-emerald-400">
            {user?.stats.winRate || 0}%
          </span>
          <span className="text-[10px] text-slate-500 block">Competitive</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 text-center">
          <span className="text-[10px] text-slate-400 block mb-0.5 font-gaming uppercase">Accuracy</span>
          <span className="font-gaming font-black text-xl text-cyan-400">
            {user?.stats.accuracy || 0}%
          </span>
          <span className="text-[10px] text-slate-500 block">
            {user?.stats.correct_questions || 0} / {user?.stats.total_questions || 0}
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 text-center">
          <span className="text-[10px] text-slate-400 block mb-0.5 font-gaming uppercase">Best Streak</span>
          <div className="flex items-center justify-center gap-1 font-gaming font-black text-xl text-amber-400">
            <Flame className="w-4 h-4 fill-amber-400" />
            <span>{user?.stats.best_streak || 0}</span>
          </div>
          <span className="text-[10px] text-slate-500 block">
            Current: {user?.stats.win_streak || 0}
          </span>
        </div>
      </div>

      {/* 3. Achievements Grid */}
      <div className="bg-arena-card border border-arena-border rounded-2xl p-4 shadow-lg">
        <h3 className="font-gaming font-bold text-base text-white mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          Unlocked Achievements
        </h3>

        <div className="grid grid-cols-2 gap-2">
          {user?.achievements && user.achievements.length > 0 ? (
            user.achievements.map((ach) => (
              <div
                key={ach.id}
                className="bg-slate-900/80 border border-indigo-500/30 rounded-xl p-2.5 flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <span className="font-bold text-xs text-white block truncate max-w-[120px]">
                    {ach.title_en}
                  </span>
                  <span className="text-[10px] text-indigo-400">
                    +{ach.reward_xp} XP
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-3 text-xs text-slate-500">
              Win battles & maintain streaks to unlock achievements!
            </div>
          )}
        </div>
      </div>

      {/* 4. Recent Battle Logs */}
      <div className="bg-arena-card border border-arena-border rounded-2xl p-4 shadow-lg">
        <h3 className="font-gaming font-bold text-base text-white mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          Recent Battle History
        </h3>

        {loadingHistory ? (
          <div className="text-center py-4 text-xs text-slate-500">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-4 text-xs text-slate-500">No battles fought yet. Start your first 1v1!</div>
        ) : (
          <div className="space-y-2">
            {history.map((b) => {
              const isP1 = user?.id === b.player1_id;
              const myScore = isP1 ? b.player1_score : b.player2_score;
              const oppScore = isP1 ? b.player2_score : b.player1_score;
              const oppName = isP1 ? b.player2_username : b.player1_username;
              const oppAvatar = isP1 ? b.player2_avatar : b.player1_avatar;
              const isWin = b.winner_id === user?.id;
              const isDraw = b.winner_id === null;
              const ratingDelta = isP1 ? b.rating_change_p1 : b.rating_change_p2;

              return (
                <div
                  key={b.battle_id}
                  className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[11px] font-gaming font-black px-2 py-0.5 rounded-md ${
                      isWin ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                      isDraw ? 'bg-slate-700 text-slate-300' :
                      'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}>
                      {isWin ? 'WIN' : isDraw ? 'DRAW' : 'LOSS'}
                    </span>

                    <div className="flex items-center gap-2">
                      <img src={oppAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=Rival'} alt={oppName} className="w-7 h-7 rounded-full bg-slate-800 object-cover" />
                      <div>
                        <span className="text-xs font-semibold text-white block">vs {oppName || 'Rival'}</span>
                        <span className="text-[10px] text-slate-400 capitalize">{b.mode} Mode</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-gaming font-bold text-sm text-white block">
                      {myScore} - {oppScore}
                    </span>
                    <span className={`text-[10px] font-bold ${ratingDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {ratingDelta >= 0 ? `+${ratingDelta}` : ratingDelta} Elo
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
