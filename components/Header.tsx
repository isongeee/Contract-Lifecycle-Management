import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, UserIcon, SettingsIcon, LogOutIcon, HelpCircleIcon, BuildingOfficeIcon } from './icons';
import type { UserProfile } from '../types';

interface HeaderProps {
    onLogout: () => void;
    onNavigate: (view: string) => void;
    currentUser: UserProfile | null;
}

export default function Header({ onLogout, onNavigate, currentUser }: HeaderProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMenuItemClick = (view: string) => {
    onNavigate(view);
    setIsProfileMenuOpen(false);
  };
  
  const handleLogoutClick = () => {
    onLogout();
    setIsProfileMenuOpen(false);
  }

  if (!currentUser) {
    return (
      <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center justify-end px-6">
        {/* Placeholder or nothing when logged out */}
      </header>
    );
  }

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center justify-end px-6">
      <div className="flex items-center">
        <div className="relative" ref={menuRef}>
          <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center space-x-3 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
            <img
              className="h-9 w-9 rounded-full object-cover"
              src={currentUser.avatarUrl}
              alt="User avatar"
            />
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 text-left">{currentUser.firstName} {currentUser.lastName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser.role}</p>
            </div>
            <div className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              <ChevronDownIcon className={`h-5 w-5 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 border border-gray-200 dark:border-gray-700">
                <div className="px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-200">{currentUser.firstName} {currentUser.lastName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{currentUser.email}</p>
                </div>
                <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                <a href="#" onClick={() => handleMenuItemClick('profile')} className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <UserIcon className="w-4 h-4 mr-3" />
                    My Profile
                </a>
                {currentUser.role === 'Admin' && (
                    <a href="#" onClick={() => handleMenuItemClick('company-settings')} className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <BuildingOfficeIcon className="w-4 h-4 mr-3" />
                        Company Settings
                    </a>
                )}
                <a href="#" onClick={() => alert('Help/Support page not implemented.')} className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <HelpCircleIcon className="w-4 h-4 mr-3" />
                    Help / Support
                </a>
                <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                <a href="#" onClick={handleLogoutClick} className="flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <LogOutIcon className="w-4 h-4 mr-3" />
                    Logout
                </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}