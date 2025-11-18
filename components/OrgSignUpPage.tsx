import React, { useState } from 'react';
import { FileTextIcon, LoaderIcon, EyeIcon, EyeOffIcon, SparklesIcon, RefreshCwIcon, ShieldCheckIcon } from './icons';
import { orgSignUp } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';

const checkPasswordStrength = (password: string) => {
    let score = 0;
    if (!password) return 0;
    if (password.length >= 8) score++;
    if (/\d/.test(password)) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
};

const PasswordStrengthIndicator = ({ password }: { password: string }) => {
    const strength = checkPasswordStrength(password);
    const bars = [
        { width: 'w-1/4', color: 'bg-red-500' },
        { width: 'w-1/2', color: 'bg-orange-500' },
        { width: 'w-3/4', color: 'bg-yellow-500' },
        { width: 'w-full', color: 'bg-green-500' }
    ];

    if (!password) return null;

    return (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
            <div className={`h-1.5 rounded-full transition-all duration-300 ${bars[strength-1]?.color || ''} ${bars[strength-1]?.width || 'w-0'}`} />
        </div>
    );
};

const FeatureHighlight = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-primary-100 dark:bg-primary-900/20 rounded-lg">
            {icon}
        </div>
        <div>
            <h4 className="font-semibold text-gray-800 dark:text-gray-100">{title}</h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
    </div>
);


export default function OrgSignUpPage() {
  const { setAuthView } = useAuth();
  const [orgName, setOrgName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
        setError('You must accept the terms and conditions.');
        return;
    }
    setIsLoading(true);
    setError('');
    const { error } = await orgSignUp(orgName, fullName, email, password);
    setIsLoading(false);
    if (error) {
      setError(error.message);
    } else {
      alert('Organization created successfully! Please check your email to confirm your account and then log in.');
      setAuthView('login');
    }
  };

  return (
    <div className="w-full max-w-4xl">
      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl overflow-hidden grid md:grid-cols-2">
        <div className="p-8">
            <div className="flex items-center space-x-3 mb-6">
                <FileTextIcon className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold text-gray-800 dark:text-gray-200">CLM System</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Set up your workspace</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Create your company's account. You'll be the first administrator.
            </p>
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="org-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Organization Name</label>
                <div className="mt-1">
                  <input id="org-name" name="org-name" type="text" required value={orgName} onChange={e => setOrgName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700"/>
                </div>
              </div>
              <div>
                <label htmlFor="full-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Your Full Name</label>
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
                <div className="mt-1 relative">
                  <input id="password" name="password" type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700"/>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
                <PasswordStrengthIndicator password={password} />
              </div>
              
              <div className="flex items-start">
                  <div className="flex items-center h-5">
                      <input id="terms" name="terms" type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary" />
                  </div>
                  <div className="ml-3 text-sm">
                      <label htmlFor="terms" className="text-gray-500 dark:text-gray-400">
                          I agree to the <a href="#" className="font-medium text-primary hover:underline">Terms of Service</a> and <a href="#" className="font-medium text-primary hover:underline">Privacy Policy</a>.
                      </label>
                  </div>
              </div>
              
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              
              <div>
                <button
                  type="submit"
                  disabled={isLoading || !termsAccepted}
                  className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-primary-900 bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 disabled:cursor-not-allowed"
                >
                  {isLoading && <LoaderIcon className="w-5 h-5 mr-2" />}
                  Create My Workspace
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
        <div className="hidden md:block bg-gray-50 dark:bg-gray-900/50 p-8 border-l border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Unlock a Smarter Way to Manage Contracts</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Our CLM platform empowers your legal and business teams to take control of the contract lifecycle.</p>
            <div className="mt-8 space-y-6">
                <FeatureHighlight 
                    icon={<SparklesIcon className="w-5 h-5 text-primary-700 dark:text-primary-300" />}
                    title="AI-Powered Insights"
                    description="Leverage Gemini to automatically analyze risk, extract key clauses, and summarize complex documents in seconds."
                />
                <FeatureHighlight 
                    icon={<RefreshCwIcon className="w-5 h-5 text-primary-700 dark:text-primary-300" />}
                    title="Automated Workflows"
                    description="Streamline approvals, renewals, and obligations with configurable workflows that keep everything on track."
                />
                <FeatureHighlight 
                    icon={<ShieldCheckIcon className="w-5 h-5 text-primary-700 dark:text-primary-300" />}
                    title="Secure & Compliant"
                    description="Maintain a single source of truth in a secure, auditable repository with role-based access control."
                />
            </div>
        </div>
      </div>
    </div>
  );
}