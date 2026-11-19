import React from 'react';
import { Home, Swords, Trophy, BookOpen, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type NavTab = 'home' | 'battle' | 'leaderboard' | 'practice' | 'profile' | 'admin';

interface BottomNavProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const { user, lang } = useAuth();

  const navItems = [
    { id: 'home', label: lang === 'hi' ? 'होम' : 'Home', icon: Home },
    { id: 'battle', label: lang === 'hi' ? 'मुकाबला' : 'Battle', icon: Swords },
    { id: 'leaderboard', label: lang === 'hi' ? 'रैंकिंग' : 'Ranks', icon: Trophy },
    { id: 'practice', label: lang === 'hi' ? 'अभ्यास' : 'Practice', icon: BookOpen },
    { id: 'profile', label: lang === 'hi' ? 'प्रोफ़ाइल' : 'Profile', icon: User },
  ];

  if (user?.is_admin === 1) {
    navItems.push({ id: 'admin', label: lang === 'hi' ? 'व्यवस्थापक' : 'Admin', icon: ShieldCheck });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-arena-surface/95 backdrop-blur-lg border-t border-arena-border py-1.5 px-2 shadow-2xl">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onChangeTab(item.id as NavTab)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-indigo-400 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-indigo-600/20 shadow-sm' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'text-indigo-300 font-bold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
