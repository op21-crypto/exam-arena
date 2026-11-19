import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Swords, Users, Clock, HelpCircle, X, Zap, Sparkles, Sliders } from 'lucide-react';

export interface CustomBattleConfig {
  examId: string;
  subjectId: string;
  questionCount: number;
  timeLimitSeconds: number;
  playerCount: number;
}

interface CustomBattleModalProps {
  onClose: () => void;
  onStartBattle: (config: CustomBattleConfig) => void;
  onCreateFriendRoom: (config: CustomBattleConfig) => void;
}

export const CustomBattleModal: React.FC<CustomBattleModalProps> = ({
  onClose,
  onStartBattle,
  onCreateFriendRoom
}) => {
  const { lang } = useAuth();

  const exams = [
    { id: 'exam-cgl', name: 'SSC CGL', icon: '🏛️' },
    { id: 'exam-chsl', name: 'SSC CHSL', icon: '📜' },
    { id: 'exam-cpo', name: 'SSC CPO', icon: '🛡️' },
    { id: 'exam-gd', name: 'SSC GD', icon: '🎯' },
    { id: 'exam-banking', name: 'Banking', icon: '🏦' },
    { id: 'exam-railway', name: 'Railway', icon: '🚆' },
    { id: 'exam-state', name: 'State PCS', icon: '📍' },
  ];

  const subjects = [
    { id: 'all', name: lang === 'hi' ? 'सभी विषय (मिश्रित)' : 'All Subjects (Full)', icon: '⚡' },
    { id: 'sub-math', name: lang === 'hi' ? 'गणित (Quant)' : 'Mathematics', icon: '📐' },
    { id: 'sub-reasoning', name: lang === 'hi' ? 'तर्कशक्ति (Reasoning)' : 'Reasoning', icon: '🧩' },
    { id: 'sub-english', name: lang === 'hi' ? 'अंग्रेजी (English)' : 'English', icon: '📖' },
    { id: 'sub-gk', name: lang === 'hi' ? 'सामान्य ज्ञान (GK)' : 'General Awareness', icon: '🌍' },
  ];

  const questionOptions = [5, 10, 15, 20];
  const timeOptions = [10, 15, 20, 30];
  const playerOptions = [
    { count: 2, label: '1v1 Duel' },
    { count: 3, label: '3 Trio' },
    { count: 4, label: '4 Squad' },
    { count: 6, label: '6 Battle' }
  ];

  const [selectedExam, setSelectedExam] = useState<string>('exam-cgl');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number>(10);
  const [playerCount, setPlayerCount] = useState<number>(2);

  const currentConfig: CustomBattleConfig = {
    examId: selectedExam,
    subjectId: selectedSubject,
    questionCount,
    timeLimitSeconds,
    playerCount
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-arena-surface border border-arena-border rounded-3xl p-5 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-gaming font-black text-xl text-white tracking-wide flex items-center gap-2">
              <span>{lang === 'hi' ? 'कस्टम बैटल सेटअप' : 'CUSTOM BATTLE SETUP'}</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px]">
                {lang === 'hi' ? 'नया' : 'NEW'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {lang === 'hi'
                ? 'प्रश्नों की संख्या, समय व खिलाड़ियों को अपनी पसंद से सेट करें'
                : 'Customize question count, timer & contestants for quick or friend battles'}
            </p>
          </div>
        </div>

        {/* Custom Configuration Form */}
        <div className="space-y-4">
          {/* 1. Exam & Subject Selection */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-gaming font-bold text-slate-300 uppercase tracking-wider block mb-1">
                {lang === 'hi' ? 'परीक्षा' : 'Target Exam'}
              </label>
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-medium focus:outline-none focus:border-indigo-500"
              >
                {exams.map(e => (
                  <option key={e.id} value={e.id}>{e.icon} {e.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-gaming font-bold text-slate-300 uppercase tracking-wider block mb-1">
                {lang === 'hi' ? 'विषय' : 'Subject'}
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-medium focus:outline-none focus:border-indigo-500"
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Questions Count Customizer */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-gaming font-bold text-slate-200 flex items-center gap-1.5 uppercase">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                {lang === 'hi' ? 'प्रश्नों की संख्या (Questions)' : 'Questions Count'}
              </span>
              <span className="text-xs font-gaming font-bold text-cyan-400">
                {questionCount} {lang === 'hi' ? 'प्रश्न' : 'Questions'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {questionOptions.map(num => (
                <button
                  type="button"
                  key={num}
                  onClick={() => setQuestionCount(num)}
                  className={`py-2 rounded-xl font-gaming font-black text-xs border transition-all active:scale-95 ${
                    questionCount === num
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-400 text-white shadow-md shadow-indigo-900/50 scale-102'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {num} Qs
                </button>
              ))}
            </div>
          </div>

          {/* 3. Time per Question Customizer */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-gaming font-bold text-slate-200 flex items-center gap-1.5 uppercase">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {lang === 'hi' ? 'प्रति प्रश्न समय (Time per Question)' : 'Time per Question'}
              </span>
              <span className="text-xs font-gaming font-bold text-amber-400">
                {timeLimitSeconds} {lang === 'hi' ? 'सेकंड' : 'Seconds'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {timeOptions.map(sec => (
                <button
                  type="button"
                  key={sec}
                  onClick={() => setTimeLimitSeconds(sec)}
                  className={`py-2 rounded-xl font-gaming font-black text-xs border transition-all active:scale-95 ${
                    timeLimitSeconds === sec
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 border-amber-400 text-white shadow-md shadow-amber-900/50 scale-102'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* 4. Players Customizer */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-gaming font-bold text-slate-200 flex items-center gap-1.5 uppercase">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                {lang === 'hi' ? 'खिलाड़ी संख्या (Players)' : 'Number of Players'}
              </span>
              <span className="text-xs font-gaming font-bold text-cyan-400">
                {playerCount === 2 ? (lang === 'hi' ? '1v1 मुकाबला' : '1v1 Head-to-Head') : `${playerCount} ${lang === 'hi' ? 'खिलाड़ी' : 'Contestants'}`}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {playerOptions.map(opt => (
                <button
                  type="button"
                  key={opt.count}
                  onClick={() => setPlayerCount(opt.count)}
                  className={`py-2 rounded-xl font-gaming font-bold text-xs border transition-all active:scale-95 ${
                    playerCount === opt.count
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-400 text-white shadow-md shadow-cyan-900/50 scale-102'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Configuration Summary Badge */}
          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>{lang === 'hi' ? 'कस्टम नियम:' : 'Custom Rule:'}</span>
            </div>
            <span className="font-gaming font-bold text-cyan-300">
              {questionCount} Qs · {timeLimitSeconds}s / Q · {playerCount} Players
            </span>
          </div>

          {/* Action CTAs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* 1. Quick / Random Play with these rules */}
            <button
              onClick={() => {
                onClose();
                onStartBattle(currentConfig);
              }}
              className="py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-gaming font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-950/50 active:scale-95 transition-all"
            >
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>{lang === 'hi' ? 'रैंडम मैच खेलें' : 'PLAY RANDOM MATCH'}</span>
            </button>

            {/* 2. Create Friend Room with these rules */}
            <button
              onClick={() => {
                onClose();
                onCreateFriendRoom(currentConfig);
              }}
              className="py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-gaming font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-purple-950/50 active:scale-95 transition-all"
            >
              <Users className="w-4 h-4" />
              <span>{lang === 'hi' ? 'दोस्तों के साथ खेलें' : 'PLAY WITH FRIENDS'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
