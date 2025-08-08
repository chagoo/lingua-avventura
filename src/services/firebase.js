import { initializeApp, getApps } from "firebase/app";
import {
  getAuth, onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    });

export const auth = getAuth(app);
export const db   = getFirestore(app);

export const onAuth = (cb) => onAuthStateChanged(auth, cb);
export const registerEmail = (email, pass) => createUserWithEmailAndPassword(auth, email, pass);
export const loginEmail    = (email, pass) => signInWithEmailAndPassword(auth, email, pass);
export const logout        = () => signOut(auth);

export default app;
