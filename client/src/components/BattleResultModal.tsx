import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { BattleFinishedData } from '../types';
import { sound } from '../sound/soundEngine';
import { Trophy, Swords, Zap, RefreshCw, Home, ChevronDown, ChevronUp, BookOpen, AlertCircle, Medal } from 'lucide-react';

interface BattleResultModalProps {
  data: BattleFinishedData & { rankedPlayers?: any[] };
  myUserId: string;
  onRematch: () => void;
  onReturnHome: () => void;
  rematchRequested: boolean;
  opponentRematchReady: boolean;
  lang: 'en' | 'hi';
}

export const BattleResultModal: React.FC<BattleResultModalProps> = ({
  data,
  myUserId,
  onRematch,
  onReturnHome,
  rematchRequested,
  opponentRematchReady,
  lang
}) => {
  const [showQuestionsReview, setShowQuestionsReview] = useState<boolean>(false);

  const ranked = data.rankedPlayers || [data.player1, data.player2];
  const myRankIndex = ranked.findIndex(p => p.userId === myUserId);
  const me = ranked[myRankIndex] || data.player1;
  const isWinner = myRankIndex === 0;

  useEffect(() => {
    if (isWinner) {
      sound.playVictory();
      confetti({
        particleCount: 140,
        spread: 90,
        origin: { y: 0.6 }
      });
    } else {
      sound.playDefeat();
    }
  }, [isWinner]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/95 backdrop-blur-xl p-3 sm:p-4 flex items-center justify-center animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-arena-surface border border-arena-border rounded-3xl p-5 sm:p-6 shadow-2xl relative my-auto max-h-[95vh] overflow-y-auto">
        {/* Outcome Header Banner */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-xl transform hover:scale-105 transition-transform bg-gradient-to-tr from-indigo-600 to-purple-600">
            {isWinner ? (
              <Trophy className="w-9 h-9 text-amber-300 animate-bounce" />
            ) : myRankIndex < 3 ? (
              <Medal className="w-9 h-9 text-cyan-300" />
            ) : (
              <Swords className="w-9 h-9 text-slate-200" />
            )}
          </div>

          <h1 className="font-gaming font-black text-3xl sm:text-4xl tracking-wider uppercase">
            {isWinner ? (
              <span className="text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                CHAMPION! #1
              </span>
            ) : (
              <span className="text-slate-200">
                RANK #{myRankIndex + 1} FINISH
              </span>
            )}
          </h1>

          <p className="text-xs text-slate-400 font-medium mt-1">
            {isWinner
              ? 'Victory! You defeated all rivals in the arena.'
              : `You placed #${myRankIndex + 1} among ${ranked.length} contestants.`}
          </p>
        </div>

        {/* Podium / Contestants Leaderboard */}
        <div className="mt-5 bg-arena-card border border-slate-700/60 rounded-2xl p-3.5 shadow-inner">
          <span className="text-[11px] font-gaming font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
            Final Standings
          </span>

          <div className="space-y-2">
            {ranked.map((p, idx) => {
              const isCurrent = p.userId === myUserId;
              return (
                <div
                  key={p.userId}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                    isCurrent
                      ? 'bg-indigo-950/70 border-indigo-500 ring-1 ring-indigo-500/50'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-gaming font-black text-sm w-6 text-center">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </span>
                    <img
                      src={p.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + p.userId}
                      alt={p.username}
                      className="w-8 h-8 rounded-full object-cover bg-slate-800 border border-slate-700"
                    />
                    <div>
                      <span className={`text-xs font-bold block truncate max-w-[120px] ${isCurrent ? 'text-cyan-300' : 'text-white'}`}>
                        {p.username} {isCurrent && '(You)'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {p.accuracy || 0}% Acc · {p.correctCount || 0} Correct
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-gaming font-black text-base text-cyan-400 block">
                      {p.score} pts
                    </span>
                    <span className={`text-[10px] font-bold ${((p.ratingChange || 0) >= 0) ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {(p.ratingChange || 0) >= 0 ? `+${p.ratingChange}` : p.ratingChange} Elo
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reward Gains */}
          <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Rating Delta</span>
              <span className="font-gaming font-bold text-sm text-emerald-400">
                {(me.ratingChange || 0) >= 0 ? `+${me.ratingChange}` : me.ratingChange}
              </span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">XP Gained</span>
              <span className="font-gaming font-bold text-sm text-indigo-400">
                +{me.earnedXp || 50}
              </span>
            </div>
            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Coins</span>
              <span className="font-gaming font-bold text-sm text-amber-400">
                +{me.earnedCoins || 10}
              </span>
            </div>
          </div>
        </div>

        {/* Weak Topics Focus */}
        {me.weakTopics && me.weakTopics.length > 0 && (
          <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
              <AlertCircle className="w-4 h-4" />
              <span>Recommended Topic Revision:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {me.weakTopics.map((wt: any, i: number) => (
                <span key={i} className="bg-slate-900/90 text-amber-300 px-2 py-0.5 rounded text-[10px] border border-amber-500/30">
                  {wt.topic} ({wt.accuracy}%)
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Review Questions Toggle */}
        <div className="mt-3">
          <button
            onClick={() => setShowQuestionsReview(!showQuestionsReview)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>Review Battle Questions & Explanations</span>
            </div>
            {showQuestionsReview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showQuestionsReview && (
            <div className="mt-2 space-y-2 max-h-52 overflow-y-auto pr-1">
              {data.questions.map((q, idx) => (
                <div key={idx} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
                  <span className="font-gaming font-bold text-indigo-400 block mb-0.5">Q{idx + 1}: {q.pyq_source}</span>
                  <p className="text-slate-200 mb-1.5">{lang === 'hi' ? q.question_hi : q.question_en}</p>
                  <p className="text-emerald-400 text-[11px] mb-1">
                    Correct: Option {['A', 'B', 'C', 'D'][q.correct_option]}
                  </p>
                  <p className="text-slate-400 text-[10px] leading-relaxed">
                    {lang === 'hi' ? q.explanation_hi : q.explanation_en}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            onClick={onRematch}
            disabled={rematchRequested}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-gaming font-bold text-sm shadow-lg active:scale-95 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${rematchRequested ? 'animate-spin' : ''}`} />
            <span>{rematchRequested ? 'Waiting...' : 'Rematch'}</span>
          </button>

          <button
            onClick={onReturnHome}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-gaming font-bold text-sm active:scale-95 transition-all shadow-md"
          >
            <Home className="w-4 h-4 text-indigo-400" />
            <span>Return to Arena</span>
          </button>
        </div>
      </div>
    </div>
  );
};
