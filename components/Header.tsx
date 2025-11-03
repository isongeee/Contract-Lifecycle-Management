import React, { useState, useRef, useEffect } from 'react';
import { SearchIcon, ChevronDownIcon, UserIcon, SettingsIcon, LogOutIcon } from './icons';

interface HeaderProps {
    onLogout: () => void;
    onNavigate: (view: string) => void;
}

export default function Header({ onLogout, onNavigate }: HeaderProps) {
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

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center justify-between px-6">
      <div className="flex items-center">
        {/* Can be used for breadcrumbs or page title */}
      </div>
      <div className="flex items-center space-x-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search contracts..."
            className="w-64 pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary placeholder-[#9ca3af] dark:placeholder-gray-400 text-gray-900 dark:text-gray-200"
          />
        </div>
        <div className="relative" ref={menuRef}>
          <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center space-x-3 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
            <img
              className="h-9 w-9 rounded-full object-cover"
              src="https://i.pravatar.cc/150?u=user-1"
              alt="User avatar"
            />
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 text-left">Alice Johnson</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Legal Counsel</p>
            </div>
            <div className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              <ChevronDownIcon className={`h-5 w-5 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 border border-gray-200 dark:border-gray-700">
                <a href="#" onClick={() => alert('Profile page not yet implemented.')} className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <UserIcon className="w-4 h-4 mr-2" />
                    Profile
                </a>
                <a href="#" onClick={() => handleMenuItemClick('settings')} className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <SettingsIcon className="w-4 h-4 mr-2" />
                    Settings
                </a>
                <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                <a href="#" onClick={handleLogoutClick} className="flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <LogOutIcon className="w-4 h-4 mr-2" />
                    Logout
                </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}