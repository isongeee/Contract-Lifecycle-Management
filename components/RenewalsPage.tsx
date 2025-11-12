import React from 'react';
import type { Contract, UserProfile } from '../types';
import RenewalsQueue from './RenewalsQueue';

interface RenewalsPageProps {
  contracts: Contract[];
  onSelectContract: (contract: Contract) => void;
  onNavigateToWorkspace: (contract: Contract) => void;
  users: UserProfile[];
}

export default function RenewalsPage({ contracts, onSelectContract, onNavigateToWorkspace, users }: RenewalsPageProps) {
  const renewalContracts = contracts.filter(c => c.renewalRequest);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Renewals Hub</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage the lifecycle of all upcoming contract renewals. Reminders are sent automatically based on preferences in your Profile Settings.
        </p>
      </div>
      
      <RenewalsQueue 
        contracts={renewalContracts} 
        users={users}
        onSelectContract={onSelectContract} 
        onNavigateToWorkspace={onNavigateToWorkspace} 
      />
    </div>
  );
}