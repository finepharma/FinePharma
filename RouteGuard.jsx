/**
 * Route Guard Components - Authentication and Role-Based Access Control
 * FinePharma Wholesale
 * 
 * Provides reusable route protection components:
 * - RequireAuth: Ensures user is authenticated
 * - RequireRole: Ensures user has required role(s)
 * - PublicOnly: Prevents logged-in users from accessing public routes
 */

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserById } from '../services/userService';
import { Spinner } from '@/components/ui/spinner';

/**
 * Global loading screen shown while auth state is being determined
 */
export const AuthLoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-50">
    <div className="text-center">
      <Spinner className="w-12 h-12 text-teal-600 mx-auto mb-4" />
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

/**
 * RequireAuth Guard
 * Ensures user is authenticated before rendering children
 * Redirects to login if not authenticated
 */
export const RequireAuth = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated || !user) {
    // Redirect to login, save intended destination
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
};

/**
 * RequireRole Guard
 * Ensures user has one of the required roles
 * Also verifies role from Firestore on every mount (no cached values)
 * Redirects based on actual role if unauthorized
 */
export const RequireRole = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user, userData, logout } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verifiedRole, setVerifiedRole] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Verify role from Firestore on every mount
    const verifyRole = async () => {
      if (!user?.uid) {
        setIsVerifying(false);
        return;
      }

      try {
        // Always fetch fresh user data from Firestore
        const freshUserData = await getUserById(user.uid);
        
        if (!freshUserData) {
          console.error('RouteGuard: User document not found in Firestore');
          await logout();
          setIsVerifying(false);
          return;
        }

        // Check if account is active
        if (freshUserData.status !== 'active') {
          console.error('RouteGuard: User account is disabled');
          await logout();
          setIsVerifying(false);
          return;
        }

        const userRole = freshUserData.role;
        setVerifiedRole(userRole);

        // Check if user has required role
        const hasAccess = allowedRoles.includes(userRole);
        setIsAuthorized(hasAccess);
        
        if (!hasAccess) {
          console.log(`RouteGuard: User role '${userRole}' not in [${allowedRoles.join(', ')}]`);
        }
      } catch (error) {
        console.error('RouteGuard: Error verifying role:', error);
        setIsAuthorized(false);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyRole();
  }, [user, allowedRoles, logout]);

  // Show loading while verifying
  if (isLoading || isVerifying) {
    return <AuthLoadingScreen />;
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Not authorized - redirect based on verified role
  if (!isAuthorized) {
    let redirectPath = '/home';
    
    switch (verifiedRole) {
      case 'admin':
        redirectPath = '/admin-dashboard';
        break;
      case 'staff':
        redirectPath = '/staff-dashboard';
        break;
      case 'customer':
        redirectPath = '/home';
        break;
      default:
        // Unknown role - force logout and redirect to login
        logout();
        redirectPath = '/login';
    }
    
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

/**
 * PublicOnly Guard
 * Prevents logged-in users from accessing public routes (like login)
 * Auto-redirects to appropriate dashboard based on role
 */
export const PublicOnly = ({ children }) => {
  const { isAuthenticated, isLoading, userData } = useAuth();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  // If already logged in, redirect based on role
  if (isAuthenticated && userData?.role) {
    let redirectPath = '/home';
    
    switch (userData.role) {
      case 'admin':
        redirectPath = '/admin-dashboard';
        break;
      case 'staff':
        redirectPath = '/staff-dashboard';
        break;
      case 'customer':
        redirectPath = '/home';
        break;
    }
    
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

/**
 * HomeAccess Guard
 * Special guard for home page - accessible to all authenticated roles
 * But still verifies role from Firestore
 */
export const HomeAccess = ({ children }) => {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const verifyAccess = async () => {
      if (!user?.uid) {
        setIsVerifying(false);
        return;
      }

      try {
        const freshUserData = await getUserById(user.uid);
        
        if (!freshUserData || freshUserData.status !== 'active') {
          await logout();
        }
      } catch (error) {
        console.error('HomeAccess: Error verifying access:', error);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyAccess();
  }, [user, logout]);

  if (isLoading || isVerifying) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
};

export default { RequireAuth, RequireRole, PublicOnly, HomeAccess, AuthLoadingScreen };
