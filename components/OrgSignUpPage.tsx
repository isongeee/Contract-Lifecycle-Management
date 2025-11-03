import React from 'react';
import { FileTextIcon } from './icons';

interface OrgSignUpPageProps {
  onSignUp: () => void;
  onNavigate: (view: 'login') => void;
}

export default function OrgSignUpPage({ onSignUp, onNavigate }: OrgSignUpPageProps) {
  return (
    <div className="w-full max-w-md">
      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8">
        <div className="flex flex-col items-center">
          <div className="h-16 w-16 flex items-center justify-center bg-primary-100 dark:bg-primary-900/20 rounded-full mb-4">
              <FileTextIcon className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100">Create an Organization Account</h2>
          <p className="mt-2 text-sm text-center text-gray-600 dark:text-gray-400">
            Get your team started with the best CLM platform.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={(e) => { e.preventDefault(); onSignUp(); }}>
          <div>
            <label htmlFor="org-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Organization Name</label>
            <div className="mt-1">
              <input id="org-name" name="org-name" type="text" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700"/>
            </div>
          </div>
          <div>
            <label htmlFor="full-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Your Full Name</label>
            <div className="mt-1">
              <input id="full-name" name="full-name" type="text" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700"/>
            </div>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email address</label>
            <div className="mt-1">
              <input id="email" name="email" type="email" autoComplete="email" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700"/>
            </div>
          </div>
          <div>
            <label htmlFor="password"className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
            <div className="mt-1">
              <input id="password" name="password" type="password" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700"/>
            </div>
          </div>
          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Create Account
            </button>
          </div>
        </form>
        <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
                <button onClick={() => onNavigate('login')} className="font-medium text-primary hover:text-primary-500">
                    Sign in
                </button>
            </p>
        </div>
      </div>
    </div>
  );
}