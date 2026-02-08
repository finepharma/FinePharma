/**
 * User Service - Firestore Operations for Users Collection
 * FinePharma Wholesale
 * 
 * Handles all user-related database operations including:
 * - User creation on signup
 * - Role management
 * - User status (active/disabled)
 * - User queries and updates
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';

// Collection reference
const USERS_COLLECTION = 'users';

/**
 * Create a new user document in Firestore after Firebase Auth signup
 * @param {string} uid - Firebase Auth UID
 * @param {Object} userData - User data object
 * @returns {Promise<void>}
 */
export const createUserDocument = async (uid, userData) => {
  const userRef = doc(db, USERS_COLLECTION, uid);
  
  const newUser = {
    uid,
    name: userData.name || '',
    email: userData.email || '',
    role: userData.role || 'customer', // Default role is customer
    status: userData.status || 'active',
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp()
  };
  
  await setDoc(userRef, newUser);
  return newUser;
};

/**
 * Get user document by UID
 * @param {string} uid - Firebase Auth UID
 * @returns {Promise<Object|null>} User data or null if not found
 */
export const getUserById = async (uid) => {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    return { id: userSnap.id, ...userSnap.data() };
  }
  return null;
};

/**
 * Real-time listener for user document
 * @param {string} uid - Firebase Auth UID
 * @param {Function} callback - Callback function with user data
 * @returns {Function} Unsubscribe function
 */
export const subscribeToUser = (uid, callback) => {
  const userRef = doc(db, USERS_COLLECTION, uid);
  return onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    } else {
      callback(null);
    }
  });
};

/**
 * Update user's last login timestamp
 * @param {string} uid - Firebase Auth UID
 */
export const updateLastLogin = async (uid) => {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, {
    lastLoginAt: serverTimestamp()
  });
};

/**
 * Update user role (Admin only)
 * @param {string} uid - User UID to update
 * @param {string} newRole - New role (admin/staff/customer)
 */
export const updateUserRole = async (uid, newRole) => {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, {
    role: newRole,
    updatedAt: serverTimestamp()
  });
};

/**
 * Update user status (Admin only)
 * @param {string} uid - User UID to update
 * @param {string} status - New status (active/disabled)
 */
export const updateUserStatus = async (uid, status) => {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, {
    status: status,
    updatedAt: serverTimestamp()
  });
};

/**
 * Get all users (Admin only)
 * @returns {Promise<Array>} Array of user objects
 */
export const getAllUsers = async () => {
  const usersQuery = query(collection(db, USERS_COLLECTION));
  const querySnapshot = await getDocs(usersQuery);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Real-time listener for all users (Admin only)
 * @param {Function} callback - Callback with users array
 * @returns {Function} Unsubscribe function
 */
export const subscribeToAllUsers = (callback) => {
  const usersQuery = query(collection(db, USERS_COLLECTION));
  return onSnapshot(usersQuery, (snapshot) => {
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(users);
  });
};

/**
 * Check if any admin exists in the system
 * Used for first admin bootstrap
 * @returns {Promise<boolean>}
 */
export const checkAdminExists = async () => {
  const adminQuery = query(
    collection(db, USERS_COLLECTION),
    where('role', '==', 'admin')
  );
  const querySnapshot = await getDocs(adminQuery);
  return !querySnapshot.empty;
};

/**
 * Get user count by role
 * @returns {Promise<Object>} Counts by role
 */
export const getUserCounts = async () => {
  const snapshot = await getDocs(collection(db, USERS_COLLECTION));
  const counts = { admin: 0, staff: 0, customer: 0, total: 0 };
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    counts.total++;
    if (data.role && counts[data.role] !== undefined) {
      counts[data.role]++;
    }
  });
  
  return counts;
};
