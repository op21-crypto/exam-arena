import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import { syncUserProfileOnLogin, fetchUserFirestoreProfile, updateUserFirestoreAvatar } from '../services/firebaseUserService';
import { UserProfile } from '../types';
import { socket } from '../socket/socket';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  lang: 'en' | 'hi';
  setLang: (lang: 'en' | 'hi') => void;
  loginGuest: () => Promise<void>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  registerWithEmail: (username: string, email: string, pass: string, avatar?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithCredentials: (identifier: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  registerWithCredentials: (username: string, email: string, pass: string, avatar?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateAvatar: (avatarUrl: string) => Promise<void>;
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

  const handleSyncWithBackend = async (fbUser: FirebaseUser, customProfile?: { username?: string; avatar?: string }) => {
    try {
      // 1. Store & sync user profile and stats in Cloud Firestore
      const firestoreProfile = await syncUserProfileOnLogin(fbUser, customProfile);
      setUser(firestoreProfile);
      socket.emit('register_socket', { userId: firestoreProfile.id });

      // 2. Synchronize with backend API & socket matchmaking (optional when running on static Vercel)
      try {
        const res = await fetch('/api/auth/firebase-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firebaseUid: fbUser.uid,
            username: firestoreProfile.username,
            email: fbUser.email,
            avatar: firestoreProfile.avatar,
            isGuest: fbUser.isAnonymous
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.token) {
            localStorage.setItem('exam_arena_token', data.token);
            setToken(data.token);
          }
        }
      } catch {
        // Backend API offline / static host
      }

      return { success: true };
    } catch (err: any) {
      console.warn('Firebase login profile fallback to guest:', err);
      const fallback = createFallbackGuest();
      fallback.id = fbUser.uid;
      setUser(fallback);
      return { success: true };
    }
  };

  const createFallbackGuest = (): UserProfile => {
    const localUserStr = localStorage.getItem('exam_arena_local_user');
    if (localUserStr) {
      try {
        const parsed = JSON.parse(localUserStr);
        if (parsed && parsed.id) return parsed;
      } catch {
        // ignore
      }
    }
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const guestUser: UserProfile = {
      id: `aspirant_${randomNum}`,
      username: `Aspirant_${randomNum}`,
      email: `guest_${randomNum}@examarena.in`,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=Aspirant_${randomNum}`,
      is_guest: 1,
      is_admin: 1, // Full access on demo preview
      created_at: new Date().toISOString(),
      stats: {
        rating: 1200,
        rank_tier: 'Silver',
        total_battles: 6,
        wins: 4,
        losses: 2,
        draws: 0,
        win_streak: 2,
        best_streak: 3,
        total_questions: 48,
        correct_questions: 39,
        xp: 450,
        level: 1,
        coins: 160,
        accuracy: 81.3,
        winRate: 66.7,
        nextLevelXp: 250,
        progressPercent: 45
      },
      achievements: []
    };
    localStorage.setItem('exam_arena_local_user', JSON.stringify(guestUser));
    return guestUser;
  };

  const refreshUser = async () => {
    const curToken = localStorage.getItem('exam_arena_token');

    try {
      if (auth.currentUser) {
        const fsProfile = await fetchUserFirestoreProfile(auth.currentUser.uid);
        if (fsProfile) {
          setUser(fsProfile);
          socket.emit('register_socket', { userId: fsProfile.id });
          setIsLoading(false);
          return;
        }
      }

      if (curToken) {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${curToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          socket.emit('register_socket', { userId: data.user.id });
          setIsLoading(false);
          return;
        }
      }

      // Check local user storage
      const localStr = localStorage.getItem('exam_arena_local_user');
      if (localStr) {
        setUser(JSON.parse(localStr));
      } else {
        setUser(createFallbackGuest());
      }
    } catch (err) {
      console.warn('Error refreshing user profile, using resilient fallback:', err);
      const localStr = localStorage.getItem('exam_arena_local_user');
      if (localStr) {
        try {
          setUser(JSON.parse(localStr));
        } catch {
          setUser(createFallbackGuest());
        }
      } else {
        setUser(createFallbackGuest());
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const res = await handleSyncWithBackend(cred.user);
      return res;
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      let userMsg = err.message || 'Google Sign-In failed';
      if (err.code === 'auth/operation-not-allowed') {
        userMsg = 'Google Sign-In is not enabled in Firebase Console. Please use Email/Password or Guest login.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        userMsg = 'Sign-in popup was closed before completing.';
      }
      return { success: false, error: userMsg };
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const res = await handleSyncWithBackend(cred.user);
      return res;
    } catch (err: any) {
      console.error('Email login failed:', err);
      return { success: false, error: err.message || 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const registerWithEmail = async (username: string, email: string, pass: string, avatar?: string) => {
    setIsLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const res = await handleSyncWithBackend(cred.user, { username, avatar });
      return res;
    } catch (err: any) {
      console.error('Email registration failed:', err);
      return { success: false, error: err.message || 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const loginGuest = async () => {
    setIsLoading(true);
    try {
      // 1. Try Firebase Anonymous Auth
      try {
        const cred = await signInAnonymously(auth);
        await handleSyncWithBackend(cred.user);
        return;
      } catch (fbErr) {
        console.warn('Firebase anonymous login fallback to server guest:', fbErr);
      }

      // 2. Fallback to server guest endpoint
      try {
        const res = await fetch('/api/auth/guest', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data.token) {
            localStorage.setItem('exam_arena_token', data.token);
            setToken(data.token);
            setUser(data.user);
            socket.emit('register_socket', { userId: data.user.id });
            return;
          }
        }
      } catch (srvErr) {
        console.warn('Server guest API not reachable, activating resilient local profile:', srvErr);
      }

      // 3. Resilient client guest profile
      const localGuest = createFallbackGuest();
      setUser(localGuest);
    } catch (err) {
      console.error('Guest login failed, using fallback:', err);
      const localGuest = createFallbackGuest();
      setUser(localGuest);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithCredentials = async (identifier: string, pass: string) => {
    // Check if identifier is email format, attempt Firebase login first
    if (identifier.includes('@')) {
      const fbResult = await loginWithEmail(identifier, pass);
      if (fbResult.success) return fbResult;
    }

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
    if (email) {
      const fbResult = await registerWithEmail(username, email, pass, avatar);
      if (fbResult.success) return fbResult;
    }

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

  const updateAvatar = async (avatarUrl: string) => {
    // 1. Optimistic state update
    setUser(prev => prev ? { ...prev, avatar: avatarUrl } : null);

    // 2. Persist locally
    const localStr = localStorage.getItem('exam_arena_local_user');
    if (localStr) {
      try {
        const parsed = JSON.parse(localStr);
        parsed.avatar = avatarUrl;
        localStorage.setItem('exam_arena_local_user', JSON.stringify(parsed));
      } catch {
        // ignore
      }
    }

    // 3. Persist to Firestore if logged in
    if (auth.currentUser) {
      try {
        await updateUserFirestoreAvatar(auth.currentUser.uid, avatarUrl);
      } catch (err) {
        console.warn('Could not sync avatar to Firestore:', err);
      }
    }

    // 4. Update backend if available
    if (user?.id) {
      try {
        await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, avatar: avatarUrl })
        });
      } catch {
        // backend offline
      }
    }
  };

  const logout = async () => {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch (err) {
      console.error('Firebase sign-out error:', err);
    }
    localStorage.removeItem('exam_arena_token');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    // Listen for Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        await handleSyncWithBackend(fbUser);
      } else if (token) {
        await refreshUser();
      } else {
        await loginGuest();
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
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
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        loginWithCredentials,
        registerWithCredentials,
        logout,
        refreshUser,
        updateAvatar
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
