import React, { useState, useEffect } from 'react';
import { SanitizedQuestion, BattlePlayerInfo } from '../types';
import { sound } from '../sound/soundEngine';
import { CheckCircle2, XCircle, Globe, Zap, Users } from 'lucide-react';

interface BattleScreenProps {
  battleId: string;
  question: SanitizedQuestion;
  questionIndex: number;
  totalQuestions: number;
  myUserId: string;
  player1: BattlePlayerInfo;
  player2: BattlePlayerInfo;
  allPlayers?: any[];
  myScore: number;
  opponentScore: number;
  opponentAnswered: boolean;
  remainingSeconds: number;
  resolution: {
    correctOption: number;
    explanation_en: string;
    explanation_hi: string;
    yourChoice: number | null;
    isCorrect: boolean;
    pointsAwarded: number;
    opponentChoice: number | null;
    allPlayers?: any[];
  } | null;
  onSubmitAnswer: (selectedOption: number, elapsedMs: number) => void;
  lang: 'en' | 'hi';
  onToggleLang: () => void;
}

export const BattleScreen: React.FC<BattleScreenProps> = ({
  battleId,
  question,
  questionIndex,
  totalQuestions,
  myUserId,
  player1,
  player2,
  allPlayers,
  myScore,
  opponentScore,
  opponentAnswered,
  remainingSeconds,
  resolution,
  onSubmitAnswer,
  lang,
  onToggleLang
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  const isPlayer1 = myUserId === player1.userId;
  const me = isPlayer1 ? player1 : player2;
  const opponent = isPlayer1 ? player2 : player1;

  useEffect(() => {
    setSelectedOption(null);
    setQuestionStartTime(Date.now());
  }, [questionIndex]);

  useEffect(() => {
    if (remainingSeconds <= 3 && remainingSeconds > 0 && !resolution) {
      sound.playTimerUrgent();
    }
  }, [remainingSeconds, resolution]);

  useEffect(() => {
    if (resolution) {
      if (resolution.isCorrect) {
        sound.playCorrect();
      } else {
        sound.playIncorrect();
      }
    }
  }, [resolution]);

  const handleSelect = (idx: number) => {
    if (selectedOption !== null || resolution) return;
    const elapsed = Date.now() - questionStartTime;
    setSelectedOption(idx);
    onSubmitAnswer(idx, elapsed);
  };

  const letters = ['A', 'B', 'C', 'D'];

  const getOptionText = (idx: number) => {
    if (lang === 'hi') {
      if (idx === 0) return question.option_a_hi || question.option_a_en;
      if (idx === 1) return question.option_b_hi || question.option_b_en;
      if (idx === 2) return question.option_c_hi || question.option_c_en;
      return question.option_d_hi || question.option_d_en;
    }
    if (idx === 0) return question.option_a_en;
    if (idx === 1) return question.option_b_en;
    if (idx === 2) return question.option_c_en;
    return question.option_d_en;
  };

  const questionText = lang === 'hi' ? (question.question_hi || question.question_en) : question.question_en;
  const timerColor = remainingSeconds <= 3 ? 'text-rose-400 border-rose-500 animate-pulse' : remainingSeconds <= 6 ? 'text-amber-400 border-amber-500' : 'text-cyan-400 border-cyan-500';

  // Contestants list (supports 2 to 6+ players)
  const contestants = (allPlayers && allPlayers.length > 2) ? allPlayers : null;

  return (
    <div className="w-full max-w-xl mx-auto px-3 sm:px-4 py-2 pb-24 flex flex-col gap-3">
      {/* 1. Score Bar */}
      {contestants ? (
        /* Multi-Player Score Roster (>2 players) */
        <div className="bg-arena-card border border-arena-border rounded-2xl p-3 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-gaming font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              Live Contestants ({contestants.length})
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-gaming text-slate-400 font-bold uppercase">
                Q {questionIndex + 1}/{totalQuestions}
              </span>
              <div className={`w-8 h-8 rounded-full border-2 ${timerColor} flex items-center justify-center bg-slate-900 font-gaming font-black text-xs`}>
                {remainingSeconds}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {contestants.map((p) => {
              const isCurrent = p.userId === myUserId;
              return (
                <div
                  key={p.userId}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border shrink-0 ${
                    isCurrent
                      ? 'bg-indigo-950/70 border-indigo-500 ring-1 ring-indigo-500/40'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <div className="relative">
                    <img
                      src={p.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + p.userId}
                      alt={p.username}
                      className="w-6 h-6 rounded-full object-cover bg-slate-800"
                    />
                    {p.answered && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                    )}
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-white block truncate max-w-[80px]">
                      {p.username} {isCurrent && '(You)'}
                    </span>
                    <span className="text-[10px] font-gaming font-bold text-cyan-400">
                      {p.score} pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Standard 1v1 Head-to-Head Bar */
        <div className="bg-arena-card border border-arena-border rounded-2xl p-3 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            {/* You */}
            <div className="flex items-center gap-2 flex-1">
              <div className="relative">
                <img
                  src={me.avatar}
                  alt={me.username}
                  className="w-9 h-9 rounded-full border-2 border-cyan-400 bg-slate-800 object-cover"
                />
                {selectedOption !== null && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center text-[10px] text-slate-950 font-bold">
                    ✓
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white truncate max-w-[90px] sm:max-w-[120px]">
                  {me.username} (You)
                </span>
                <span className="font-gaming font-extrabold text-base text-cyan-400">
                  {myScore} pts
                </span>
              </div>
            </div>

            {/* Central Question Counter & Timer */}
            <div className="flex flex-col items-center px-2">
              <span className="text-[10px] font-gaming text-slate-400 font-bold uppercase tracking-wider">
                Q {questionIndex + 1} / {totalQuestions}
              </span>
              <div className={`w-11 h-11 rounded-full border-2 ${timerColor} flex items-center justify-center bg-slate-900/90 shadow-md my-0.5`}>
                <span className="font-gaming font-black text-lg">{remainingSeconds}</span>
              </div>
            </div>

            {/* Opponent */}
            <div className="flex items-center justify-end gap-2 flex-1 text-right">
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-slate-300 truncate max-w-[90px] sm:max-w-[120px]">
                  {opponent.username}
                </span>
                <span className="font-gaming font-extrabold text-base text-rose-400">
                  {opponentScore} pts
                </span>
              </div>
              <div className="relative">
                <img
                  src={opponent.avatar}
                  alt={opponent.username}
                  className="w-9 h-9 rounded-full border-2 border-rose-400 bg-slate-800 object-cover"
                />
                {opponentAnswered && (
                  <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center text-[10px] text-white font-bold animate-ping">
                    ⚡
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span>Status:</span>
              {selectedOption !== null ? (
                <span className="text-cyan-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Answer Submitted
                </span>
              ) : (
                <span className="text-amber-400 font-medium">Select your answer...</span>
              )}
            </div>

            <div>
              {opponentAnswered ? (
                <span className="text-rose-400 font-bold flex items-center gap-1 animate-pulse">
                  <Zap className="w-3.5 h-3.5 fill-rose-400 text-rose-400" /> Opponent Locked In!
                </span>
              ) : (
                <span className="text-slate-400 flex items-center gap-1">
                  Opponent is thinking...
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Bilingual Question Card */}
      <div className="bg-arena-card border border-arena-border rounded-2xl p-4 sm:p-5 shadow-xl relative">
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-md font-semibold text-[11px]">
              {question.pyq_source || 'Official PYQ'}
            </span>
            <span className="capitalize text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
              {question.difficulty}
            </span>
          </div>

          <button
            onClick={onToggleLang}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-300 transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'हिन्दी में देखें' : 'View in English'}</span>
          </button>
        </div>

        <h2 className="text-sm sm:text-base font-medium text-slate-100 leading-relaxed min-h-[4rem]">
          {questionText}
        </h2>
      </div>

      {/* 3. Four Interactive Options */}
      <div className="grid grid-cols-1 gap-2.5">
        {[0, 1, 2, 3].map((optIdx) => {
          const isSelected = selectedOption === optIdx;
          const letter = letters[optIdx];
          const text = getOptionText(optIdx);

          let optionStyle = 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-700/80 text-slate-200';

          if (resolution) {
            if (optIdx === resolution.correctOption) {
              optionStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 neon-border-blue';
            } else if (isSelected && !resolution.isCorrect) {
              optionStyle = 'bg-rose-950/80 border-rose-500 text-rose-200';
            } else {
              optionStyle = 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60';
            }
          } else if (isSelected) {
            optionStyle = 'bg-indigo-950/80 border-indigo-500 text-indigo-200 ring-2 ring-indigo-500/50';
          }

          return (
            <button
              key={optIdx}
              onClick={() => handleSelect(optIdx)}
              disabled={selectedOption !== null || Boolean(resolution)}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all duration-150 active:scale-[0.99] ${optionStyle}`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-gaming font-bold text-xs ${
                  isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {letter}
                </span>
                <span className="text-xs sm:text-sm font-medium leading-snug">
                  {text}
                </span>
              </div>

              {resolution ? (
                optIdx === resolution.correctOption ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : isSelected ? (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                ) : null
              ) : isSelected ? (
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                  Locked
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Review Drawer on Question Resolution */}
      {resolution && (
        <div className="bg-slate-900/95 border border-indigo-500/30 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {resolution.isCorrect ? (
                <span className="flex items-center gap-1 font-gaming font-extrabold text-emerald-400 text-base">
                  <CheckCircle2 className="w-5 h-5" /> CORRECT (+{resolution.pointsAwarded} pts)
                </span>
              ) : (
                <span className="flex items-center gap-1 font-gaming font-extrabold text-rose-400 text-base">
                  <XCircle className="w-5 h-5" /> INCORRECT (+0 pts)
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400 font-gaming">
              Next question in 2s...
            </span>
          </div>

          <div className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800 leading-relaxed">
            <span className="font-bold text-indigo-300 block mb-1">
              {lang === 'hi' ? 'विस्तृत व्याख्या:' : 'Step-by-Step Explanation:'}
            </span>
            {lang === 'hi' ? resolution.explanation_hi : resolution.explanation_en}
          </div>
        </div>
      )}
    </div>
  );
};
