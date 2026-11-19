import React, { useState } from 'react';
import { Swords, Target, Shield, Flame, BookOpen, ChevronRight, Zap } from 'lucide-react';

interface BattleHubViewProps {
  onStartBattle: (examId: string, subjectId: string) => void;
  isSearching: boolean;
  onCancelSearch: () => void;
}

export const BattleHubView: React.FC<BattleHubViewProps> = ({
  onStartBattle,
  isSearching,
  onCancelSearch
}) => {
  const exams = [
    { id: 'exam-cgl', name: 'SSC CGL', category: 'Graduate Level', icon: '🏛️' },
    { id: 'exam-chsl', name: 'SSC CHSL', category: '10+2 Level', icon: '📜' },
    { id: 'exam-cpo', name: 'SSC CPO', category: 'Police SI', icon: '🛡️' },
    { id: 'exam-gd', name: 'SSC GD', category: 'Constable', icon: '🎯' },
    { id: 'exam-banking', name: 'Banking (IBPS/SBI)', category: 'PO & Clerk', icon: '🏦' },
    { id: 'exam-railway', name: 'Railway (RRB)', category: 'NTPC & Group D', icon: '🚆' },
    { id: 'exam-state', name: 'State Government', category: 'PCS & Police', icon: '📍' },
  ];

  const subjects = [
    { id: 'all', name: 'All Subjects (Full Mock)', icon: '⚡', desc: 'Mixed questions from all sections' },
    { id: 'sub-math', name: 'Mathematics (Quant)', icon: '📐', desc: 'Arithmetic, Algebra, Geometry' },
    { id: 'sub-reasoning', name: 'Reasoning Ability', icon: '🧩', desc: 'Logic, Syllogisms, Analogies' },
    { id: 'sub-english', name: 'English Language', icon: '📖', desc: 'Vocab, Grammar, Comprehension' },
    { id: 'sub-gk', name: 'General Awareness', icon: '🌍', desc: 'Polity, History, Science, GK' },
  ];

  const [selectedExam, setSelectedExam] = useState<string>('exam-cgl');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 pb-24 flex flex-col gap-5">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-gaming font-black text-2xl text-white flex items-center gap-2">
            <Swords className="w-6 h-6 text-indigo-400" />
            BATTLE ARENA LOBBY
          </h1>
          <p className="text-xs text-slate-400">Configure your target exam & subject battle</p>
        </div>
      </div>

      {/* 1. Exam Selection Cards */}
      <div>
        <label className="text-xs font-gaming font-bold text-slate-300 uppercase tracking-wider block mb-2">
          Step 1: Choose Target Examination
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {exams.map((ex) => {
            const isSelected = selectedExam === ex.id;
            return (
              <button
                key={ex.id}
                onClick={() => setSelectedExam(ex.id)}
                className={`p-3 rounded-2xl border text-left transition-all duration-150 ${
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
          Step 2: Choose Battle Subject
        </label>
        <div className="space-y-2">
          {subjects.map((sub) => {
            const isSelected = selectedSubject === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => setSelectedSubject(sub.id)}
                className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all duration-150 ${
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

      {/* Action CTA */}
      <div className="pt-2">
        {isSearching ? (
          <button
            onClick={onCancelSearch}
            className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-gaming font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-rose-900/50 animate-pulse transition-all"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span>Finding Compatible Rival... (Click to Cancel)</span>
          </button>
        ) : (
          <button
            onClick={() => onStartBattle(selectedExam, selectedSubject === 'all' ? '' : selectedSubject)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-purple-500 text-white font-gaming font-black text-lg flex items-center justify-center gap-2 shadow-xl shadow-indigo-900/50 active:scale-98 transition-all"
          >
            <Swords className="w-5 h-5" />
            <span>START 1V1 SUBJECT BATTLE</span>
          </button>
        )}
      </div>
    </div>
  );
};
