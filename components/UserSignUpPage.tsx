import React, { useState } from 'react';
import { FileTextIcon, LoaderIcon } from './icons';
import { userSignUp } from '../lib/auth';
import { useAppContext } from '../contexts/AppContext';

export default function UserSignUpPage() {
  const { setAuthView } = useAppContext();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const { error } = await userSignUp(fullName, email, password, inviteCode);
    setIsLoading(false);
    if (error) {
      setError(error.message);
    } else {
      alert('Account created successfully! Please check your email to confirm your account and then log in.');
      setAuthView('login');
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8">
        <div className="flex flex-col items-center">
           <div className="h-16 w-16 flex items-center justify-center bg-primary-100 dark:bg-primary-900/20 rounded-full mb-4">
              <FileTextIcon className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100">Join Your Organization</h2>
          <p className="mt-2 text-sm text-center text-gray-600 dark:text-gray-400">
            Enter your details and the invite code from your administrator.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="full-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
            <div className="mt-1">
              <input id="full-name" name="full-name" type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700"/>
            </div>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email address</label>
            <div className="mt-1">
              <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700"/>
            </div>
          </div>
          <div>
            <label htmlFor="password"className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
            <div className="mt-1">
              <input id="password" name="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700"/>
            </div>
          </div>
           <div>
            <label htmlFor="invite-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Organization Invite Code</label>
            <div className="mt-1">
              <input id="invite-code" name="invite-code" type="text" required value={inviteCode} onChange={e => setInviteCode(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700"/>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-primary-900 bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300"
            >
              {isLoading && <LoaderIcon className="w-5 h-5 mr-2" />}
              Sign Up
            </button>
          </div>
        </form>
        <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
                <button onClick={() => setAuthView('login')} className="font-medium text-primary hover:text-primary-500">
                    Sign in
                </button>
            </p>
        </div>
      </div>
    </div>
  );
}