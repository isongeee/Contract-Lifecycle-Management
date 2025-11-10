
import React, { useState } from 'react';
import type { Contract, UserProfile, UserNotificationSettings } from '../types';
import { RefreshCwIcon, LayoutDashboardIcon, SettingsIcon, CalendarIcon } from './icons';
import RenewalsQueue from './RenewalsQueue';
import RenewalsOverview from './RenewalsOverview';
import RenewalsCalendar from './RenewalsCalendar';
import RenewalsSettings from './RenewalsSettings';

interface RenewalsPageProps {
  contracts: Contract[];
  onSelectContract: (contract: Contract) => void;
  users: UserProfile[];
  notificationSettings: UserNotificationSettings;
  onUpdateNotificationSettings: (settings: UserNotificationSettings) => void;
}

export default function RenewalsPage({ contracts, onSelectContract, users, notificationSettings, onUpdateNotificationSettings }: RenewalsPageProps) {
  const [activeTab, setActiveTab] = useState('queue');

  const renewalContracts = contracts.filter(c => c.renewalRequest);

  const tabs = [
    { id: 'queue', label: 'Queue', icon: <RefreshCwIcon className="h-5 w-5 mr-2" /> },
    { id: 'overview', label: 'Overview', icon: <LayoutDashboardIcon className="h-5 w-5 mr-2" /> },
    { id: 'calendar', label: 'Calendar', icon: <CalendarIcon className="h-5 w-5 mr-2" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="h-5 w-5 mr-2" /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'queue':
        return <RenewalsQueue contracts={renewalContracts} onSelectContract={onSelectContract} />;
      case 'overview':
        return <RenewalsOverview contracts={renewalContracts} />;
      case 'calendar':
        return <RenewalsCalendar contracts={renewalContracts} />;
      case 'settings':
        return <RenewalsSettings settings={notificationSettings} onUpdate={onUpdateNotificationSettings} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Renewals Hub</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage the lifecycle of all upcoming contract renewals.
        </p>
      </div>
      
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-primary text-primary dark:text-primary-300'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {renderContent()}
      </div>
    </div>
  );
}