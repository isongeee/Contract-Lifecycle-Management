import React from 'react';
import { LayoutDashboardIcon, FileTextIcon, UsersIcon, BookTextIcon, CheckCircleIcon, SettingsIcon, HomeIcon, BuildingOfficeIcon, UserIcon } from './icons';

const NavItem = ({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void; }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 text-left ${
      active
        ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-900 dark:text-primary-100'
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
    }`}
  >
    {icon}
    <span className="ml-3">{label}</span>
  </button>
);

const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboardIcon className="h-5 w-5" /> },
    { id: 'contracts', label: 'Contracts', icon: <FileTextIcon className="h-5 w-5" /> },
    { id: 'counterparties', label: 'Counterparties', icon: <UsersIcon className="h-5 w-5" /> },
    { id: 'properties', label: 'Properties', icon: <HomeIcon className="h-5 w-5" /> },
    { id: 'templates', label: 'Templates', icon: <BookTextIcon className="h-5 w-5" /> },
    { id: 'approvals', label: 'Approvals', icon: <CheckCircleIcon className="h-5 w-5" /> },
];

export default function Sidebar({ activeView, onNavigate }: { activeView: string; onNavigate: (view: string) => void; }) {
  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0 hidden md:flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-700">
        <FileTextIcon className="h-8 w-8 text-primary" />
        <span className="ml-2 text-xl font-bold text-gray-800 dark:text-gray-200">CLM System</span>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map(item => (
            <NavItem 
                key={item.id}
                icon={item.icon} 
                label={item.label} 
                active={activeView === item.id} 
                onClick={() => onNavigate(item.id)}
            />
        ))}
      </nav>
      <div className="px-4 py-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
        <p className="px-4 text-xs font-semibold text-gray-400 uppercase">Settings</p>
         <NavItem 
            icon={<UserIcon className="h-5 w-5" />} 
            label="My Profile" 
            onClick={() => onNavigate('profile')}
            active={activeView === 'profile'}
        />
         <NavItem 
            icon={<BuildingOfficeIcon className="h-5 w-5" />} 
            label="Company Settings" 
            onClick={() => onNavigate('company-settings')}
            active={activeView === 'company-settings'}
        />
      </div>
    </aside>
  );
}