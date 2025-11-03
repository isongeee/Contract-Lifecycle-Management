
import React from 'react';
import { LayoutDashboardIcon, FileTextIcon, UsersIcon, BookTextIcon, CheckCircleIcon, SettingsIcon } from './icons';

const NavItem = ({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void; }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 text-left ${
      active
        ? 'bg-primary-100 text-primary-900'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
    { id: 'templates', label: 'Templates', icon: <BookTextIcon className="h-5 w-5" /> },
    { id: 'approvals', label: 'Approvals', icon: <CheckCircleIcon className="h-5 w-5" /> },
];

export default function Sidebar({ activeView, onNavigate }: { activeView: string; onNavigate: (view: string) => void; }) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 hidden md:flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <FileTextIcon className="h-8 w-8 text-primary" />
        <span className="ml-2 text-xl font-bold text-gray-800">CLM System</span>
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
      <div className="px-4 py-6 border-t border-gray-200">
         <NavItem 
            icon={<SettingsIcon className="h-5 w-5" />} 
            label="Settings" 
            onClick={() => onNavigate('settings')}
            active={activeView === 'settings'}
        />
      </div>
    </aside>
  );
}
