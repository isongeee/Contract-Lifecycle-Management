
import React, { useState } from 'react';
import type { UserProfile, Role, NotificationSetting } from '../types';
import { UsersIcon, ShieldCheckIcon, BellIcon, BuildingOfficeIcon, HomeIcon } from './icons';
import UserManagementTab from './UserManagementTab';
import RolesPermissionsTab from './RolesPermissionsTab';
import NotificationsTab from './NotificationsTab';

interface CompanySettingsPageProps {
  users: UserProfile[];
  roles: Role[];
  notificationSettings: NotificationSetting[];
  setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  setRoles: React.Dispatch<React.SetStateAction<Role[]>>;
  setNotificationSettings: React.Dispatch<React.SetStateAction<NotificationSetting[]>>;
}

type ActiveTab = 'users' | 'roles' | 'notifications' | 'counterparties' | 'properties';

// FIX: Changed component to React.FC to correctly handle props including the 'key' prop.
const TabButton: React.FC<{ label: string; icon: React.ReactNode; isActive: boolean; onClick: () => void; }> = ({ label, icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
            isActive
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        }`}
    >
        {icon}
        <span className="ml-2">{label}</span>
    </button>
);

const PlaceholderTab = ({ title }: { title: string }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-500">This section is under construction. Functionality for managing {title.toLowerCase()} will be available here soon.</p>
    </div>
);


export default function CompanySettingsPage(props: CompanySettingsPageProps) {
    const [activeTab, setActiveTab] = useState<ActiveTab>('users');

    const tabs = [
        { id: 'users', label: 'User Management', icon: <UsersIcon className="w-5 h-5" /> },
        { id: 'roles', label: 'Roles & Permissions', icon: <ShieldCheckIcon className="w-5 h-5" /> },
        { id: 'notifications', label: 'Notifications', icon: <BellIcon className="w-5 h-5" /> },
        { id: 'counterparties', label: 'Counterparty Settings', icon: <BuildingOfficeIcon className="w-5 h-5" /> },
        { id: 'properties', label: 'Property Settings', icon: <HomeIcon className="w-5 h-5" /> },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'users':
                return <UserManagementTab users={props.users} roles={props.roles} setUsers={props.setUsers} />;
            case 'roles':
                return <RolesPermissionsTab roles={props.roles} setRoles={props.setRoles} />;
            case 'notifications':
                return <NotificationsTab settings={props.notificationSettings} setSettings={props.setNotificationSettings} />;
            case 'counterparties':
                return <PlaceholderTab title="Counterparty Settings" />;
            case 'properties':
                return <PlaceholderTab title="Property Settings" />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <p className="text-sm text-gray-500">Dashboard &gt; Settings &gt; Company Settings</p>
                <h1 className="text-2xl font-bold text-gray-900 mt-1">Company Settings</h1>
                <p className="mt-1 text-sm text-gray-500">Manage your organization’s users, roles, permissions, and configuration settings.</p>
            </div>

            <div className="flex space-x-2 border-b border-gray-200">
                {tabs.map(tab => (
                    <TabButton
                        key={tab.id}
                        label={tab.label}
                        icon={tab.icon}
                        isActive={activeTab === tab.id}
                        onClick={() => setActiveTab(tab.id as ActiveTab)}
                    />
                ))}
            </div>

            <div>
                {renderContent()}
            </div>
        </div>
    );
}
