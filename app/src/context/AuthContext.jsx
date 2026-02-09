/**
 * Auth Context - Global Authentication State Management
 * FinePharma Wholesale
 * 
 * Provides global auth state and functions to all components.
 * Handles auth state persistence, role verification, and session management.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { subscribeToAuth, logoutUser, getRoleBasedRedirect } from '../services/authService';
import { getUserById } from '../services/userService';

// Create Auth Context
const AuthContext = createContext(null);

/**
 * Auth Provider Component
 * Wraps the app to provide auth state globally
 */
export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    user: null,           // Firebase user object
    userData: null,       // Firestore user data (includes role)
    isAuthenticated: false,
    isLoading: true,      // Initial auth check in progress
    error: null
  });

  /**
   * Refresh user data from Firestore
   * Used to ensure role is always up-to-date
   */
  const refreshUserData = useCallback(async () => {
    if (authState.user?.uid) {
      try {
        const freshUserData = await getUserById(authState.user.uid);
        if (freshUserData) {
          setAuthState(prev => ({
            ...prev,
            userData: freshUserData,
            isAuthenticated: freshUserData.status === 'active'
          }));
          return freshUserData;
        }
      } catch (error) {
        console.error('Error refreshing user data:', error);
      }
    }
    return null;
  }, [authState.user]);

  /**
   * Handle logout
   */
  const logout = useCallback(async () => {
    try {
      await logoutUser();
      setAuthState({
        user: null,
        userData: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
      return true;
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        error: error.message
      }));
      return false;
    }
  }, []);

  /**
   * Clear any auth errors
   */
  const clearError = useCallback(() => {
    setAuthState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  /**
   * Subscribe to Firebase Auth state on mount
   */
  useEffect(() => {
    console.log('AuthProvider: Setting up auth listener');
    
    const unsubscribe = subscribeToAuth(async (authData) => {
      if (authData) {
        const { firebaseUser, userData } = authData;
        
        // Check if user account is active
        if (userData && userData.status !== 'active') {
          console.log('AuthProvider: User account disabled, logging out');
          await logoutUser();
          setAuthState({
            user: null,
            userData: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Your account has been disabled. Please contact support.'
          });
          return;
        }
        
        setAuthState({
          user: firebaseUser,
          userData,
          isAuthenticated: !!userData && userData.status === 'active',
          isLoading: false,
          error: null
        });
      } else {
        setAuthState({
          user: null,
          userData: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      }
    });

    // Cleanup subscription on unmount
    return () => {
      console.log('AuthProvider: Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  // Context value
  const value = {
    ...authState,
    user: authState.user,
    userData: authState.userData,
    role: authState.userData?.role || null,
    isAdmin: authState.userData?.role === 'admin',
    isStaff: authState.userData?.role === 'staff',
    isCustomer: authState.userData?.role === 'customer',
    logout,
    refreshUserData,
    clearError,
    getRedirectPath: () => getRoleBasedRedirect(authState.userData?.role)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use auth context
 * @returns {Object} Auth context value
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
