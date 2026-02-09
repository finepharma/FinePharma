/**
 * Main App Component - FinePharma Wholesale
 * 
 * Root component that sets up:
 * - Auth Provider for global auth state
 * - React Router with protected routes
 * - Route guards for role-based access
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RequireAuth, RequireRole, PublicOnly, HomeAccess } from './guards/RouteGuard';

// Pages
import Login from './pages/Login';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard';

// Components
import InvoiceGenerator from './components/invoice/InvoiceGenerator';

/**
 * App Component
 * Wraps the entire application with AuthProvider and Router
 */
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={
              <PublicOnly>
                <Login />
              </PublicOnly>
            } 
          />

          {/* Protected Routes - All Authenticated Users */}
          <Route 
            path="/home" 
            element={
              <HomeAccess>
                <Home />
              </HomeAccess>
            } 
          />

          {/* Admin Only Routes */}
          <Route 
            path="/admin-dashboard" 
            element={
              <RequireRole allowedRoles={['admin']}>
                <AdminDashboard />
              </RequireRole>
            } 
          />

          {/* Staff Only Routes */}
          <Route 
            path="/staff-dashboard" 
            element={
              <RequireRole allowedRoles={['staff']}>
                <StaffDashboard />
              </RequireRole>
            } 
          />

          {/* Invoice Generator - Admin and Staff */}
          <Route 
            path="/invoices/generate" 
            element={
              <RequireRole allowedRoles={['admin', 'staff']}>
                <InvoiceGenerator />
              </RequireRole>
            } 
          />

          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/home" replace />} />
          
          {/* 404 - Redirect to home */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
