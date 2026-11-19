import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, ShieldCheck, UserCheck, KeyRound, Sparkles, LogIn } from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { loginWithCredentials, registerWithCredentials, loginGuest } = useAuth();
  const [tab, setTab] = useState<'login' | 'register' | 'demo'>('demo');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await loginWithCredentials(identifier, password);
    setLoading(false);
    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Login failed');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await registerWithCredentials(username, email, regPassword);
    setLoading(false);
    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Registration failed');
    }
  };

  const handleDemoLogin = async (userKey: 'admin' | 'topper' | 'priya') => {
    setLoading(true);
    setError(null);
    let id = 'ArenaMaster';
    let pass = 'admin123';
    if (userKey === 'topper') {
      id = 'Topper_Arjun';
      pass = 'password123';
    } else if (userKey === 'priya') {
      id = 'Aspirant_Priya';
      pass = 'password123';
    }
    const res = await loginWithCredentials(id, pass);
    setLoading(false);
    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Demo login failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-arena-surface border border-arena-border rounded-3xl p-5 sm:p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-gaming font-bold text-xl text-white">Aspirant Authentication</h2>
            <p className="text-xs text-slate-400">Save your battle progress, Elo rating & XP</p>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900 rounded-xl mb-4 border border-slate-800 text-xs font-gaming font-bold">
          <button
            onClick={() => { setTab('demo'); setError(null); }}
            className={`py-2 rounded-lg transition-colors ${tab === 'demo' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Quick Demo
          </button>
          <button
            onClick={() => { setTab('login'); setError(null); }}
            className={`py-2 rounded-lg transition-colors ${tab === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('register'); setError(null); }}
            className={`py-2 rounded-lg transition-colors ${tab === 'register' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {/* 1. Quick Demo Login Cards */}
        {tab === 'demo' && (
          <div className="flex flex-col gap-2.5">
            <p className="text-xs text-slate-400 mb-1">
              Test real multiplayer battles immediately with pre-configured accounts:
            </p>

            <button
              onClick={() => handleDemoLogin('admin')}
              disabled={loading}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-left transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-amber-400 overflow-hidden bg-slate-800">
                  <img src="https://api.dicebear.com/7.x/bottts/svg?seed=ArenaMaster" alt="Admin" className="w-full h-full" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-gaming font-bold text-sm text-white">ArenaMaster</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                      ADMIN
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">Grandmaster · 2150 Elo</span>
                </div>
              </div>
              <LogIn className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => handleDemoLogin('topper')}
              disabled={loading}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-left transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-cyan-400 overflow-hidden bg-slate-800">
                  <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Topper_Arjun" alt="Arjun" className="w-full h-full" />
                </div>
                <div>
                  <span className="font-gaming font-bold text-sm text-white block">Topper_Arjun</span>
                  <span className="text-xs text-slate-400">Diamond · 1820 Elo</span>
                </div>
              </div>
              <LogIn className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => handleDemoLogin('priya')}
              disabled={loading}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-purple-500/40 text-left transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-purple-400 overflow-hidden bg-slate-800">
                  <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Aspirant_Priya" alt="Priya" className="w-full h-full" />
                </div>
                <div>
                  <span className="font-gaming font-bold text-sm text-white block">Aspirant_Priya</span>
                  <span className="text-xs text-slate-400">Gold · 1460 Elo</span>
                </div>
              </div>
              <LogIn className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="pt-2 text-center">
              <button
                onClick={async () => {
                  await loginGuest();
                  onClose();
                }}
                className="text-xs text-slate-400 hover:text-indigo-400 underline"
              >
                Continue as New Random Guest
              </button>
            </div>
          </div>
        )}

        {/* 2. Standard Login Form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Username or Email</label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. ArenaMaster or your@email.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-gaming font-bold text-sm rounded-xl shadow-lg transition-transform active:scale-95"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* 3. Register Form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Unique Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. SSC_Champion"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Email (Optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="aspirant@examarena.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Create Password</label>
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-gaming font-bold text-sm rounded-xl shadow-lg transition-transform active:scale-95"
            >
              {loading ? 'Creating Profile...' : 'Register & Enter Arena'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
