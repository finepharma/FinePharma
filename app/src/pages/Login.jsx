/**
 * Login/Signup Page - FinePharma Wholesale
 * 
 * Features:
 * - Email/password authentication with Firebase Auth
 * - Signup with name, email, password, confirm password
 * - Toggle between login and signup modes
 * - Show/hide password toggle
 * - Remember me checkbox
 * - Forgot password link
 * - Proper error messages
 * - Loading spinner during auth
 * - Mobile responsive design
 * - Auto-redirect if already logged in
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loginUser, signupUser, resetPassword } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Mail, Lock, Pill, AlertCircle, User } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Mode state: 'login' or 'signup'
  const [mode, setMode] = useState('login');
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Get redirect path from location state or default based on role
  const from = location.state?.from || '/home';

  /**
   * Toggle between login and signup modes
   */
  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError('');
    setSuccess('');
    setResetEmailSent(false);
  };

  /**
   * Validate signup form
   */
  const validateSignup = () => {
    if (!name.trim()) {
      throw new Error('Please enter your full name');
    }
    if (name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters');
    }
    if (!email.trim()) {
      throw new Error('Please enter your email address');
    }
    if (!password) {
      throw new Error('Please enter a password');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }
  };

  /**
   * Validate login form
   */
  const validateLogin = () => {
    if (!email.trim()) {
      throw new Error('Please enter your email address');
    }
    if (!password) {
      throw new Error('Please enter your password');
    }
  };

  /**
   * Handle login form submission
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      validateLogin();

      // Attempt login
      const { userData } = await loginUser(email.trim(), password);
      
      // Redirect based on role
      let redirectPath = from;
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
        default:
          redirectPath = '/home';
      }
      
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle signup form submission
   */
  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      validateSignup();

      // Attempt signup
      const { userData } = await signupUser(
        email.trim(),
        password,
        name.trim()
      );
      
      // Show success and switch to login
      setSuccess('Account created successfully! Please sign in.');
      setMode('login');
      // Clear password fields
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle forgot password
   */
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first');
      return;
    }

    setIsResetting(true);
    setError('');

    try {
      await resetPassword(email.trim());
      setResetEmailSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const isLogin = mode === 'login';

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse" />
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-xl border-0">
        <CardHeader className="text-center space-y-4">
          {/* Logo */}
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
            <Pill className="w-8 h-8 text-white" />
          </div>
          
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              FinePharma Wholesale
            </CardTitle>
            <CardDescription className="text-gray-500 mt-1">
              {isLogin ? 'Sign in to your account' : 'Create a new account'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Password Reset Success */}
          {resetEmailSent && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-blue-800">
                Password reset email sent! Check your inbox.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-4">
            {/* Name Field - Signup Only */}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 h-11"
                    disabled={isLoading}
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isLogin ? 'Enter your password' : 'Create a password (min 6 chars)'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11"
                  disabled={isLoading}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Field - Signup Only */}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-700">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 h-11"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Remember Me & Forgot Password - Login Only */}
            {isLogin && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={setRememberMe}
                    disabled={isLoading}
                  />
                  <Label
                    htmlFor="remember"
                    className="text-sm text-gray-600 cursor-pointer"
                  >
                    Remember me
                  </Label>
                </div>
                
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isResetting || isLoading}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium disabled:opacity-50"
                >
                  {isResetting ? 'Sending...' : 'Forgot password?'}
                </button>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Spinner className="w-4 h-4" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </Button>
          </form>

          {/* Toggle Mode Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              <button
                type="button"
                onClick={toggleMode}
                className="ml-1 text-teal-600 hover:text-teal-700 font-medium"
                disabled={isLoading}
              >
                {isLogin ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500 pt-4 border-t">
            <p>Wholesale Pharmacy Management System</p>
            <p className="mt-1">© 2025 FinePharma. All rights reserved.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
