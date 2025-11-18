import React, { useState, useEffect } from 'react';
import { XIcon, LoaderIcon, CheckCircleIcon, CopyIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';

interface TwoFactorAuthModalProps {
  onClose: () => void;
}

type Step = 'loading' | 'enroll' | 'verify' | 'success';

export default function TwoFactorAuthModal({ onClose }: TwoFactorAuthModalProps) {
  const { handleEnrollMFA, handleVerifyMFA } = useAuth();
  const [step, setStep] = useState<Step>('loading');
  const [enrollData, setEnrollData] = useState<any>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const startEnrollment = async () => {
      const { data, error: enrollError } = await handleEnrollMFA();
      if (enrollError) {
        setError(`Failed to start 2FA enrollment: ${enrollError.message}`);
        setStep('enroll'); // Show error on enroll screen
      } else {
        setEnrollData(data.totp);
        setStep('enroll');
      }
    };
    startEnrollment();
  }, [handleEnrollMFA]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const factorId = enrollData?.id;
    if (!verificationCode.trim() || !factorId) return;
    
    setIsLoading(true);
    setError('');
    const { error: verifyError } = await handleVerifyMFA(factorId, verificationCode);
    setIsLoading(false);
    
    if (verifyError) {
      setError(`Verification failed: ${verifyError.message}. Please try again.`);
    } else {
      setStep('success');
      setTimeout(() => onClose(), 2000);
    }
  };

  const handleCopySecret = () => {
    if (enrollData?.secret) {
        navigator.clipboard.writeText(enrollData.secret);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'loading':
        return <div className="flex flex-col items-center justify-center h-64"><LoaderIcon className="w-8 h-8 text-primary" /><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Preparing 2FA setup...</p></div>;
      case 'success':
        return <div className="flex flex-col items-center justify-center h-64"><CheckCircleIcon className="w-12 h-12 text-green-500" /><p className="mt-2 text-md font-medium text-gray-900 dark:text-gray-100">Two-Factor Authentication Enabled!</p></div>;
      case 'enroll':
        return (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">Scan the QR code with your authenticator app (like Google Authenticator or Authy), then enter the code to verify.</p>
            {enrollData?.qr_code ? (
              <div className="flex flex-col items-center my-4">
                <div className="p-4 bg-white rounded-lg" dangerouslySetInnerHTML={{ __html: enrollData.qr_code }} />
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Or manually enter this code:</p>
                <div className="mt-2 flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 p-2 rounded-md">
                    <code className="text-md font-mono text-gray-800 dark:text-gray-200">{enrollData.secret}</code>
                    <button onClick={handleCopySecret} title="Copy secret" className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">
                        {copied ? <CheckCircleIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4 text-gray-500" />}
                    </button>
                </div>
              </div>
            ) : <div className="h-40 flex items-center justify-center"><LoaderIcon className="w-6 h-6" /></div>}

            <form onSubmit={handleVerify} className="space-y-4">
                <div>
                    <label htmlFor="2fa-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Verification Code</label>
                    <input id="2fa-code" type="text" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} required pattern="\d{6}" title="Enter the 6-digit code from your app" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-primary focus:border-primary text-center text-lg tracking-widest" />
                </div>
                {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
                <div className="bg-gray-50 dark:bg-gray-800/50 -mx-6 -mb-4 pt-3 sm:flex sm:flex-row-reverse sm:px-6">
                    <button type="submit" disabled={isLoading} className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-900 shadow-sm hover:bg-primary-600 disabled:opacity-50 sm:ml-3 sm:w-auto">
                        {isLoading && <LoaderIcon className="w-5 h-5 mr-2" />}
                        Verify & Enable
                    </button>
                    <button type="button" onClick={onClose} className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 sm:mt-0 sm:w-auto">
                        Cancel
                    </button>
                </div>
            </form>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative z-30" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md">
                    <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                        <button type="button" onClick={onClose} className="rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                            <span className="sr-only">Close</span>
                            <XIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                    </div>
                    <div className="bg-white dark:bg-gray-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                        <h3 className="text-lg font-semibold leading-6 text-gray-900 dark:text-gray-100" id="modal-title">
                            Set Up Two-Factor Authentication
                        </h3>
                        <div className="mt-4">
                            {renderContent()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}