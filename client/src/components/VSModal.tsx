import React, { useEffect, useState } from 'react';
import { BattlePlayerInfo } from '../types';
import { sound } from '../sound/soundEngine';
import { Shield, Zap, ArrowLeft } from 'lucide-react';

interface VSModalProps {
  player1: BattlePlayerInfo;
  player2: BattlePlayerInfo;
  countdown: number | null;
  countdownMessage?: string;
  onCancel?: () => void;
  lang?: 'en' | 'hi';
}

export const VSModal: React.FC<VSModalProps> = ({
  player1,
  player2,
  countdown,
  countdownMessage,
  onCancel,
  lang = 'en'
}) => {
  useEffect(() => {
    sound.playMatchFound();
  }, []);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      sound.playCountdownTick();
    } else if (countdown === 0) {
      sound.playCountdownGo();
    }
  }, [countdown]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Top Header Badge */}
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-gaming font-bold tracking-widest uppercase mb-8 animate-pulse">
          <Zap className="w-4 h-4 text-cyan-400" />
          OPPONENT LOCATED — MATCH READY
        </div>

        {/* Head-to-Head VS Cards */}
        <div className="w-full flex items-center justify-between gap-2 relative my-4">
          {/* Player 1 (You) */}
          <div className="flex-1 flex flex-col items-center bg-slate-900/80 border border-cyan-500/40 rounded-2xl p-4 shadow-xl shadow-cyan-950/30 neon-border-blue transform -rotate-1">
            <div className="w-20 h-20 rounded-full border-4 border-cyan-400 p-1 bg-slate-800 shadow-lg mb-2 relative">
              <img
                src={player1.avatar}
                alt={player1.username}
                className="w-full h-full object-cover rounded-full"
              />
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-cyan-500 text-slate-950 font-gaming font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                YOU
              </span>
            </div>
            <h3 className="font-gaming font-bold text-lg text-white text-center truncate max-w-[120px]">
              {player1.username}
            </h3>
            <div className="flex items-center gap-1 mt-1 text-xs text-cyan-300 font-semibold">
              <Shield className="w-3.5 h-3.5" />
              <span>{player1.rating} Elo</span>
            </div>
            <span className="mt-1 text-[11px] px-2 py-0.5 bg-slate-800 rounded-md text-slate-400 border border-slate-700">
              {player1.rankTier}
            </span>
          </div>

          {/* VS Divider Orb */}
          <div className="z-10 -mx-3 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center shadow-2xl border-2 border-white/40 transform hover:scale-110 transition-transform">
              <span className="font-gaming font-black text-xl text-white italic tracking-tighter">
                VS
              </span>
            </div>
          </div>

          {/* Player 2 (Opponent) */}
          <div className="flex-1 flex flex-col items-center bg-slate-900/80 border border-rose-500/40 rounded-2xl p-4 shadow-xl shadow-rose-950/30 transform rotate-1">
            <div className="w-20 h-20 rounded-full border-4 border-rose-500 p-1 bg-slate-800 shadow-lg mb-2 relative">
              <img
                src={player2.avatar}
                alt={player2.username}
                className="w-full h-full object-cover rounded-full"
              />
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-rose-500 text-white font-gaming font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                RIVAL
              </span>
            </div>
            <h3 className="font-gaming font-bold text-lg text-white text-center truncate max-w-[120px]">
              {player2.username}
            </h3>
            <div className="flex items-center gap-1 mt-1 text-xs text-rose-300 font-semibold">
              <Shield className="w-3.5 h-3.5" />
              <span>{player2.rating} Elo</span>
            </div>
            <span className="mt-1 text-[11px] px-2 py-0.5 bg-slate-800 rounded-md text-slate-400 border border-slate-700">
              {player2.rankTier}
            </span>
          </div>
        </div>

        {/* Dynamic Countdown Section */}
        <div className="mt-8 flex flex-col items-center">
          {countdown !== null && countdown > 0 ? (
            <div className="flex flex-col items-center animate-bounce-subtle">
              <div className="w-20 h-20 rounded-full bg-indigo-600/30 border-2 border-indigo-400 flex items-center justify-center shadow-2xl shadow-indigo-500/50">
                <span className="font-gaming font-black text-5xl text-indigo-300">
                  {countdown}
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-400 font-gaming tracking-wider uppercase">
                Synchronizing battle questions...
              </p>
            </div>
          ) : countdown === 0 || countdownMessage ? (
            <div className="flex flex-col items-center animate-pulse">
              <span className="font-gaming font-black text-4xl text-amber-400 tracking-widest neon-text-purple">
                {countdownMessage || 'BATTLE!'}
              </span>
            </div>
          ) : (
            <div className="text-sm text-slate-400 font-gaming tracking-wide animate-pulse">
              Preparing exam arena...
            </div>
          )}

          {/* Quick Cancel Match button */}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="mt-6 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-gaming font-bold shadow-lg transition-all active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{lang === 'hi' ? '← मुकाबला रद्द करें (Cancel)' : '← Cancel & Exit'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
