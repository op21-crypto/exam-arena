import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { socket } from '../socket/socket';
import { Users, Copy, Check, Play, X, Share2, Bot, MessageCircle, ArrowRight, ArrowLeft, Swords } from 'lucide-react';

interface FriendRoomModalProps {
  onClose: () => void;
  roomData: {
    roomCode: string;
    maxPlayers?: number;
    members?: {
      userId: string;
      username: string;
      avatar: string;
      rating: number;
      rankTier: string;
      isReady: boolean;
      isHost: boolean;
      isBot?: boolean;
    }[];
    host?: any;
    guest?: any;
    examId?: string;
    subjectId?: string;
  } | null;
  onJoinRoom: (code: string) => void;
  onCreateRoom: (examId?: string, subjectId?: string, maxPlayers?: number) => void;
  onAddBot?: () => void;
  onToggleReady?: (isReady: boolean) => void;
  onStartRoomBattle?: (roomData: any) => void;
}

export const FriendRoomModal: React.FC<FriendRoomModalProps> = ({
  onClose,
  roomData,
  onJoinRoom,
  onCreateRoom,
  onAddBot,
  onToggleReady,
  onStartRoomBattle
}) => {
  const { user, lang } = useAuth();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [selectedExam, setSelectedExam] = useState<string>('exam-cgl');
  const [selectedSubject, setSelectedSubject] = useState<string>('sub-math');
  const [maxPlayers, setMaxPlayers] = useState<number>(4);

  // Normalize members list
  const members = roomData?.members || (roomData?.host ? [
    { ...roomData.host, isHost: true },
    ...(roomData.guest ? [{ ...roomData.guest, isHost: false }] : [])
  ] : []);

  const myMember = members.find(m => m.userId === user?.id);
  const isHost = myMember?.isHost ?? true;
  const isReady = myMember?.isReady ?? true;

  // Construct absolute shareable link using actual window host
  const getShareUrl = () => {
    const code = roomData?.roomCode || '';
    const base = window.location.origin;
    return `${base}/?room=${code}`;
  };

  const copyShareLink = () => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const shareViaWhatsApp = () => {
    const code = roomData?.roomCode || '';
    const url = getShareUrl();
    const text = `⚔️ *EXAM ARENA BATTLE CHALLENGE!* ⚔️\n\nI challenge you to an Indian Gov Exam Quiz Battle! Join my lobby now:\n🔗 ${url}\n\nRoom Code: *${code}*`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareNative = async () => {
    const code = roomData?.roomCode || '';
    const url = getShareUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'EXAM ARENA — 1v1 Quiz Battle Challenge',
          text: `Join my live Exam Arena battle with code ${code}!`,
          url: url
        });
      } catch {
        copyShareLink();
      }
    } else {
      copyShareLink();
    }
  };

  const handleToggleReady = () => {
    if (onToggleReady) {
      onToggleReady(!isReady);
    } else if (roomData?.roomCode && socket && socket.connected) {
      socket.emit('toggle_friend_ready', {
        roomCode: roomData.roomCode,
        isReady: !isReady
      });
    }
  };

  const handleAddBot = () => {
    if (onAddBot) {
      onAddBot();
    } else if (socket && socket.connected && roomData?.roomCode) {
      socket.emit('add_bot_to_room', { roomCode: roomData.roomCode });
    }
  };

  const handleStartBattle = () => {
    if (onStartRoomBattle && roomData) {
      onStartRoomBattle(roomData);
    } else if (socket && socket.connected && roomData?.roomCode) {
      socket.emit('toggle_friend_ready', {
        roomCode: roomData.roomCode,
        isReady: true
      });
    }
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

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-gaming font-bold text-xl text-white">
              {lang === 'hi' ? 'मल्टीप्लेयर अखाड़ा लॉबी' : 'Multiplayer Arena Lobby'}
            </h2>
            <p className="text-xs text-slate-400">
              {lang === 'hi' ? 'दोस्तों या AI प्रतिस्पर्धियों के साथ मुकाबला (2 से 6 खिलाड़ी)' : 'Battle friends or AI contenders in custom rooms (2 to 6 players)'}
            </p>
          </div>
        </div>

        {/* ACTIVE ROOM VIEW */}
        {roomData ? (
          <div className="flex flex-col gap-4">
            {/* Room Code Card with Direct Share Buttons */}
            <div className="bg-arena-card border border-indigo-500/30 rounded-2xl p-4 text-center">
              <span className="text-[11px] text-slate-400 font-gaming uppercase tracking-wider block mb-1">
                {lang === 'hi' ? 'रूम एक्सेस कोड (शेयर करें)' : 'Room Access Code (Share with Friends)'}
              </span>
              <span className="font-gaming font-black text-3xl sm:text-4xl text-cyan-400 tracking-widest font-mono block mb-3 select-all">
                {roomData.roomCode}
              </span>

              {/* 1-Tap Share Actions */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={shareViaWhatsApp}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-gaming font-bold text-xs shadow-md transition-transform active:scale-95"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>

                <button
                  onClick={shareNative}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white font-gaming font-bold text-xs shadow-md transition-transform active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>

                <button
                  onClick={copyShareLink}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-gaming font-bold text-xs transition-colors active:scale-95"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? (lang === 'hi' ? 'कॉपी हुआ!' : 'Copied!') : (lang === 'hi' ? 'लिंक कॉपी' : 'Copy Link')}</span>
                </button>
              </div>

              <div className="mt-2 text-[11px] text-slate-400">
                {lang === 'hi'
                  ? 'दोस्त इस लिंक पर क्लिक करके सीधे आपके रूम में शामिल हो सकते हैं!'
                  : 'Friends can tap your shared link to join your room instantly!'}
              </div>
            </div>

            {/* Players Roster in Room (Grid: 2 to 6 players) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-gaming font-bold text-slate-300 uppercase">
                  {lang === 'hi' ? 'प्रतिभागी' : 'Contestants'} ({members.length} / {roomData.maxPlayers || 4})
                </span>

                {members.length < (roomData.maxPlayers || 4) && (
                  <button
                    onClick={handleAddBot}
                    className="flex items-center gap-1 text-[11px] font-gaming font-bold px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 transition-colors active:scale-95"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>{lang === 'hi' ? '+ AI अभ्यार्थी जोड़ें' : '+ Add AI Aspirant Bot'}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {members.map((m) => {
                  const isCurrent = m.userId === user?.id;
                  return (
                    <div
                      key={m.userId}
                      className={`bg-slate-900/90 border rounded-2xl p-3 flex flex-col items-center relative ${
                        isCurrent ? 'border-cyan-500/60 ring-1 ring-cyan-500/30' : 'border-slate-800'
                      }`}
                    >
                      <div className="relative mb-1.5">
                        <img
                          src={m.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + m.userId}
                          alt={m.username}
                          className="w-12 h-12 rounded-full border-2 border-indigo-400 object-cover bg-slate-800"
                        />
                        {m.isHost && (
                          <span className="absolute -top-1 -right-1 text-[10px] bg-amber-500 text-slate-950 font-gaming font-extrabold px-1 rounded-full">
                            HOST
                          </span>
                        )}
                        {m.isBot && (
                          <span className="absolute -top-1 -left-1 text-[10px] bg-cyan-600 text-white font-gaming font-extrabold px-1 rounded-full">
                            BOT
                          </span>
                        )}
                      </div>

                      <span className="font-bold text-xs text-white truncate max-w-[100px] text-center">
                        {m.username} {isCurrent && '(You)'}
                      </span>
                      <span className="text-[10px] text-cyan-400 font-gaming">
                        {m.rating} Elo
                      </span>

                      <span className={`mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        m.isReady ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {m.isReady ? (lang === 'hi' ? 'तैयार ✓' : 'READY ✓') : (lang === 'hi' ? 'प्रतीक्षारत' : 'WAITING')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Launch / Ready Action */}
            <div className="flex flex-col gap-2 pt-1">
              {isHost ? (
                <button
                  onClick={handleStartBattle}
                  disabled={members.length < 2}
                  className={`w-full py-4 rounded-2xl font-gaming font-black text-base flex items-center justify-center gap-2 shadow-xl transition-all ${
                    members.length < 2
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-purple-500 text-white shadow-indigo-900/50 active:scale-95'
                  }`}
                >
                  <Swords className="w-5 h-5" />
                  <span>
                    {members.length < 2
                      ? (lang === 'hi' ? 'लिंक शेयर करें या AI बॉट जोड़ें!' : 'Share link or add bot to start!')
                      : (lang === 'hi' ? '⚔️ अभी मुकाबला शुरू करें (START BATTLE)' : '⚔️ START MULTIPLAYER BATTLE NOW')}
                  </span>
                </button>
              ) : (
                <button
                  onClick={handleToggleReady}
                  className={`w-full py-4 rounded-2xl font-gaming font-black text-base flex items-center justify-center gap-2 shadow-xl transition-all ${
                    isReady
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50'
                      : 'bg-purple-600 hover:bg-purple-500 text-white'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    {isReady
                      ? (lang === 'hi' ? 'आप तैयार हैं! (मेजबान शुरू करने का इंतजार)' : 'YOU ARE READY! (Waiting for Host)')
                      : (lang === 'hi' ? 'मैं तैयार हूँ!' : 'I AM READY TO BATTLE!')}
                  </span>
                </button>
              )}

              {/* Leave Room & Go Back Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-gaming font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-98 shadow-sm"
              >
                <ArrowLeft className="w-4 h-4 text-rose-400" />
                <span>{lang === 'hi' ? '← लॉबी छोड़ें व होम पर लौटें (Leave Room)' : '← Leave Room & Return Home'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* CREATE OR JOIN LOBBY */
          <div>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl mb-4 border border-slate-800">
              <button
                onClick={() => setTab('create')}
                className={`py-2 text-xs font-gaming font-bold rounded-lg transition-colors ${
                  tab === 'create' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang === 'hi' ? 'रूम बनाएं' : 'Create Room'}
              </button>
              <button
                onClick={() => setTab('join')}
                className={`py-2 text-xs font-gaming font-bold rounded-lg transition-colors ${
                  tab === 'join' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang === 'hi' ? 'कोड से जुड़ें' : 'Join with Code'}
              </button>
            </div>

            {tab === 'create' ? (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      {lang === 'hi' ? 'लक्ष्य परीक्षा' : 'Target Examination'}
                    </label>
                    <select
                      value={selectedExam}
                      onChange={(e) => setSelectedExam(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                    >
                      <option value="exam-cgl">SSC CGL</option>
                      <option value="exam-chsl">SSC CHSL</option>
                      <option value="exam-cpo">SSC CPO</option>
                      <option value="exam-gd">SSC GD</option>
                      <option value="exam-banking">Banking (IBPS/SBI)</option>
                      <option value="exam-railway">Railway (RRB)</option>
                      <option value="exam-state">State Exams</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      {lang === 'hi' ? 'विषय' : 'Subject'}
                    </label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                    >
                      <option value="sub-math">{lang === 'hi' ? 'गणित (Quant)' : 'Mathematics'}</option>
                      <option value="sub-reasoning">{lang === 'hi' ? 'तर्कशक्ति (Reasoning)' : 'Reasoning'}</option>
                      <option value="sub-english">{lang === 'hi' ? 'अंग्रेजी (English)' : 'English'}</option>
                      <option value="sub-gk">{lang === 'hi' ? 'सामान्य ज्ञान (GK)' : 'General Awareness'}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    {lang === 'hi' ? 'लॉबी क्षमता (खिलाड़ियों की संख्या)' : 'Lobby Capacity (Number of Players)'}
                  </label>
                  <div className="grid grid-cols-4 gap-2 font-gaming font-bold text-xs">
                    {[2, 3, 4, 6].map(num => (
                      <button
                        type="button"
                        key={num}
                        onClick={() => setMaxPlayers(num)}
                        className={`py-2 rounded-xl border transition-colors ${
                          maxPlayers === num
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {num === 2 ? '1v1 Duel' : `${num} Players`}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => onCreateRoom(selectedExam, selectedSubject, maxPlayers)}
                  className="w-full mt-2 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-gaming font-bold text-base rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>{lang === 'hi' ? 'बैटल रूम बनाएं' : 'Generate Battle Room'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    {lang === 'hi' ? 'रूम कोड दर्ज करें' : 'Enter 6-Character Room Code'}
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="e.g. ARENA-8842"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-center text-2xl font-gaming font-bold tracking-widest text-cyan-300 uppercase"
                  />
                </div>

                <button
                  onClick={() => onJoinRoom(joinCodeInput)}
                  disabled={joinCodeInput.trim().length < 4}
                  className="w-full mt-2 py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-gaming font-bold text-base rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>{lang === 'hi' ? 'लॉबी में शामिल हों' : 'Join Battle Lobby'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Back / Close button */}
            <button
              type="button"
              onClick={onClose}
              className="w-full mt-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-gaming font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{lang === 'hi' ? 'वापस जाएं (Back to Dashboard)' : 'Back to Dashboard'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
