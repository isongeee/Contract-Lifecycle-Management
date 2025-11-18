import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { getUserProfile, signOut, adminCreateUser } from '../lib/auth';
import type { UserProfile } from '../types';

interface AuthContextType {
  session: Session | null;
  currentUser: UserProfile | null;
  company: { id: string; name: string; slug: string; } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authView: 'login' | 'org-signup' | 'user-signup';
  setAuthView: React.Dispatch<React.SetStateAction<'login' | 'org-signup' | 'user-signup'>>;
  handleLogin: () => void;
  handleLogout: () => Promise<void>;
  mfaFactors: any[];
  handleAvatarUpload: (file: File) => Promise<void>;
  handleChangePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  handleEnrollMFA: () => Promise<any>;
  handleVerifyMFA: (factorId: string, code: string) => Promise<any>;
  handleUnenrollMFA: (factorId: string) => Promise<any>;
  handleCreateUser: (userData: any) => Promise<void>;
  handleUpdateUserProfile: (userId: string, updates: Partial<UserProfile>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children?: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<{ id: string; name: string; slug: string; } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'org-signup' | 'user-signup'>('login');
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);

  useEffect(() => {
    const initializeAuth = async () => {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setIsAuthenticated(!!session);
        
        if (session?.user) {
            const profile = await getUserProfile(session.user.id);
            setCurrentUser(profile);
            if (!profile) {
                // Valid session but no profile (edge case), waiting for initial load or manual sign out
            } else if (profile.companyId) {
                const { data: companyData } = await supabase.from('companies').select('id, name, slug').eq('id', profile.companyId).single();
                setCompany(companyData);
            }
        }
        setIsLoading(false);
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setSession(session);
        setIsAuthenticated(!!session);
        if (session?.user) {
             // Ideally we don't re-fetch if we already have the user, but simplistic for now
            const profile = await getUserProfile(session.user.id);
            setCurrentUser(profile);
            if (!profile) {
                 await signOut();
            } else if (profile.companyId) {
                const { data: companyData } = await supabase.from('companies').select('id, name, slug').eq('id', profile.companyId).single();
                setCompany(companyData);
            }
        } else {
            setCurrentUser(null);
            setCompany(null);
        }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto-refresh session when tab becomes visible to prevent stale token issues after long inactivity
  useEffect(() => {
    const handleVisibilityChange = async () => {
        if (document.visibilityState === 'visible') {
            const { data } = await supabase.auth.getSession();
            if (data.session) {
                setSession(data.session);
            }
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    const fetchMfaStatus = async () => {
        if (currentUser) {
            const { data: mfaData } = await supabase.auth.mfa.listFactors();
            if (mfaData) {
                setMfaFactors(mfaData.all);
            }
        } else {
            setMfaFactors([]);
        }
    };
    fetchMfaStatus();
  }, [currentUser]);

  const handleLogin = () => {
      // Logic to run after successful login if needed. 
      // Currently just a placeholder as auth state change handles the redirect/state update.
      setAuthView('login'); 
  };

  const handleLogout = async () => {
    // 1. Optimistically clear local state immediately.
    // This prevents the UI from hanging if the network request fails or times out
    // due to a stale connection after the computer wakes from sleep.
    setAuthView('login');
    setCurrentUser(null);
    setCompany(null);
    setIsAuthenticated(false);
    setSession(null);

    try {
        // 2. Attempt server-side sign out in the background.
        // We race the signOut against a timeout to ensure we don't hang if the network is unresponsive.
        const signOutPromise = signOut();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Sign out timeout')), 3000)
        );
        
        await Promise.race([signOutPromise, timeoutPromise]);
    } catch (error) {
        console.warn("Logout network request failed or timed out (expected if offline or stale token)", error);
        // Force cleanup of local storage if supabase client failed or timed out
        localStorage.clear();
    }
  };

  const handleAvatarUpload = useCallback(async (file: File) => {
    if (!currentUser) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `${currentUser.id}.${fileExt}`;
    const filePath = `avatars/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      alert('Failed to upload avatar.');
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = data.publicUrl;

    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: `${publicUrl}?t=${new Date().getTime()}` }) // Add timestamp to bust cache
      .eq('id', currentUser.id);

    if (updateError) {
      console.error('Error updating user avatar URL:', updateError);
    } else {
      setCurrentUser(prev => prev ? { ...prev, avatarUrl: `${publicUrl}?t=${new Date().getTime()}` } : null);
    }
  }, [currentUser]);

  const handleUpdateUserProfile = useCallback(async (userId: string, updates: Partial<UserProfile>): Promise<boolean> => {
    const dbUpdates = {
        first_name: updates.firstName,
        last_name: updates.lastName,
        phone: updates.phone,
        job_title: updates.jobTitle,
    };

    const { error } = await supabase.from('users').update(dbUpdates).eq('id', userId);
    if (error) {
        console.error("Error updating user profile:", error);
        alert(`Failed to update profile: ${error.message}`);
        return false;
    }
    
    // Optimistically update local state
    if(currentUser?.id === userId) {
        setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    }
    return true;
  }, [currentUser?.id]);

  const handleChangePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  }, []);

  const handleEnrollMFA = useCallback(async () => {
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (!enrollError) {
        const { data: mfaData } = await supabase.auth.mfa.listFactors();
        if (mfaData) setMfaFactors(mfaData.all);
    }
    return { data, error: enrollError };
  }, []);

  const handleVerifyMFA = useCallback(async (factorId: string, code: string) => {
    const { data, error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
     if (!verifyError) {
        const { data: mfaData } = await supabase.auth.mfa.listFactors();
        if (mfaData) setMfaFactors(mfaData.all);
    }
    return { data, error: verifyError };
  }, []);

  const handleUnenrollMFA = useCallback(async (factorId: string) => {
    const { data, error } = await supabase.auth.mfa.unenroll({ factorId });
    if (!error) {
      setMfaFactors(prev => prev.filter(f => f.id !== factorId));
    }
    return { data, error };
  }, []);

  const handleCreateUser = async (userData: any) => {
    if (!currentUser || !company) {
        alert("Cannot create user: missing current user or company context.");
        return;
    }
    const { error } = await adminCreateUser({
        ...userData,
        companyId: company.id,
        appId: currentUser.appId,
    });
    if (error) {
        alert(`Failed to create user: ${error.message}`);
    }
  };

  return (
    <AuthContext.Provider value={{
        session,
        currentUser,
        company,
        isAuthenticated,
        isLoading,
        authView,
        setAuthView,
        handleLogin,
        handleLogout,
        mfaFactors,
        handleAvatarUpload,
        handleChangePassword,
        handleEnrollMFA,
        handleVerifyMFA,
        handleUnenrollMFA,
        handleCreateUser,
        handleUpdateUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};