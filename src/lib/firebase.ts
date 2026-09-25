import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDYbXXLZ9Fqtd2SJn9-S1k2EZchB0res4Q",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "nawi-a6968.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://nawi-a6968-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "nawi-a6968",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "nawi-a6968.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "737222034966",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:737222034966:web:7143ccc822c8d07baad737",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-7976YCMM05"
};

// Initialize Firebase App singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Database Instances
export const db = getFirestore(app); // Cloud Firestore Database
export const rtdb = getDatabase(app); // Realtime Database

// Initialize Firebase Auth & Storage
export const auth = getAuth(app);
export const storage = getStorage(app);

// Initialize Analytics safely for SSR / environment support
export const getAnalyticsInstance = async () => {
  if (typeof window !== "undefined" && await isSupported()) {
    return getAnalytics(app);
  }
  return null;
};
