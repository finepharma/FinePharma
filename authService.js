/**
 * Auth Service - Firebase Authentication Operations
 * FinePharma Wholesale
 * 
 * Handles all authentication-related operations including:
 * - Login with email/password
 * - Signup with role assignment
 * - Password reset
 * - Logout
 * - Auth state management
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { auth } from './firebase';
import { createUserDocument, getUserById, updateLastLogin, checkAdminExists } from './userService';

// Bootstrap setup code for first admin creation
const ADMIN_SETUP_CODE = 'FINEPHARMA-ADMIN-2025';

/**
 * Initialize auth persistence
 * Call this once when app starts
 */
export const initAuthPersistence = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
    console.log('Auth persistence set to local');
  } catch (error) {
    console.error('Failed to set auth persistence:', error);
  }
};

/**
 * Login user with email and password
 * Auto-creates Firestore user doc if missing (login sync)
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User credential and Firestore user data
 */
export const loginUser = async (email, password) => {
  try {
    // Sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Fetch user data from Firestore
    let userData = await getUserById(firebaseUser.uid);
    
    // LOGIN SYNC: Auto-create Firestore doc if missing
    if (!userData) {
      console.log('Login sync: Creating Firestore user doc for existing Auth user');
      try {
        userData = await createUserDocument(firebaseUser.uid, {
          name: firebaseUser.displayName || email.split('@')[0],
          email: firebaseUser.email,
          role: 'customer',
          status: 'active'
        });
      } catch (createError) {
        console.error('Failed to auto-create user document:', createError);
        await signOut(auth);
        throw new Error('Failed to create user profile. Please contact support.');
      }
    }
    
    // Check if user account is active
    if (userData.status !== 'active') {
      await signOut(auth);
      throw new Error('Your account has been disabled. Please contact support.');
    }
    
    // Update last login timestamp
    await updateLastLogin(firebaseUser.uid);
    
    return {
      firebaseUser,
      userData
    };
  } catch (error) {
    console.error('Login error:', error);
    
    // Provide user-friendly error messages
    let errorMessage = 'Login failed. Please try again.';
    
    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address format.';
        break;
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled.';
        break;
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email.';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Incorrect password. Please try again.';
        break;
      case 'auth/invalid-credential':
        errorMessage = 'Invalid email or password.';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many failed attempts. Please try again later.';
        break;
      default:
        if (error.message) {
          errorMessage = error.message;
        }
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Sign up new user
 * Default role is 'customer', admin role requires setup code
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} name - User full name
 * @param {string} setupCode - Optional setup code for admin role
 * @returns {Promise<Object>} Created user data
 */
export const signupUser = async (email, password, name, setupCode = null) => {
  try {
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Determine role
    let role = 'customer';
    
    // Check if this should be the first admin
    if (setupCode === ADMIN_SETUP_CODE) {
      const adminExists = await checkAdminExists();
      if (!adminExists) {
        role = 'admin';
        console.log('First admin created via bootstrap');
      }
    }
    
    // Create Firestore user document
    const userData = await createUserDocument(firebaseUser.uid, {
      name,
      email,
      role,
      status: 'active'
    });
    
    return {
      firebaseUser,
      userData
    };
  } catch (error) {
    console.error('Signup error:', error);
    
    let errorMessage = 'Signup failed. Please try again.';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'An account with this email already exists.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address format.';
        break;
      case 'auth/weak-password':
        errorMessage = 'Password should be at least 6 characters.';
        break;
      default:
        if (error.message) {
          errorMessage = error.message;
        }
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Send password reset email
 * @param {string} email - User email
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    console.error('Password reset error:', error);
    
    let errorMessage = 'Failed to send reset email. Please try again.';
    
    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address format.';
        break;
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email.';
        break;
      default:
        if (error.message) {
          errorMessage = error.message;
        }
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Logout user
 * @returns {Promise<void>}
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
    console.log('User logged out successfully');
  } catch (error) {
    console.error('Logout error:', error);
    throw new Error('Failed to logout. Please try again.');
  }
};

/**
 * Subscribe to auth state changes
 * @param {Function} callback - Callback with user or null
 * @returns {Function} Unsubscribe function
 */
export const subscribeToAuth = (callback) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      // Fetch full user data from Firestore
      try {
        const userData = await getUserById(firebaseUser.uid);
        callback({
          firebaseUser,
          userData
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
        callback({ firebaseUser, userData: null });
      }
    } else {
      callback(null);
    }
  });
};

/**
 * Get current Firebase user
 * @returns {Object|null} Current user or null
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Get redirect path based on user role
 * @param {string} role - User role
 * @returns {string} Redirect path
 */
export const getRoleBasedRedirect = (role) => {
  switch (role) {
    case 'admin':
      return '/admin-dashboard';
    case 'staff':
      return '/staff-dashboard';
    case 'customer':
      return '/home';
    default:
      return '/home';
  }
};

/**
 * Check if user can access route based on role
 * @param {string} userRole - User's role
 * @param {Array<string>} allowedRoles - Allowed roles for route
 * @returns {boolean}
 */
export const hasRoleAccess = (userRole, allowedRoles) => {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }
  return allowedRoles.includes(userRole);
};
