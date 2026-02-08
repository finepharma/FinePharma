/**
 * Auth Context - Global Authentication State Management
 * FinePharma Wholesale
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { subscribeToAuth, logoutUser, getRoleBasedRedirect } from '../services/authService';
import { getUserById } from '../services/userService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {

  const [authState, setAuthState] = useState({
    user: null,
    userData: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  // ---------- SAFE USER DATA REFRESH ----------
  const refreshUserData = useCallback(async () => {
    if (!authState.user?.uid) return null;

    try {
      const freshUserData = await getUserById(authState.user.uid);

      if (!freshUserData) {
        console.error("User doc missing in Firestore");
        return null;
      }

      setAuthState(prev => ({
        ...prev,
        userData: freshUserData,
        isAuthenticated: freshUserData.status === 'active'
      }));

      return freshUserData;

    } catch (err) {
      console.error("refreshUserData crash:", err);
      return null;
    }
  }, [authState.user]);

  // ---------- LOGOUT ----------
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

    } catch (err) {
      console.error("Logout failed:", err);

      setAuthState(prev => ({
        ...prev,
        error: err.message
      }));

      return false;
    }
  }, []);

  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  // ---------- AUTH LISTENER ----------
  useEffect(() => {
    console.log("AuthProvider mounted");

    // 🔥 Fail-safe timeout — prevents infinite spinner
    const failSafe = setTimeout(() => {
      setAuthState(prev => ({
        ...prev,
        isLoading: false
      }));
      console.warn("Auth timeout fallback triggered");
    }, 7000);

    let unsubscribe = () => {};

    try {
      unsubscribe = subscribeToAuth(async (authData) => {
        try {

          if (!authData) {
            setAuthState({
              user: null,
              userData: null,
              isAuthenticated: false,
              isLoading: false,
              error: null
            });
            return;
          }

          const { firebaseUser, userData } = authData;

          // user exists but firestore doc missing
          if (!userData) {
            console.error("Firestore user doc not found");

            setAuthState({
              user: firebaseUser,
              userData: null,
              isAuthenticated: false,
              isLoading: false,
              error: "User profile missing. Contact admin."
            });
            return;
          }

          // disabled user
          if (userData.status !== 'active') {
            await logoutUser();

            setAuthState({
              user: null,
              userData: null,
              isAuthenticated: false,
              isLoading: false,
              error: "Account disabled"
            });
            return;
          }

          setAuthState({
            user: firebaseUser,
            userData,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

        } catch (innerErr) {
          console.error("Auth callback crash:", innerErr);

          setAuthState({
            user: null,
            userData: null,
            isAuthenticated: false,
            isLoading: false,
            error: "Auth processing error"
          });
        }
      });

    } catch (outerErr) {
      console.error("subscribeToAuth crash:", outerErr);

      setAuthState({
        user: null,
        userData: null,
        isAuthenticated: false,
        isLoading: false,
        error: "Auth listener failed"
      });
    }

    return () => {
      clearTimeout(failSafe);
      if (unsubscribe) unsubscribe();
      console.log("AuthProvider unmounted");
    };

  }, []);

  // ---------- CONTEXT VALUE ----------
  const value = {
    ...authState,
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

// ---------- HOOK ----------
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export default AuthContext;
