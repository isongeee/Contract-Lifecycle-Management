
import React, { useState } from 'react';
import type { UserProfile, UserNotificationSettings } from '../types';
import { SunIcon, MoonIcon, MonitorIcon, UserIcon, SlidersHorizontalIcon, BellIcon, KeyRoundIcon, EditIcon } from './icons';
import ToggleSwitch from './ToggleSwitch';

type Theme = 'light' | 'dark' | 'system';

interface ProfilePageProps {
  currentUser: UserProfile;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  notificationSettings: UserNotificationSettings;
  setNotificationSettings: React.Dispatch<React.SetStateAction<UserNotificationSettings>>;
}

// FIX: Changed component to React.FC to correctly handle props including the 'key' prop.
const TabButton: React.FC<{ label: string; icon: React.ReactNode; isActive: boolean; onClick: () => void; }> = ({ label, icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150 w-full text-left ${
            isActive
                ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-100'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
    >
        {icon}
        <span className="ml-3">{label}</span>
    </button>
);

const ThemeOption = ({ label, value, icon, current, onClick }: { label: string; value: Theme; icon: React.ReactNode; current: Theme; onClick: (theme: Theme) => void; }) => {
  const isActive = current === value;
  return (
    <button
      onClick={() => onClick(value)}
      className={`rounded-lg border p-4 flex flex-col items-center justify-center space-y-2 w-full transition-colors duration-200 ${
        isActive
          ? 'bg-primary-100 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700 text-primary-800 dark:text-primary-100'
          : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/50'
      }`}
    >
      {icon}
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
};

// FIX: Made children prop optional to satisfy type checker.
const SectionCard = ({ title, description, children }: { title: string; description: string; children?: React.ReactNode; }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        <div className="p-6">
            {children}
        </div>
    </div>
);

const PersonalInfoTab = ({ user }: { user: UserProfile }) => {
    // In a real app, you'd manage form state here
    return (
        <SectionCard title="Personal Information" description="Update your personal details.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
                    <input type="text" defaultValue={user.firstName} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
                    <input type="text" defaultValue={user.lastName} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700"/>
                </div>
                 <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                    <input type="email" defaultValue={user.email} readOnly className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-gray-100 dark:bg-gray-900/50 cursor-not-allowed"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                    <input type="tel" defaultValue={user.phone} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Job Title</label>
                    <input type="text" defaultValue={user.jobTitle} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700"/>
                </div>
            </div>
        </SectionCard>
    );
};

const PreferencesTab = ({ theme, onThemeChange }: { theme: Theme, onThemeChange: (theme: Theme) => void }) => (
    <SectionCard title="Preferences" description="Customize the application to your liking.">
        <div>
            <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">Appearance</h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Choose how the application looks. Select a theme or sync with your system.
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ThemeOption label="Light" value="light" icon={<SunIcon className="w-6 h-6" />} current={theme} onClick={onThemeChange} />
                <ThemeOption label="Dark" value="dark" icon={<MoonIcon className="w-6 h-6" />} current={theme} onClick={onThemeChange} />
                <ThemeOption label="System" value="system" icon={<MonitorIcon className="w-6 h-6" />} current={theme} onClick={onThemeChange} />
            </div>
        </div>
    </SectionCard>
);

const NotificationsTab = ({ settings, setSettings }: { settings: UserNotificationSettings, setSettings: React.Dispatch<React.SetStateAction<UserNotificationSettings>> }) => {
    // FIX: Correctly handle nested state updates within the 'preferences' object.
    const handleToggle = (type: keyof UserNotificationSettings['preferences'], method: 'email' | 'inApp', value: boolean) => {
        setSettings(prev => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                [type]: {
                    ...prev.preferences[type],
                    [method]: value
                }
            }
        }));
    };
    
    const notificationTypes = [
        { key: 'renewals', label: 'Contract Renewals' },
        { key: 'approvals', label: 'Approval Requests' },
        { key: 'tasks', label: 'Task Assignments' },
        { key: 'system', label: 'System Updates' },
    ] as const;

    return (
        <SectionCard title="Notifications" description="Manage how you receive notifications.">
           <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
                {notificationTypes.map(notif => (
                    <li key={notif.key} className="flex items-center justify-between py-4">
                        <p className="font-medium text-gray-800 dark:text-gray-200">{notif.label}</p>
                        <div className="flex items-center space-x-6">
                             <div className="text-center">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email</label>
                                {/* FIX: Access nested 'preferences' object for notification settings. */}
                                <ToggleSwitch enabled={settings.preferences[notif.key].email} onChange={(val) => handleToggle(notif.key, 'email', val)} />
                            </div>
                            <div className="text-center">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">In-App</label>
                                {/* FIX: Access nested 'preferences' object for notification settings. */}
                                <ToggleSwitch enabled={settings.preferences[notif.key].inApp} onChange={(val) => handleToggle(notif.key, 'inApp', val)} />
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </SectionCard>
    )
};

const SecurityTab = () => (
    <SectionCard title="Security" description="Manage your password and account security settings.">
        <div>
             <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">Password</h4>
             <button className="mt-2 text-sm font-semibold text-primary-600 hover:text-primary-700">Change password</button>
        </div>
        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
             <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">Two-Factor Authentication</h4>
             <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add an extra layer of security to your account.</p>
             <button className="mt-2 text-sm font-semibold text-primary-600 hover:text-primary-700">Enable 2FA</button>
        </div>
    </SectionCard>
);

export default function ProfilePage(props: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState('personal');
  
  const tabs = [
    { id: 'personal', label: 'Personal Information', icon: <UserIcon className="w-5 h-5" /> },
    { id: 'preferences', label: 'Preferences', icon: <SlidersHorizontalIcon className="w-5 h-5" /> },
    { id: 'notifications', label: 'Notifications', icon: <BellIcon className="w-5 h-5" /> },
    { id: 'security', label: 'Security', icon: <KeyRoundIcon className="w-5 h-5" /> },
  ];
  
  const renderContent = () => {
    switch (activeTab) {
        case 'personal': return <PersonalInfoTab user={props.currentUser} />;
        case 'preferences': return <PreferencesTab theme={props.theme} onThemeChange={props.onThemeChange} />;
        case 'notifications': return <NotificationsTab settings={props.notificationSettings} setSettings={props.setNotificationSettings}/>;
        case 'security': return <SecurityTab />;
        default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex items-center space-x-5">
        <div className="relative">
            <img className="h-20 w-20 rounded-full" src={props.currentUser.avatarUrl} alt="" />
            <button className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-700 rounded-full p-1 border border-gray-200 dark:border-gray-600 hover:bg-gray-100">
                <EditIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
        </div>
        <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{props.currentUser.firstName} {props.currentUser.lastName}</h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{props.currentUser.role} at ACME Corp</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 space-y-2">
                {tabs.map(tab => (
                    <TabButton 
                        key={tab.id}
                        label={tab.label}
                        icon={tab.icon}
                        isActive={activeTab === tab.id}
                        onClick={() => setActiveTab(tab.id)}
                    />
                ))}
            </div>
        </div>
        <div className="lg:col-span-3">
            {renderContent()}
        </div>
      </div>
    </div>
  );
}