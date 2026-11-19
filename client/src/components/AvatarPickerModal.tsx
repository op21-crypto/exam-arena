import React from 'react';
import { useAuth } from '../context/AuthContext';
import { sound } from '../sound/soundEngine';
import { X, Check, Sparkles, UserCheck } from 'lucide-react';

interface AvatarOption {
  id: string;
  name_en: string;
  name_hi: string;
  avatarUrl: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'av-warrior', name_en: 'Warrior Aspirant', name_hi: 'योद्धा अभ्यार्थी', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Aspirant_Warrior' },
  { id: 'av-arjun', name_en: 'Topper Arjun', name_hi: 'टॉपर अर्जुन', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Topper_Arjun' },
  { id: 'av-striker', name_en: 'Cyber Striker', name_hi: 'साइबर स्ट्राइकर', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Cyber_Striker' },
  { id: 'av-police', name_en: 'Police SI Inspector', name_hi: 'पुलिस सब-इंस्पेक्टर', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Police_SI' },
  { id: 'av-ninja', name_en: 'GK Ninja', name_hi: 'जीके निंजा', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=GK_Ninja' },
  { id: 'av-scholar', name_en: 'Stellar Scholar', name_hi: 'स्टेलर स्कॉलर', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Stellar_Scholar' },
  { id: 'av-scientist', name_en: 'Rocket Scientist', name_hi: 'रॉकेट वैज्ञानिक', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Rocket_Scientist' },
  { id: 'av-strategist', name_en: 'AI Strategist', name_hi: 'एआई रणनीतिकार', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=AI_Strategist' },
  { id: 'av-owl', name_en: 'Wise Owl', name_hi: 'बुद्धिमान उल्लू', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Wise_Owl' },
  { id: 'av-gladiator', name_en: 'Arena Gladiator', name_hi: 'अरेना ग्लैडीएटर', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Gladiator' },
  { id: 'av-diamond', name_en: 'Diamond Champ', name_hi: 'डायमंड चैंपियन', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Diamond_Champ' },
  { id: 'av-stealth', name_en: 'Stealth Master', name_hi: 'स्टेल्थ मास्टर', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Stealth_Master' },
  { id: 'av-emperor', name_en: 'Royal Emperor', name_hi: 'शाही सम्राट', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Royal_Emperor' },
  { id: 'av-valkyrie', name_en: 'Valkyrie', name_hi: 'वाल्किरी', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Valkyrie' },
  { id: 'av-knight', name_en: 'Shadow Knight', name_hi: 'शैडो नाइट', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Shadow_Knight' },
  { id: 'av-champion', name_en: 'Apex Champion', name_hi: 'एपेक्स चैंपियन', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Apex_Champion' },
];

interface AvatarPickerModalProps {
  onClose: () => void;
  onSelectAvatar: (avatarUrl: string) => void;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({ onClose, onSelectAvatar }) => {
  const { user, lang } = useAuth();

  const handleChoose = (url: string) => {
    sound.playMatchFound();
    onSelectAvatar(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-arena-surface border border-indigo-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-gaming font-black text-lg sm:text-xl text-white">
                {lang === 'hi' ? 'अपना गेमिंग अवतार चुनें' : 'Choose Your Gaming Avatar'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {lang === 'hi' ? '1v1 मुकाबला और लीडरबोर्ड पर प्रदर्शित होगा' : 'Displayed in 1v1 battles & leaderboard standings'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 overflow-y-auto pr-1">
          {AVATAR_OPTIONS.map((av) => {
            const isSelected = user?.avatar === av.avatarUrl;
            return (
              <button
                key={av.id}
                onClick={() => handleChoose(av.avatarUrl)}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-2 text-center transition-all duration-150 active:scale-95 group ${
                  isSelected
                    ? 'bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-950/50'
                    : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-800 p-0.5 group-hover:scale-105 transition-transform shadow-md">
                    <img
                      src={av.avatarUrl}
                      alt={av.name_en}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  )}
                </div>

                <div className="flex flex-col">
                  <span className="font-gaming font-bold text-xs text-white truncate max-w-[100px]">
                    {lang === 'hi' ? av.name_hi : av.name_en}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {isSelected ? (lang === 'hi' ? 'सक्रिय' : 'Active') : (lang === 'hi' ? 'चुनें' : 'Select')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {lang === 'hi' ? '16 विशेष सरकारी परीक्षा अवतार' : '16 Exclusive Aspirant Avatars'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-gaming font-bold transition-colors"
          >
            {lang === 'hi' ? 'बंद करें' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
