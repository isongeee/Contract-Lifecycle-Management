import React, { useState } from 'react';
import { FileTextIcon, LoaderIcon } from './icons';
import { signIn, resetPassword } from '../lib/auth';

interface LoginPageProps {
  onLogin: () => void;
  onNavigate: (view: 'org-signup' | 'user-signup') => void;
}

export default function LoginPage({ onLogin, onNavigate }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'login' | 'reset'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      setError(error.message);
    } else {
      onLogin(); // App.tsx's onAuthStateChange handles the rest
    }
  };
  
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResetError('');
    setResetMessage('');
    const { error } = await resetPassword(resetEmail);
    setIsLoading(false);
    if (error) {
        setResetError(error.message);
    } else {
        setResetMessage('If an account with that email exists, a password reset link has been sent.');
    }
  }

  const renderLoginView = () => (
    <>
      <div className="flex flex-col items-center">
        <div className="h-16 w-16 flex items-center justify-center bg-primary-100 dark:bg-primary-900/20 rounded-full mb-4">
          <FileTextIcon className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100">Sign in to your account</h2>
        <p className="mt-2 text-sm text-center text-gray-600 dark:text-gray-400">
          Welcome back to the CLM System.
        </p>
      </div>
      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email address
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
            />
          </div>
        </div>
        <div>
          <label htmlFor="password"className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Password
          </label>
          <div className="mt-1">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <button type="button" onClick={() => setView('reset')} className="font-medium text-primary hover:text-primary-500">
              Forgot your password?
            </button>
          </div>
        </div>
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-primary-900 bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300"
          >
            {isLoading && <LoaderIcon className="w-5 h-5 mr-2" />}
            Sign in
          </button>
        </div>
      </form>
      <div className="mt-6">
          <div className="relative">
              <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                  <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">New to CLM System?</span>
              </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                  <button
                      onClick={() => onNavigate('org-signup')}
                      className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                      Create Organization
                  </button>
              </div>
              <div>
                  <button
                      onClick={() => onNavigate('user-signup')}
                      className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                      Join with Invite Code
                  </button>
              </div>
          </div>
      </div>
    </>
  );

  const renderResetView = () => (
    <>
      <div className="flex flex-col items-center">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100">Reset Your Password</h2>
        <p className="mt-2 text-sm text-center text-gray-600 dark:text-gray-400">
          Enter your email and we'll send you a link to get back into your account.
        </p>
      </div>
      <form className="mt-8 space-y-6" onSubmit={handlePasswordReset}>
        <div>
          <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email address
          </label>
          <div className="mt-1">
            <input
              id="reset-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-gray-700"
            />
          </div>
        </div>
        {resetError && <p className="text-sm text-red-600">{resetError}</p>}
        {resetMessage && <p className="text-sm text-green-600">{resetMessage}</p>}
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-primary-900 bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300"
          >
            {isLoading && <LoaderIcon className="w-5 h-5 mr-2" />}
            Send Password Reset Email
          </button>
        </div>
      </form>
      <div className="mt-6 text-center">
        <p className="text-sm">
          <button onClick={() => setView('login')} className="font-medium text-primary hover:text-primary-500">
            &larr; Back to login
          </button>
        </p>
      </div>
    </>
  );

  return (
    <div className="w-full max-w-md">
      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8">
        {view === 'login' ? renderLoginView() : renderResetView()}
      </div>
    </div>
  );
}
