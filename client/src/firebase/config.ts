import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyD_o3QRw5QzKO80P4l0YyZ1xFeh5rXpt28",
  authDomain: "exam-arena-live.firebaseapp.com",
  projectId: "exam-arena-live",
  storageBucket: "exam-arena-live.firebasestorage.app",
  messagingSenderId: "548235941939",
  appId: "1:548235941939:web:30108a59b213dba948ab46"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
