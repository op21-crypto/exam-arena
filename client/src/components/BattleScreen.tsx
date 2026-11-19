import React, { useState, useEffect } from 'react';
import { SanitizedQuestion, BattlePlayerInfo } from '../types';
import { sound } from '../sound/soundEngine';
import { CheckCircle2, XCircle, Globe, Zap, Users, ArrowLeft, LogOut } from 'lucide-react';

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
  onQuitBattle: () => void;
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
  onQuitBattle,
  lang,
  onToggleLang
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [showQuitConfirm, setShowQuitConfirm] = useState<boolean>(false);

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
      {/* 0. Top Navigation & Action Controls */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => setShowQuitConfirm(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-gaming font-bold shadow-md transition-all active:scale-95"
          title="Quit Battle Early"
        >
          <ArrowLeft className="w-4 h-4 text-rose-400" />
          <span>{lang === 'hi' ? '← मुकाबला छोड़ें (Leave)' : '← Leave Battle'}</span>
        </button>

        <button
          onClick={onToggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold shadow-sm transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-indigo-400" />
          <span>{lang === 'hi' ? 'हिन्दी' : 'English'}</span>
        </button>
      </div>

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
                  <CheckCircle2 className="w-3.5 h-3.5" /> {lang === 'hi' ? 'उत्तर दर्ज हुआ' : 'Answer Submitted'}
                </span>
              ) : (
                <span className="text-amber-400 font-medium">
                  {lang === 'hi' ? 'अपना उत्तर चुनें...' : 'Select your answer...'}
                </span>
              )}
            </div>

            <div>
              {opponentAnswered ? (
                <span className="text-rose-400 font-bold flex items-center gap-1 animate-pulse">
                  <Zap className="w-3.5 h-3.5 fill-rose-400 text-rose-400" /> {lang === 'hi' ? 'विरोधी ने उत्तर दिया!' : 'Opponent Locked In!'}
                </span>
              ) : (
                <span className="text-slate-400 flex items-center gap-1">
                  {lang === 'hi' ? 'विरोधी सोच रहा है...' : 'Opponent is thinking...'}
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
            <span className="text-slate-400 capitalize">
              {question.difficulty} · {question.subject_id?.replace('sub-', '')}
            </span>
          </div>

          <button
            onClick={onToggleLang}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-[11px]"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span className="uppercase">{lang}</span>
          </button>
        </div>

        <p className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed">
          {questionText}
        </p>
      </div>

      {/* 3. Options Grid */}
      <div className="grid grid-cols-1 gap-2.5">
        {[0, 1, 2, 3].map((idx) => {
          const letter = letters[idx];
          const text = getOptionText(idx);
          const isSelected = selectedOption === idx;

          let btnClasses = 'border-arena-border bg-arena-card hover:bg-slate-800/90 text-slate-200';
          let badgeClasses = 'border-slate-700 bg-slate-800 text-slate-400';

          if (resolution) {
            const isCorrectAnswer = idx === resolution.correctOption;
            if (isCorrectAnswer) {
              btnClasses = 'border-emerald-500 bg-emerald-950/70 text-emerald-100 ring-2 ring-emerald-500/50';
              badgeClasses = 'border-emerald-400 bg-emerald-500 text-slate-950 font-bold';
            } else if (isSelected && !isCorrectAnswer) {
              btnClasses = 'border-rose-500 bg-rose-950/70 text-rose-100 ring-2 ring-rose-500/50';
              badgeClasses = 'border-rose-400 bg-rose-500 text-white font-bold';
            } else {
              btnClasses = 'border-slate-800 bg-slate-900/40 text-slate-500 opacity-60';
              badgeClasses = 'border-slate-800 bg-slate-900 text-slate-600';
            }
          } else if (isSelected) {
            btnClasses = 'border-cyan-400 bg-cyan-950/80 text-cyan-100 ring-2 ring-cyan-400/50';
            badgeClasses = 'border-cyan-400 bg-cyan-500 text-slate-950 font-bold';
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={selectedOption !== null || Boolean(resolution)}
              className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all duration-150 active:scale-98 shadow-md ${btnClasses}`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-xl border flex items-center justify-center font-gaming font-black text-sm shrink-0 ${badgeClasses}`}>
                  {letter}
                </span>
                <span className="text-sm sm:text-base font-medium">{text}</span>
              </div>

              {resolution && idx === resolution.correctOption && (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              )}
              {resolution && isSelected && idx !== resolution.correctOption && (
                <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Instant Explanation Drawer after Resolution */}
      {resolution && (
        <div className="mt-1 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className={`font-gaming font-black text-sm uppercase ${
              resolution.isCorrect ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {resolution.isCorrect ? `✓ Correct! (+${resolution.pointsAwarded} pts)` : '✗ Incorrect (0 pts)'}
            </span>
            <span className="text-[11px] text-slate-400 font-gaming">Next question starting soon...</span>
          </div>

          <div className="text-xs text-slate-300 leading-relaxed border-t border-slate-800 pt-2">
            <span className="font-bold text-slate-200 block mb-1">
              {lang === 'hi' ? 'विस्तृत समाधान व व्याख्या:' : 'Explanation & Formula:'}
            </span>
            <p>{lang === 'hi' ? resolution.explanation_hi : resolution.explanation_en}</p>
          </div>
        </div>
      )}

      {/* Surrender / Quit Confirmation Modal */}
      {showQuitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-arena-surface border border-rose-500/40 rounded-3xl p-5 shadow-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-3">
              <LogOut className="w-6 h-6 text-rose-400" />
            </div>

            <h3 className="font-gaming font-black text-xl text-white">
              {lang === 'hi' ? 'क्या आप मुकाबला छोड़ना चाहते हैं?' : 'Leave Battle Early?'}
            </h3>

            <p className="text-xs text-slate-300 mt-1.5 mb-5 leading-relaxed">
              {lang === 'hi'
                ? 'यदि आप अभी छोड़ते हैं, तो यह मुकाबला समाप्त हो जाएगा और आप सीधे होम स्क्रीन पर लौट जाएंगे।'
                : 'Are you sure you want to exit? Your battle progress will be cancelled and you will return to Home.'}
            </p>

            <div className="grid grid-cols-2 gap-2.5 w-full">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-gaming font-bold transition-all"
              >
                {lang === 'hi' ? 'जारी रखें' : 'Continue Battle'}
              </button>

              <button
                onClick={() => {
                  setShowQuitConfirm(false);
                  onQuitBattle();
                }}
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-gaming font-black shadow-lg shadow-rose-900/40 transition-all active:scale-95"
              >
                {lang === 'hi' ? 'हाँ, छोड़ें' : 'Quit & Return Home'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
