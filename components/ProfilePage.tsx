import React, { useState, useRef } from 'react';
import type { UserProfile, UserNotificationSettings } from '../types';
import { SunIcon, MoonIcon, MonitorIcon, UserIcon, SlidersHorizontalIcon, BellIcon, KeyRoundIcon, EditIcon, XIcon, PlusIcon, LoaderIcon, CheckCircleIcon } from './icons';
import ToggleSwitch from './ToggleSwitch';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import ChangePasswordModal from './ChangePasswordModal';
import TwoFactorAuthModal from './TwoFactorAuthModal';

type Theme = 'light' | 'dark' | 'system';

interface ProfilePageProps {
  currentUser: UserProfile;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  notificationSettings: UserNotificationSettings;
  setNotificationSettings: (newSettingsOrUpdater: React.SetStateAction<UserNotificationSettings>) => Promise<void>;
}

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

const SectionCard = ({ title, description, children, footer }: { title: string; description: string; children?: React.ReactNode; footer?: React.ReactNode }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        <div className="p-6 flex-grow">
            {children}
        </div>
        {footer && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 rounded-b-xl">
                {footer}
            </div>
        )}
    </div>
);

const PersonalInfoTab = ({ user }: { user: UserProfile }) => {
    const { handleUpdateUserProfile } = useAuth();
    const [formData, setFormData] = useState({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || '',
        jobTitle: user.jobTitle || '',
    });
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    const handleCancel = () => {
        setFormData({
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone || '',
            jobTitle: user.jobTitle || '',
        });
        setIsDirty(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const success = await handleUpdateUserProfile(user.id, {
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            jobTitle: formData.jobTitle,
        });
        setIsSaving(false);
        if (success) {
            setIsDirty(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        }
    };
    
    return (
        <SectionCard 
            title="Personal Information" 
            description="Update your personal details."
            footer={isDirty && (
                <div className="flex justify-end items-center space-x-3">
                    {saveSuccess && <p className="text-sm text-green-600 flex items-center"><CheckCircleIcon className="w-4 h-4 mr-1" /> Profile saved!</p>}
                    <button onClick={handleCancel} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center">
                        {isSaving && <LoaderIcon className="w-4 h-4 mr-2" />}
                        Save Changes
                    </button>
                </div>
            )}
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
                    <input type="text" value={formData.firstName} onChange={e => handleChange('firstName', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
                    <input type="text" value={formData.lastName} onChange={e => handleChange('lastName', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700"/>
                </div>
                 <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                    <input type="email" value={user.email} readOnly className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-gray-100 dark:bg-gray-900/50 cursor-not-allowed"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                    <input type="tel" value={formData.phone} onChange={e => handleChange('phone', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Job Title</label>
                    <input type="text" value={formData.jobTitle} onChange={e => handleChange('jobTitle', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700"/>
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

const NotificationsTab = ({ settings, setSettings }: { settings: UserNotificationSettings, setSettings: (updater: React.SetStateAction<UserNotificationSettings>) => Promise<void> }) => {
    const [newDay, setNewDay] = useState('');

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
    
    const handleAddDay = () => {
        const day = parseInt(newDay, 10);
        if (!isNaN(day) && day > 0 && !settings.renewalDaysBefore.includes(day)) {
            const newDays = [...settings.renewalDaysBefore, day].sort((a, b) => b - a);
            setSettings(prev => ({ ...prev, renewalDaysBefore: newDays }));
            setNewDay('');
        }
    };

    const handleRemoveDay = (dayToRemove: number) => {
        const newDays = settings.renewalDaysBefore.filter(d => d !== dayToRemove);
        setSettings(prev => ({ ...prev, renewalDaysBefore: newDays }));
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
                                <ToggleSwitch enabled={settings.preferences[notif.key].email} onChange={(val) => handleToggle(notif.key, 'email', val)} />
                            </div>
                            <div className="text-center">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">In-App</label>
                                <ToggleSwitch enabled={settings.preferences[notif.key].inApp} onChange={(val) => handleToggle(notif.key, 'inApp', val)} />
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
             <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
               <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">Renewal Reminder Schedule</h4>
               <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage the specific days before expiration you wish to be notified.</p>
               <div className="mt-4">
                    <div className="flex flex-wrap gap-2">
                        {settings.renewalDaysBefore.map(day => (
                            <div key={day} className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1 text-sm font-medium text-gray-800 dark:text-gray-200">
                                {day} days
                                <button onClick={() => handleRemoveDay(day)} className="ml-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                                    <XIcon className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <input
                            type="number"
                            value={newDay}
                            onChange={e => setNewDay(e.target.value)}
                            placeholder="e.g., 45"
                            className="w-24 rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-sm"
                        />
                         <button onClick={handleAddDay} className="flex items-center px-3 py-1.5 text-sm font-semibold text-primary-900 bg-primary rounded-md hover:bg-primary-600">
                            <PlusIcon className="w-4 h-4 mr-1" />
                            Add
                        </button>
                    </div>
                </div>
           </div>
        </SectionCard>
    )
};

const SecurityTab = ({ onOpenChangePassword, onOpen2faModal }: { onOpenChangePassword: () => void; onOpen2faModal: () => void; }) => {
    const { mfaFactors, handleUnenrollMFA } = useAuth();
    const is2faEnabled = mfaFactors.some(f => f.status === 'verified');

    const handle2faToggle = async () => {
        if (is2faEnabled) {
            if (window.confirm("Are you sure you want to disable Two-Factor Authentication?")) {
                const verifiedFactor = mfaFactors.find(f => f.status === 'verified');
                if (verifiedFactor) {
                    await handleUnenrollMFA(verifiedFactor.id);
                }
            }
        } else {
            onOpen2faModal();
        }
    };

    return (
        <SectionCard title="Security" description="Manage your password and account security settings.">
            <div>
                 <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">Password</h4>
                 <button onClick={onOpenChangePassword} className="mt-2 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">Change password</button>
            </div>
            <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                 <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">Two-Factor Authentication</h4>
                 <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {is2faEnabled 
                        ? "2FA is currently enabled for your account." 
                        : "Add an extra layer of security to your account."
                    }
                </p>
                 <button onClick={handle2faToggle} className={`mt-2 text-sm font-semibold ${is2faEnabled ? 'text-red-600 hover:text-red-700' : 'text-primary-600 hover:text-primary-700'}`}>
                    {is2faEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                </button>
            </div>
        </SectionCard>
    );
};

export default function ProfilePage(props: ProfilePageProps) {
  const { handleAvatarUpload } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [is2faModalOpen, setIs2faModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          await handleAvatarUpload(e.target.files[0]);
      }
  };
  
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
        case 'security': return <SecurityTab onOpenChangePassword={() => setIsChangePasswordOpen(true)} onOpen2faModal={() => setIs2faModalOpen(true)} />;
        default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex items-center space-x-5">
        <div className="relative group flex-shrink-0">
            <img className="h-20 w-20 rounded-full object-cover" src={props.currentUser.avatarUrl} alt="Your profile picture" />
            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/png, image/jpeg" />
            <button 
                onClick={() => fileInputRef.current?.click()} 
                className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-full flex items-center justify-center cursor-pointer"
                aria-label="Change profile picture"
            >
                <EditIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
        </div>
        <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{props.currentUser.firstName} {props.currentUser.lastName}</h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{props.currentUser.jobTitle || props.currentUser.role}</p>
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
      {isChangePasswordOpen && <ChangePasswordModal onClose={() => setIsChangePasswordOpen(false)} />}
      {is2faModalOpen && <TwoFactorAuthModal onClose={() => setIs2faModalOpen(false)} />}
    </div>
  );
}