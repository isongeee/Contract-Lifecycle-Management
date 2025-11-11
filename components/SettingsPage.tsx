import React from 'react';
import { UserIcon, BuildingOfficeIcon, ChevronRightIcon } from './icons';
import { useAppContext } from '../contexts/AppContext';

const SettingLinkCard = ({ title, description, icon, onClick }: { title: string, description: string, icon: React.ReactNode, onClick: () => void }) => (
    <button onClick={onClick} className="w-full text-left bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all duration-200">
        <div className="p-6 flex items-center">
            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg mr-5">
                {icon}
            </div>
            <div className="flex-1">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
            </div>
            <ChevronRightIcon className="w-6 h-6 text-gray-400" />
        </div>
    </button>
);

export default function SettingsPage() {
    const { handleNavigate, currentUser } = useAppContext();

    if (!currentUser) return null;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your personal profile and organization settings.</p>
            </div>
            <div className="space-y-4">
                <SettingLinkCard 
                    title="My Profile"
                    description="Update your personal information, preferences, and notification settings."
                    icon={<UserIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />}
                    onClick={() => handleNavigate('profile')}
                />
                {currentUser.role === 'Admin' && (
                    <SettingLinkCard 
                        title="Company Settings"
                        description="Manage users, roles, permissions, and other organization-wide configurations."
                        icon={<BuildingOfficeIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />}
                        onClick={() => handleNavigate('company-settings')}
                    />
                )}
            </div>
        </div>
    );
}