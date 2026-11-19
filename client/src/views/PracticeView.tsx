import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Question } from '../types';
import { BUNDLED_QUESTIONS } from '../data/bundledQuestions';
import { sound } from '../sound/soundEngine';
import {
  BookOpen, CheckCircle2, XCircle, ArrowRight, ArrowLeft,
  RefreshCw, Globe, Sparkles, Award, Shuffle, ChevronLeft, ChevronRight, Target,
  Bookmark, Search, X
} from 'lucide-react';

interface PracticeViewProps {
  onNavigateTab?: (tab: any) => void;
}

export const PracticeView: React.FC<PracticeViewProps> = ({ onNavigateTab }) => {
  const { user, lang, setLang, refreshUser } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterExam, setFilterExam] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showBookmarksOnly, setShowBookmarksOnly] = useState<boolean>(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('exam_arena_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [stats, setStats] = useState({ correct: 0, total: 0 });

  const toggleBookmark = (id: string) => {
    setBookmarkedIds(prev => {
      let next: string[];
      if (prev.includes(id)) {
        next = prev.filter(bId => bId !== id);
      } else {
        next = [...prev, id];
        sound.playMatchFound();
      }
      localStorage.setItem('exam_arena_bookmarks', JSON.stringify(next));
      return next;
    });
  };

  const isBookmarked = (id: string) => bookmarkedIds.includes(id);

  const examFilters = [
    { id: 'all', label: lang === 'hi' ? 'सभी 2025 परीक्षाएं' : 'All 2025 Exams', icon: '⚡' },
    { id: 'exam-cgl', label: 'SSC CGL 2025', icon: '🏛️' },
    { id: 'exam-chsl', label: 'SSC CHSL 2025', icon: '📜' },
    { id: 'exam-cpo', label: 'SSC CPO 2025', icon: '🛡️' },
  ];

  const subjectFilters = [
    { id: 'all', label: lang === 'hi' ? 'सभी विषय' : 'All Subjects', icon: '✨' },
    { id: 'sub-math', label: lang === 'hi' ? 'गणित (Quant)' : 'Mathematics', icon: '📐' },
    { id: 'sub-reasoning', label: lang === 'hi' ? 'तर्कशक्ति (Reasoning)' : 'Reasoning', icon: '🧩' },
    { id: 'sub-english', label: lang === 'hi' ? 'अंग्रेजी (English)' : 'English', icon: '📖' },
    { id: 'sub-gk', label: lang === 'hi' ? 'सामान्य ज्ञान (GK/GS)' : 'General Awareness', icon: '🌍' },
  ];

  const fetchPracticeQuestions = async () => {
    setLoading(true);
    setSelectedOption(null);
    setCurrentIndex(0);

    try {
      let url = '/api/questions/practice?limit=100';
      if (filterExam && filterExam !== 'all') url += `&examId=${filterExam}`;
      if (filterSubject && filterSubject !== 'all') url += `&subjectId=${filterSubject}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Practice API fallback to bundled questions:', err);
    }

    // Client-side fallback from BUNDLED_QUESTIONS
    let pool = [...BUNDLED_QUESTIONS];
    if (filterExam && filterExam !== 'all') {
      pool = pool.filter(q => q.exam_id === filterExam);
    }
    if (filterSubject && filterSubject !== 'all') {
      pool = pool.filter(q => q.subject_id === filterSubject);
    }

    setQuestions(pool);
    setLoading(false);
  };

  useEffect(() => {
    fetchPracticeQuestions();
  }, [filterExam, filterSubject]);

  useEffect(() => {
    setCurrentIndex(0);
    setSelectedOption(null);
  }, [searchTerm, showBookmarksOnly]);

  const displayedQuestions = questions.filter(q => {
    if (showBookmarksOnly && !bookmarkedIds.includes(q.id)) {
      return false;
    }
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      const matchEn = q.question_en?.toLowerCase().includes(s);
      const matchHi = q.question_hi?.toLowerCase().includes(s);
      const matchTopic = q.topic_id?.toLowerCase().includes(s);
      const matchPyq = q.pyq_source?.toLowerCase().includes(s);
      return Boolean(matchEn || matchHi || matchTopic || matchPyq);
    }
    return true;
  });

  const currentQ = displayedQuestions[currentIndex] || null;

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
    if (currentIndex < displayedQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
    } else {
      setCurrentIndex(0);
      setSelectedOption(null);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedOption(null);
    }
  };

  const handleShuffle = () => {
    if (displayedQuestions.length === 0) return;
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
    setCurrentIndex(0);
    setSelectedOption(null);
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
      {/* 0. Top Navigation & Header */}
      <div className="flex items-center justify-between">
        {onNavigateTab ? (
          <button
            onClick={() => onNavigateTab('home')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-gaming font-bold transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
            <span>{lang === 'hi' ? '← मुख्य पृष्ठ (Home)' : '← Back to Home'}</span>
          </button>
        ) : <div />}

        {/* Global Language Toggle */}
        <button
          onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-700 text-xs font-bold transition-colors shadow-sm"
        >
          <Globe className="w-3.5 h-3.5 text-indigo-400" />
          <span>{lang === 'en' ? 'हिन्दी में बदलें' : 'Switch to English'}</span>
        </button>
      </div>

      {/* 1. Practice Title & Accuracy Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-gaming font-black text-2xl text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-400" />
            {lang === 'hi' ? '2025 PYQ अभ्यास ड्रिल' : '2025 PYQ PRACTICE DRILL'}
          </h1>
          <p className="text-xs text-slate-400">
            {lang === 'hi'
              ? 'SSC CGL, CHSL, CPO 2025 के प्रामाणिक प्रश्न विषयवार अभ्यास करें'
              : 'Untimed practice of SSC CGL, CHSL, CPO 2025 with bilingual explanations'}
          </p>
        </div>

        {/* Accuracy badge */}
        {stats.total > 0 && (
          <div className="bg-slate-900 border border-slate-700 px-3 py-1 rounded-xl text-xs font-gaming shadow-sm">
            <span className="text-emerald-400 font-bold">{stats.correct}</span>
            <span className="text-slate-500"> / </span>
            <span className="text-slate-300 font-bold">{stats.total}</span>
            <span className="text-slate-400 text-[10px] ml-1">
              ({Math.round((stats.correct / stats.total) * 100)}%)
            </span>
          </div>
        )}
      </div>

      {/* 2. Target Examination Filter (SSC CGL 2025, CHSL 2025, CPO 2025) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 shadow-md flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-gaming font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            {lang === 'hi' ? 'परीक्षा चुनें (Exam 2025)' : 'Select Exam (2025 PYQs)'}
          </span>
          <span className="text-[10px] text-cyan-400 font-gaming font-bold bg-cyan-950/70 border border-cyan-800/80 px-2 py-0.5 rounded-full">
            {questions.length} {lang === 'hi' ? 'प्रश्न उपलब्ध' : 'Questions'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {examFilters.map((ex) => {
            const isSelected = filterExam === ex.id;
            return (
              <button
                key={ex.id}
                onClick={() => setFilterExam(ex.id)}
                className={`py-2 px-2.5 rounded-xl border text-xs font-gaming font-bold flex items-center justify-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md ring-1 ring-indigo-400/40'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{ex.icon}</span>
                <span className="truncate">{ex.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Subject-Wise Filter Pills & Revision Deck */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <label className="text-[11px] font-gaming font-bold text-slate-400 uppercase tracking-wider block">
            {lang === 'hi' ? 'विषय चुनें (Subject-wise Filter)' : 'Filter by Subject'}
          </label>

          {/* Revision Deck Toggle Pill */}
          <button
            onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
            className={`px-2.5 py-1 rounded-xl border text-[11px] font-gaming font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${
              showBookmarksOnly
                ? 'bg-amber-500 border-amber-400 text-slate-950 ring-2 ring-amber-500/30 font-black'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-amber-500/40 text-amber-300'
            }`}
          >
            <Bookmark className={`w-3 h-3 ${showBookmarksOnly ? 'fill-slate-950 text-slate-950' : 'fill-amber-400/40 text-amber-400'}`} />
            <span>{lang === 'hi' ? `रिवीजन डेक (${bookmarkedIds.length})` : `Revision Deck (${bookmarkedIds.length})`}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-medium no-scrollbar">
          {subjectFilters.map((sub) => {
            const isSelected = filterSubject === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => setFilterSubject(sub.id)}
                className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <span>{sub.icon}</span>
                <span>{sub.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Instant Search Keyword Filter */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={lang === 'hi' ? 'प्रश्न या टॉपिक खोजें (उदा: Percentage, Syllogism, Blood Relation)...' : 'Search topic, question, or PYQ keywords...'}
          className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl pl-8 pr-7 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
            title="Clear Search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 5. Question Drill View */}
      {loading ? (
        <div className="bg-arena-card border border-arena-border rounded-2xl p-8 flex flex-col items-center justify-center text-center">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
          <p className="text-sm text-slate-300 font-gaming">Loading 2025 PYQ questions...</p>
        </div>
      ) : !currentQ ? (
        <div className="bg-arena-card border border-arena-border rounded-2xl p-8 text-center flex flex-col items-center">
          <p className="text-sm text-slate-300 font-medium mb-1">
            {showBookmarksOnly
              ? (lang === 'hi' ? 'रिवीजन डेक में कोई प्रश्न सहेजा नहीं गया है।' : 'No questions in your Revision Deck yet.')
              : (lang === 'hi' ? 'इस फिल्टर से मेल खाता कोई प्रश्न नहीं मिला।' : 'No questions found matching this filter.')}
          </p>
          <p className="text-xs text-slate-500 mb-4 max-w-xs">
            {showBookmarksOnly
              ? (lang === 'hi' ? 'किसी भी प्रश्न पर बुकमार्क आइकन दबाकर उसे रिवीजन डेक में जोड़ें।' : 'Tap the bookmark icon on any tricky question to save it for quick revision before exams!')
              : (lang === 'hi' ? 'कृपया खोज शब्द हटाएं या फिल्टर रीसेट करें।' : 'Try clearing your search term or resetting the exam/subject filters.')}
          </p>
          <button
            onClick={() => {
              setFilterExam('all');
              setFilterSubject('all');
              setSearchTerm('');
              setShowBookmarksOnly(false);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-gaming font-bold shadow-md transition-colors"
          >
            {lang === 'hi' ? 'सभी प्रश्न व फिल्टर रीसेट करें' : 'Reset All Filters'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Question Navigator Toolbar */}
          <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 px-3 py-2 rounded-xl text-xs">
            <div className="flex items-center gap-2">
              <span className="font-gaming font-bold text-white text-xs">
                {lang === 'hi' ? 'प्रश्न' : 'Q'} {currentIndex + 1} / {displayedQuestions.length}
              </span>
              <span className="text-[11px] text-slate-500">•</span>
              <span className="text-[11px] text-cyan-400 font-semibold truncate max-w-[140px] sm:max-w-xs">
                {currentQ.topic_id?.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 border border-slate-700 transition-colors"
                title="Previous Question"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={handleShuffle}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                title="Shuffle Questions"
              >
                <Shuffle className="w-4 h-4 text-purple-400" />
              </button>

              <button
                onClick={handleNext}
                disabled={currentIndex === displayedQuestions.length - 1}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 border border-slate-700 transition-colors"
                title="Next Question"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Question Card */}
          <div className="bg-arena-card border border-arena-border rounded-2xl p-4 sm:p-5 shadow-xl relative">
            <div className="flex items-center justify-between mb-3 text-xs flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-lg font-gaming font-bold text-[11px] shadow-sm">
                  {currentQ.pyq_source || 'SSC 2025 PYQ'}
                </span>
                <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-lg text-[10px] uppercase font-bold">
                  {currentQ.difficulty}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-indigo-400 font-gaming">
                  {currentQ.exam_id === 'exam-cgl' ? '🏛️ CGL' : currentQ.exam_id === 'exam-chsl' ? '📜 CHSL' : '🛡️ CPO'}
                </span>

                {/* Bookmark Toggle Button */}
                <button
                  onClick={() => toggleBookmark(currentQ.id)}
                  className={`p-1.5 rounded-lg border transition-all active:scale-90 ${
                    isBookmarked(currentQ.id)
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-sm shadow-amber-500/20'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                  title={isBookmarked(currentQ.id) ? (lang === 'hi' ? 'बुकमार्क हटाएं' : 'Remove Bookmark') : (lang === 'hi' ? 'रिवीजन के लिए बुकमार्क करें' : 'Bookmark Question')}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isBookmarked(currentQ.id) ? 'fill-amber-400 text-amber-400' : ''}`} />
                </button>
              </div>
            </div>

            <h2 className="text-sm sm:text-base font-semibold text-slate-100 leading-relaxed min-h-[3rem]">
              {lang === 'hi' ? (currentQ.question_hi || currentQ.question_en) : currentQ.question_en}
            </h2>
          </div>

          {/* 4 Interactive Options */}
          <div className="grid grid-cols-1 gap-2.5">
            {[0, 1, 2, 3].map((optIdx) => {
              const isSelected = selectedOption === optIdx;
              const isCorrect = optIdx === currentQ.correct_option;
              const text = getOptionText(currentQ, optIdx);

              let optionStyle = 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-700/80 text-slate-200';

              if (selectedOption !== null) {
                if (isCorrect) {
                  optionStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-md ring-1 ring-emerald-500/40';
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
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all duration-150 active:scale-99 ${optionStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center font-gaming font-bold text-xs text-slate-300">
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

          {/* Detailed Explanation & Forward CTA */}
          {selectedOption !== null && (
            <div className="bg-slate-900/95 border border-indigo-500/30 rounded-2xl p-4 shadow-xl animate-in fade-in duration-200 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                {selectedOption === currentQ.correct_option ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-gaming font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    {lang === 'hi' ? 'सही उत्तर! (+10 XP)' : 'Correct Answer! (+10 XP)'}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-rose-400 font-gaming font-bold text-sm">
                    <XCircle className="w-4 h-4" />
                    {lang === 'hi' ? 'गलत उत्तर (+3 अभ्यास XP)' : 'Incorrect (+3 Practice XP)'}
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-200 bg-slate-950 p-3.5 rounded-xl border border-slate-800 leading-relaxed">
                <span className="font-bold text-indigo-300 block mb-1.5 text-xs font-gaming">
                  {lang === 'hi' ? 'विस्तृत समाधान व सूत्र व्याख्या:' : 'Detailed Solution & Formula Explanation:'}
                </span>
                <p className="whitespace-pre-line">
                  {lang === 'hi' ? currentQ.explanation_hi : currentQ.explanation_en}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-gaming font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{lang === 'hi' ? 'पिछला प्रश्न' : 'Previous Question'}</span>
                </button>

                <button
                  onClick={handleNext}
                  className="py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-gaming font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg transition-transform active:scale-95"
                >
                  <span>{lang === 'hi' ? 'अगला प्रश्न' : 'Next Question'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
