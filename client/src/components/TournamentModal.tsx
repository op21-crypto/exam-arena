import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { sound } from '../sound/soundEngine';
import { Trophy, Calendar, Award, Zap, Users, CheckCircle, X, Shield, Sparkles } from 'lucide-react';

interface TournamentModalProps {
  onClose: () => void;
  lang: 'en' | 'hi';
}

export const TournamentModal: React.FC<TournamentModalProps> = ({ onClose, lang }) => {
  const [registered, setRegistered] = useState<boolean>(() => {
    return localStorage.getItem('exam_arena_tournament_registered') === 'true';
  });

  const handleRegister = () => {
    setRegistered(true);
    localStorage.setItem('exam_arena_tournament_registered', 'true');
    sound.playVictory();
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/90 backdrop-blur-xl p-3 sm:p-4 flex items-center justify-center animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-arena-surface border border-indigo-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center mb-3 shadow-xl shadow-amber-500/20">
            <Trophy className="w-9 h-9 text-white animate-bounce" />
          </div>

          <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-gaming font-extrabold uppercase tracking-widest mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {lang === 'hi' ? 'अखिल भारतीय सरकारी परीक्षा चैंपियनशिप' : 'ALL-INDIA CHAMPIONSHIP'}
          </span>

          <h2 className="font-gaming font-black text-2xl sm:text-3xl text-white tracking-wide">
            {lang === 'hi' ? 'मेगा एरिना टूर्नामेंट 2026' : 'MEGA ARENA CUP 2026'}
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-sm">
            {lang === 'hi'
              ? 'देशभर के शीर्ष अभ्यार्थियों के साथ लाइव नॉकआउट मुकाबला। 10,000 कॉइन्स और ग्रैंडमास्टर ताज जीतें।'
              : 'Compete in live knockout battles against top aspirants nationwide. Win 10,000 coins & Grandmaster glory.'}
          </p>
        </div>

        {/* Tournament Highlights */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-gaming uppercase">
                {lang === 'hi' ? 'पुरस्कार राशि' : 'Prize Pool'}
              </span>
              <span className="font-gaming font-black text-sm text-amber-300">
                10,000 Coins + Title
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-gaming uppercase">
                {lang === 'hi' ? 'समय और तारीख' : 'Date & Time'}
              </span>
              <span className="font-gaming font-bold text-xs text-white">
                Sunday, 8:00 PM IST
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-gaming uppercase">
                {lang === 'hi' ? 'कुल प्रतिभागी' : 'Contestants'}
              </span>
              <span className="font-gaming font-bold text-xs text-purple-300">
                1,420 Enrolled
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-gaming uppercase">
                {lang === 'hi' ? 'प्रारूप' : 'Format'}
              </span>
              <span className="font-gaming font-bold text-xs text-emerald-300">
                4 Knockout Rounds
              </span>
            </div>
          </div>
        </div>

        {/* Format Details */}
        <div className="mt-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 text-xs text-slate-300 space-y-1.5">
          <div className="font-gaming font-bold text-indigo-400 uppercase tracking-wider text-[11px] mb-1">
            {lang === 'hi' ? 'टूर्नामेंट नियम व संरचना' : 'TOURNAMENT STRUCTURE'}
          </div>
          <p className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">•</span>
            {lang === 'hi' ? 'राउंड 1: प्रारंभिक 10 प्रश्न (शीर्ष 50% अगले चरण में)' : 'Round 1: Preliminary 10 Qs (Top 50% advance)'}
          </p>
          <p className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">•</span>
            {lang === 'hi' ? 'क्वार्टर व सेमी-फाइनल: 1v1 रैपिड स्पीड बैटल' : 'Quarter & Semi-Final: 1v1 Rapid Speed Battle'}
          </p>
          <p className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">•</span>
            {lang === 'hi' ? 'ग्रैंड फिनाले: 15 कठिन PYQ प्रश्न + स्पीड बोनस' : 'Grand Finale: 15 Hard PYQ Questions + Speed Bonus'}
          </p>
        </div>

        {/* CTA Button */}
        <div className="mt-5">
          {registered ? (
            <div className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-gaming font-black text-center flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span>{lang === 'hi' ? 'पंजीकरण सफल! रविवार रात 8 बजे तैयार रहें।' : 'REGISTERED! BE READY SUNDAY AT 8 PM'}</span>
            </div>
          ) : (
            <button
              onClick={handleRegister}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-400 hover:via-rose-400 hover:to-indigo-500 text-white font-gaming font-black text-base shadow-xl shadow-amber-900/40 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5 fill-white text-white" />
              <span>{lang === 'hi' ? 'मुफ्त पंजीकरण करें (REGISTER FREE)' : 'REGISTER NOW FOR FREE'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
