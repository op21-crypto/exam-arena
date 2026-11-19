import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { socket } from '../socket/socket';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  lang: 'en' | 'hi';
  setLang: (lang: 'en' | 'hi') => void;
  loginGuest: () => Promise<void>;
  loginWithCredentials: (identifier: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  registerWithCredentials: (username: string, email: string, pass: string, avatar?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('exam_arena_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lang, setLangState] = useState<'en' | 'hi'>((localStorage.getItem('exam_arena_lang') as 'en' | 'hi') || 'en');

  const setLang = (newLang: 'en' | 'hi') => {
    setLangState(newLang);
    localStorage.setItem('exam_arena_lang', newLang);
  };

  const refreshUser = async () => {
    const curToken = localStorage.getItem('exam_arena_token');
    if (!curToken) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${curToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        socket.emit('register_socket', { userId: data.user.id });
      } else {
        localStorage.removeItem('exam_arena_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Error refreshing user profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loginGuest = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/guest', { method: 'POST' });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('exam_arena_token', data.token);
        setToken(data.token);
        setUser(data.user);
        socket.emit('register_socket', { userId: data.user.id });
      }
    } catch (err) {
      console.error('Guest login failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithCredentials = async (identifier: string, pass: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password: pass })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('exam_arena_token', data.token);
        setToken(data.token);
        setUser(data.user);
        socket.emit('register_socket', { userId: data.user.id });
        return { success: true };
      }
      return { success: false, error: data.error || 'Login failed' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const registerWithCredentials = async (username: string, email: string, pass: string, avatar?: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password: pass, avatar })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('exam_arena_token', data.token);
        setToken(data.token);
        setUser(data.user);
        socket.emit('register_socket', { userId: data.user.id });
        return { success: true };
      }
      return { success: false, error: data.error || 'Registration failed' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('exam_arena_token');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    if (token) {
      refreshUser();
    } else {
      // Auto login as guest for immediate zero-friction play
      loginGuest();
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        lang,
        setLang,
        loginGuest,
        loginWithCredentials,
        registerWithCredentials,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
