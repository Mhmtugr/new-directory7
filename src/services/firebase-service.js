// Firebase servisi
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Logger
import { Logger } from '@/utils/logger';

// Logger instance
const logger = new Logger('FirebaseService');

// Firebase yapılandırması
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mets-project.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mets-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mets-project.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:abcdef1234567890abcdef",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-ABCDEFGHIJ"
};

// Initialize Firebase
let app;

try {
  app = initializeApp(firebaseConfig);
  logger.info('Firebase başlatıldı');
} catch (error) {
  logger.error('Firebase başlatma hatası', error);
}

// Firebase servisleri
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Firebase modüllerini dışa aktar
export { app, auth, db, storage };