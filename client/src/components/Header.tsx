import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { sound } from '../sound/soundEngine';
import { Volume2, VolumeX, Globe, Coins, Shield, User, LogOut, ShieldCheck, Swords } from 'lucide-react';

interface HeaderProps {
  onOpenAuth: () => void;
  onNavigateTab?: (tab: any) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAuth, onNavigateTab }) => {
  const { user, lang, setLang, logout } = useAuth();
  const [soundOn, setSoundOn] = useState(sound.enabled);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const toggleSound = () => {
    const next = !soundOn;
    sound.setEnabled(next);
    setSoundOn(next);
  };

  const getRankBadgeClass = (rank?: string) => {
    switch (rank) {
      case 'Bronze': return 'bg-amber-900/60 text-amber-300 border-amber-700';
      case 'Silver': return 'bg-slate-700/60 text-slate-300 border-slate-500';
      case 'Gold': return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
      case 'Platinum': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
      case 'Diamond': return 'bg-cyan-500/20 text-cyan-300 border-cyan-400/60';
      case 'Master': return 'bg-purple-500/20 text-purple-300 border-purple-400/60';
      case 'Grandmaster': return 'bg-red-500/20 text-red-300 border-red-500/60';
      case 'Legend': return 'bg-yellow-500/30 text-yellow-300 border-yellow-400 animate-pulse';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-arena-surface/90 backdrop-blur-md border-b border-arena-border px-4 py-2.5 shadow-md">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Brand Home Shortcut & User Identity */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Logo to Home */}
          <button
            onClick={() => onNavigateTab && onNavigateTab('home')}
            className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-slate-800/80 transition-colors group shrink-0"
            title="EXAM ARENA — Return to Home"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Swords className="w-4 h-4 text-white" />
            </div>
            <span className="hidden sm:inline font-gaming font-black text-sm text-white tracking-wider">
              EXAM<span className="text-cyan-400">ARENA</span>
            </span>
          </button>

          {/* User Identity & Avatar */}
          <div
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-indigo-500/80 bg-slate-800 p-0.5 shadow-md transition-transform group-hover:scale-105">
                <img
                  src={user?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=Aspirant'}
                  alt={user?.username}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              {/* Online Indicator */}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-gaming font-bold text-sm sm:text-base text-white tracking-wide truncate max-w-[100px] sm:max-w-[140px]">
                  {user?.username || 'Guest Aspirant'}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getRankBadgeClass(user?.stats?.rank_tier)}`}>
                  {user?.stats?.rank_tier || 'Silver'}
                </span>
              </div>

              {/* Level & XP Mini Bar */}
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-semibold text-indigo-400 text-[10px] sm:text-[11px]">
                  LVL {user?.stats?.level || 1}
                </span>
                <div className="w-14 sm:w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                    style={{ width: `${user?.stats?.progressPercent || 20}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Admin Quick Button, Coins, Rating, Sound, Language */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Admin Header Shortcut */}
          {user?.is_admin === 1 && onNavigateTab && (
            <button
              onClick={() => onNavigateTab('admin')}
              className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 px-2.5 py-1 rounded-lg text-xs font-gaming font-bold transition-all shadow-sm"
              title="Open Admin Portal"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xs:inline">Admin</span>
            </button>
          )}

          {/* Rating Pill */}
          <div className="hidden xs:flex items-center gap-1 bg-slate-800/80 border border-slate-700/80 px-2 py-1 rounded-lg text-xs font-gaming">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-cyan-300">{user?.stats?.rating || 1200}</span>
          </div>

          {/* Coins Balance */}
          <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-300">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>{user?.stats?.coins || 100}</span>
          </div>

          {/* Bilingual Language Switcher */}
          <button
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-1 rounded-lg text-xs font-semibold text-slate-300 transition-colors"
            title="Toggle English / Hindi"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span className="uppercase">{lang}</span>
          </button>

          {/* Sound FX Toggle */}
          <button
            onClick={toggleSound}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            title={soundOn ? 'Sound Effects Enabled' : 'Sound Effects Muted'}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* Profile / Account Dropdown Menu */}
      {showProfileMenu && (
        <>
          {/* Backdrop for outside click dismiss */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowProfileMenu(false)}
          />

          <div
            className="absolute left-4 top-14 w-60 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95"
            onClick={() => setShowProfileMenu(false)}
          >
            <div className="px-3 py-2 border-b border-slate-800">
              <p className="text-xs text-slate-400">Signed in as</p>
              <p className="font-bold text-sm text-white truncate">{user?.username}</p>
              {user?.is_guest ? (
                <span className="inline-block mt-1 text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                  Guest Mode
                </span>
              ) : null}
            </div>

            <button
              onClick={() => {
                setShowProfileMenu(false);
                if (onNavigateTab) onNavigateTab('profile');
              }}
              className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-cyan-300 hover:bg-slate-800 font-bold transition-colors"
            >
              <User className="w-4 h-4 text-cyan-400" />
              <span>{lang === 'hi' ? 'मेरी प्रोफ़ाइल (View Profile)' : 'View My Profile'}</span>
            </button>

            <button
              onClick={() => {
                setShowProfileMenu(false);
                if (onNavigateTab) onNavigateTab('profile');
              }}
              className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-indigo-300 hover:bg-slate-800 font-semibold transition-colors"
            >
              <span className="text-sm">🎭</span>
              <span>{lang === 'hi' ? 'अवतार बदलें (Change Avatar)' : 'Change Avatar'}</span>
            </button>

            <button
              onClick={onOpenAuth}
              className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <User className="w-4 h-4 text-indigo-400" />
              <span>Switch / Login Account</span>
            </button>

            {user?.is_admin === 1 && onNavigateTab && (
              <button
                onClick={() => onNavigateTab('admin')}
                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 font-gaming font-bold my-1 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Admin Control Panel</span>
              </button>
            )}

            <button
              onClick={logout}
              className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </>
      )}
    </header>
  );
};
