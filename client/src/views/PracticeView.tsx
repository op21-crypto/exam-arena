import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Question } from '../types';
import { sound } from '../sound/soundEngine';
import { BookOpen, CheckCircle2, XCircle, ArrowRight, RefreshCw, Globe, Sparkles, Award } from 'lucide-react';

export const PracticeView: React.FC = () => {
  const { user, lang, setLang, refreshUser } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterSubject, setFilterSubject] = useState<string>('');
  const [stats, setStats] = useState({ correct: 0, total: 0 });

  const fetchPracticeQuestions = async () => {
    setLoading(true);
    setSelectedOption(null);
    setCurrentIndex(0);
    try {
      let url = '/api/questions/practice?limit=15';
      if (filterSubject) url += `&subjectId=${filterSubject}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      }
    } catch (err) {
      console.error('Error fetching practice questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPracticeQuestions();
  }, [filterSubject]);

  const currentQ = questions[currentIndex];

  const handleSelect = async (optIdx: number) => {
    if (selectedOption !== null || !currentQ) return;
    setSelectedOption(optIdx);

    const isCorrect = optIdx === currentQ.correct_option;
    if (isCorrect) {
      sound.playCorrect();
    } else {
      sound.playIncorrect();
    }

    const nextCorrect = stats.correct + (isCorrect ? 1 : 0);
    const nextTotal = stats.total + 1;
    setStats({ correct: nextCorrect, total: nextTotal });

    // Submit practice attempt to backend for daily mission tracking
    if (user) {
      fetch('/api/questions/practice-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, totalAnswered: 1, correctCount: isCorrect ? 1 : 0 })
      }).then(() => refreshUser()).catch(console.error);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
    } else {
      // Reload fresh questions
      fetchPracticeQuestions();
    }
  };

  const letters = ['A', 'B', 'C', 'D'];

  const getOptionText = (q: Question, idx: number) => {
    if (lang === 'hi') {
      if (idx === 0) return q.option_a_hi || q.option_a_en;
      if (idx === 1) return q.option_b_hi || q.option_b_en;
      if (idx === 2) return q.option_c_hi || q.option_c_en;
      return q.option_d_hi || q.option_d_en;
    }
    if (idx === 0) return q.option_a_en;
    if (idx === 1) return q.option_b_en;
    if (idx === 2) return q.option_c_en;
    return q.option_d_en;
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 pb-24 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-gaming font-black text-2xl text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-400" />
            PRACTICE DRILL
          </h1>
          <p className="text-xs text-slate-400">Untimed practice with comprehensive bilingual explanations</p>
        </div>

        {/* Accuracy counter */}
        {stats.total > 0 && (
          <div className="bg-slate-900 border border-slate-700 px-3 py-1 rounded-xl text-xs font-gaming">
            <span className="text-emerald-400 font-bold">{stats.correct}</span>
            <span className="text-slate-500"> / </span>
            <span className="text-slate-300 font-bold">{stats.total}</span>
            <span className="text-slate-400 text-[10px] ml-1">
              ({Math.round((stats.correct / stats.total) * 100)}%)
            </span>
          </div>
        )}
      </div>

      {/* Subject Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-medium no-scrollbar">
        <button
          onClick={() => setFilterSubject('')}
          className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-colors ${
            filterSubject === ''
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          All Subjects
        </button>
        <button
          onClick={() => setFilterSubject('sub-math')}
          className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-colors ${
            filterSubject === 'sub-math'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          Mathematics
        </button>
        <button
          onClick={() => setFilterSubject('sub-reasoning')}
          className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-colors ${
            filterSubject === 'sub-reasoning'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          Reasoning
        </button>
        <button
          onClick={() => setFilterSubject('sub-english')}
          className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-colors ${
            filterSubject === 'sub-english'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          English
        </button>
        <button
          onClick={() => setFilterSubject('sub-gk')}
          className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-colors ${
            filterSubject === 'sub-gk'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          General Awareness
        </button>
      </div>

      {loading ? (
        <div className="bg-arena-card border border-arena-border rounded-2xl p-8 flex flex-col items-center justify-center text-center">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
          <p className="text-sm text-slate-300 font-gaming">Loading practice questions...</p>
        </div>
      ) : !currentQ ? (
        <div className="bg-arena-card border border-arena-border rounded-2xl p-8 text-center">
          <p className="text-sm text-slate-400">No questions available for this filter.</p>
          <button
            onClick={() => fetchPracticeQuestions()}
            className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-gaming font-bold"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Question Card */}
          <div className="bg-arena-card border border-arena-border rounded-2xl p-4 sm:p-5 shadow-xl relative">
            <div className="flex items-center justify-between mb-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                  {currentQ.pyq_source || 'Official PYQ'}
                </span>
                <span className="text-[11px] text-slate-400 capitalize">
                  {currentQ.difficulty}
                </span>
              </div>

              <button
                onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'हिन्दी' : 'English'}</span>
              </button>
            </div>

            <h2 className="text-sm sm:text-base font-medium text-slate-100 leading-relaxed min-h-[3rem]">
              {lang === 'hi' ? (currentQ.question_hi || currentQ.question_en) : currentQ.question_en}
            </h2>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 gap-2.5">
            {[0, 1, 2, 3].map((optIdx) => {
              const isSelected = selectedOption === optIdx;
              const isCorrect = optIdx === currentQ.correct_option;
              const text = getOptionText(currentQ, optIdx);

              let optionStyle = 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-700/80 text-slate-200';

              if (selectedOption !== null) {
                if (isCorrect) {
                  optionStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 neon-border-blue';
                } else if (isSelected) {
                  optionStyle = 'bg-rose-950/80 border-rose-500 text-rose-200';
                } else {
                  optionStyle = 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60';
                }
              }

              return (
                <button
                  key={optIdx}
                  onClick={() => handleSelect(optIdx)}
                  disabled={selectedOption !== null}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all duration-150 ${optionStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center font-gaming font-bold text-xs text-slate-400">
                      {letters[optIdx]}
                    </span>
                    <span className="text-xs sm:text-sm font-medium">{text}</span>
                  </div>

                  {selectedOption !== null && (
                    isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : isSelected ? (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    ) : null
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation & Next button */}
          {selectedOption !== null && (
            <div className="bg-slate-900/95 border border-indigo-500/30 rounded-2xl p-4 shadow-xl animate-in fade-in duration-200 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                {selectedOption === currentQ.correct_option ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-gaming font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4" /> Correct Answer! (+10 XP)
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-rose-400 font-gaming font-bold text-sm">
                    <XCircle className="w-4 h-4" /> Incorrect (+3 Practice XP)
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 leading-relaxed">
                <span className="font-bold text-indigo-300 block mb-1">
                  {lang === 'hi' ? 'विस्तृत समाधान:' : 'Detailed Explanation:'}
                </span>
                {lang === 'hi' ? currentQ.explanation_hi : currentQ.explanation_en}
              </div>

              <button
                onClick={handleNext}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-gaming font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                <span>Next Practice Question</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
