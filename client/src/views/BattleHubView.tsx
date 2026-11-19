import React, { useState } from 'react';
import { Swords, Target, Shield, Flame, BookOpen, ChevronRight, Zap, ArrowLeft, Clock, HelpCircle, Users, Sliders } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface BattleHubViewProps {
  onStartBattle: (examId: string, subjectId: string, customOptions?: { questionCount?: number; timeLimitSeconds?: number; playerCount?: number }) => void;
  isSearching: boolean;
  onCancelSearch: () => void;
  onNavigateTab?: (tab: any) => void;
}

export const BattleHubView: React.FC<BattleHubViewProps> = ({
  onStartBattle,
  isSearching,
  onCancelSearch,
  onNavigateTab
}) => {
  const { lang } = useAuth();

  const exams = [
    { id: 'exam-cgl', name: 'SSC CGL', category: lang === 'hi' ? 'स्नातक स्तर' : 'Graduate Level', icon: '🏛️' },
    { id: 'exam-chsl', name: 'SSC CHSL', category: lang === 'hi' ? '10+2 स्तर' : '10+2 Level', icon: '📜' },
    { id: 'exam-cpo', name: 'SSC CPO', category: lang === 'hi' ? 'पुलिस सब-इंस्पेक्टर' : 'Police SI', icon: '🛡️' },
    { id: 'exam-gd', name: 'SSC GD', category: lang === 'hi' ? 'जीडी कांस्टेबल' : 'Constable', icon: '🎯' },
    { id: 'exam-banking', name: 'Banking (IBPS/SBI)', category: lang === 'hi' ? 'पीओ व क्लर्क' : 'PO & Clerk', icon: '🏦' },
    { id: 'exam-railway', name: 'Railway (RRB)', category: lang === 'hi' ? 'एनटीपीसी व ग्रुप डी' : 'NTPC & Group D', icon: '🚆' },
    { id: 'exam-state', name: 'State Government', category: lang === 'hi' ? 'राज्य पीसीएस व पुलिस' : 'PCS & Police', icon: '📍' },
  ];

  const subjects = [
    { id: 'all', name: lang === 'hi' ? 'सभी विषय (संपूर्ण मॉक)' : 'All Subjects (Full Mock)', icon: '⚡', desc: lang === 'hi' ? 'सभी खंडों से मिश्रित प्रश्न' : 'Mixed questions from all sections' },
    { id: 'sub-math', name: lang === 'hi' ? 'गणित (मात्रात्मक रुझान)' : 'Mathematics (Quant)', icon: '📐', desc: lang === 'hi' ? 'अंकगणित, बीजगणित, ज्यामिति' : 'Arithmetic, Algebra, Geometry' },
    { id: 'sub-reasoning', name: lang === 'hi' ? 'तर्कशक्ति (रीजनिंग)' : 'Reasoning Ability', icon: '🧩', desc: lang === 'hi' ? 'तर्क, न्यायवाक्य, सादृश्य' : 'Logic, Syllogisms, Analogies' },
    { id: 'sub-english', name: lang === 'hi' ? 'अंग्रेजी भाषा' : 'English Language', icon: '📖', desc: lang === 'hi' ? 'शब्दावली, व्याकरण, समझ' : 'Vocab, Grammar, Comprehension' },
    { id: 'sub-gk', name: lang === 'hi' ? 'सामान्य ज्ञान व जागरूकता' : 'General Awareness', icon: '🌍', desc: lang === 'hi' ? 'संविधान, इतिहास, विज्ञान, करंट' : 'Polity, History, Science, GK' },
  ];

  const [selectedExam, setSelectedExam] = useState<string>('exam-cgl');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number>(10);
  const [playerCount, setPlayerCount] = useState<number>(2);

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 pb-24 flex flex-col gap-5">
      {/* Back Button */}
      {onNavigateTab && (
        <div>
          <button
            onClick={() => onNavigateTab('home')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-gaming font-bold transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
            <span>{lang === 'hi' ? '← मुख्य पृष्ठ (Home)' : '← Back to Home'}</span>
          </button>
        </div>
      )}

      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-gaming font-black text-2xl text-white flex items-center gap-2">
            <Swords className="w-6 h-6 text-indigo-400" />
            {lang === 'hi' ? 'बैटल अरेना लॉबी' : 'BATTLE ARENA LOBBY'}
          </h1>
          <p className="text-xs text-slate-400">
            {lang === 'hi' ? 'लक्ष्य परीक्षा व विषय चुनकर 1v1 मुकाबला शुरू करें' : 'Configure your target exam & subject battle'}
          </p>
        </div>
      </div>

      {/* 1. Exam Selection Cards */}
      <div>
        <label className="text-xs font-gaming font-bold text-slate-300 uppercase tracking-wider block mb-2">
          {lang === 'hi' ? 'चरण 1: लक्ष्य परीक्षा चुनें' : 'Step 1: Choose Target Examination'}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {exams.map((ex) => {
            const isSelected = selectedExam === ex.id;
            return (
              <button
                key={ex.id}
                onClick={() => setSelectedExam(ex.id)}
                className={`p-3 rounded-2xl border text-left transition-all duration-150 active:scale-95 ${
                  isSelected
                    ? 'bg-indigo-950/80 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                    : 'bg-arena-card border-arena-border hover:bg-slate-800/80'
                }`}
              >
                <div className="text-xl mb-1">{ex.icon}</div>
                <div className="font-gaming font-bold text-sm text-white">{ex.name}</div>
                <div className="text-[10px] text-slate-400">{ex.category}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Subject Selection */}
      <div>
        <label className="text-xs font-gaming font-bold text-slate-300 uppercase tracking-wider block mb-2">
          {lang === 'hi' ? 'चरण 2: मुकाबला विषय चुनें' : 'Step 2: Choose Battle Subject'}
        </label>
        <div className="space-y-2">
          {subjects.map((sub) => {
            const isSelected = selectedSubject === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => setSelectedSubject(sub.id)}
                className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all duration-150 active:scale-98 ${
                  isSelected
                    ? 'bg-cyan-950/70 border-cyan-500 shadow-md ring-1 ring-cyan-500/50 text-white'
                    : 'bg-arena-card border-arena-border hover:bg-slate-800/80 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{sub.icon}</div>
                  <div>
                    <div className="font-gaming font-bold text-sm text-white">{sub.name}</div>
                    <div className="text-[10px] text-slate-400">{sub.desc}</div>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  isSelected ? 'border-cyan-400 bg-cyan-500 text-slate-950 font-bold text-xs' : 'border-slate-600'
                }`}>
                  {isSelected ? '✓' : ''}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Custom Match Rules (Questions, Time, Players) */}
      <div className="bg-arena-card border border-arena-border rounded-2xl p-4 shadow-lg space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span className="font-gaming font-bold text-sm text-white uppercase tracking-wider">
              {lang === 'hi' ? 'चरण 3: कस्टम नियम (Custom Rules)' : 'Step 3: Custom Match Rules'}
            </span>
          </div>
          <span className="text-[11px] font-gaming font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded-lg">
            {questionCount} Qs · {timeLimitSeconds}s · {playerCount === 2 ? '1v1' : `${playerCount}P`}
          </span>
        </div>

        {/* Question Count Selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              {lang === 'hi' ? 'प्रश्नों की संख्या (Questions)' : 'Question Count'}
            </label>
            <span className="text-xs font-gaming font-bold text-cyan-400">{questionCount} Qs</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[5, 10, 15, 20].map(num => (
              <button
                type="button"
                key={num}
                onClick={() => setQuestionCount(num)}
                className={`py-2 rounded-xl font-gaming font-bold text-xs border transition-all active:scale-95 ${
                  questionCount === num
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-900/40'
                    : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {num} Qs
              </button>
            ))}
          </div>
        </div>

        {/* Time per Question Selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              {lang === 'hi' ? 'प्रति प्रश्न समय (Time Limit)' : 'Time per Question'}
            </label>
            <span className="text-xs font-gaming font-bold text-amber-400">{timeLimitSeconds}s</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[10, 15, 20, 30].map(sec => (
              <button
                type="button"
                key={sec}
                onClick={() => setTimeLimitSeconds(sec)}
                className={`py-2 rounded-xl font-gaming font-bold text-xs border transition-all active:scale-95 ${
                  timeLimitSeconds === sec
                    ? 'bg-amber-600 border-amber-500 text-white shadow-md shadow-amber-900/40'
                    : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>

        {/* Players Selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              {lang === 'hi' ? 'खिलाड़ी संख्या (Players)' : 'Match Size / Players'}
            </label>
            <span className="text-xs font-gaming font-bold text-cyan-400">
              {playerCount === 2 ? '1v1 Duel' : `${playerCount} Players`}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { count: 2, label: '1v1 Duel' },
              { count: 3, label: '3 Trio' },
              { count: 4, label: '4 Squad' },
              { count: 6, label: '6 Battle' }
            ].map(opt => (
              <button
                type="button"
                key={opt.count}
                onClick={() => setPlayerCount(opt.count)}
                className={`py-2 rounded-xl font-gaming font-bold text-xs border transition-all active:scale-95 ${
                  playerCount === opt.count
                    ? 'bg-cyan-600 border-cyan-500 text-white shadow-md shadow-cyan-900/40'
                    : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action CTA */}
      <div className="pt-2">
        {isSearching ? (
          <button
            onClick={onCancelSearch}
            className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-gaming font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-rose-900/50 animate-pulse transition-all"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span>{lang === 'hi' ? 'प्रतिद्वंद्वी खोज जारी है... (रद्द करें)' : 'Finding Compatible Rival... (Click to Cancel)'}</span>
          </button>
        ) : (
          <button
            onClick={() => onStartBattle(
              selectedExam,
              selectedSubject === 'all' ? '' : selectedSubject,
              { questionCount, timeLimitSeconds, playerCount }
            )}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-purple-500 text-white font-gaming font-black text-lg flex items-center justify-center gap-2 shadow-xl shadow-indigo-900/50 active:scale-98 transition-all"
          >
            <Swords className="w-5 h-5" />
            <span>
              {lang === 'hi'
                ? `⚔️ मुकाबला शुरू करें (${questionCount}Q · ${timeLimitSeconds}s · ${playerCount === 2 ? '1v1' : `${playerCount}P`})`
                : `START BATTLE (${questionCount}Q · ${timeLimitSeconds}s · ${playerCount === 2 ? '1v1' : `${playerCount}P`})`}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
