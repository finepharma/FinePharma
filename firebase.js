/**
 * Firebase Configuration and Service Initialization
 * FinePharma Wholesale - Firebase v9+ Modular SDK
 * 
 * This file initializes all Firebase services and exports them for use across the app.
 * All modules must import Firebase services from this file only.
 */

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration for FinePharma Wholesale project
const firebaseConfig = {
  apiKey: "AIzaSyCTynoBv4wKnVynGg_QIA-wmvb8niLD5Ug",
  authDomain: "finepharma-wholesale.firebaseapp.com",
  projectId: "finepharma-wholesale",
  storageBucket: "finepharma-wholesale.firebasestorage.app",
  messagingSenderId: "802436197532",
  appId: "1:802436197532:web:25bf7de7f7062a6fc35159"
};

// Initialize Firebase app only once (prevents duplicate initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firebase Auth with local persistence (user stays logged in)
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Auth persistence error:', error);
});

// Initialize Firestore database
const db = getFirestore(app);

// Initialize Firebase Storage for images and files
const storage = getStorage(app);

// Export all initialized services
export { app, auth, db, storage };

// Default export for convenience
export default app;
