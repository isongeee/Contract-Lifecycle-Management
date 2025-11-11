import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, UserIcon, SettingsIcon, LogOutIcon, HelpCircleIcon, BuildingOfficeIcon, BellIcon } from './icons';
import type { Notification } from '../types';
import NotificationPanel from './NotificationPanel';
import { useAppContext } from '../contexts/AppContext';
import GlobalSearchInput from './GlobalSearchInput';

export default function Header() {
  const { 
    handleLogout, 
    handleNavigate, 
    currentUser, 
    unreadCount, 
    notifications, 
    handleNotificationClick, 
    handleMarkAllAsRead 
  } = useAppContext();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (notificationPanelRef.current && !notificationPanelRef.current.contains(event.target as Node)) {
        setIsNotificationPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMenuItemClick = (view: string) => {
    handleNavigate(view);
    setIsProfileMenuOpen(false);
  };
  
  const handleLogoutClick = () => {
    handleLogout();
    setIsProfileMenuOpen(false);
  }

  if (!currentUser) {
    return (
      <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center justify-end px-6">
      </header>
    );
  }

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center justify-between px-6 gap-x-6">
      <div className="flex-1">
        <GlobalSearchInput />
      </div>
      <div className="flex items-center space-x-4">
        <div className="relative" ref={notificationPanelRef}>
            <button onClick={() => setIsNotificationPanelOpen(prev => !prev)} className="relative p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200">
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-xs items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>
                    </span>
                )}
            </button>
            {isNotificationPanelOpen && (
                <NotificationPanel 
                    notifications={notifications}
                    onNotificationClick={(n) => {
                      handleNotificationClick(n);
                      setIsNotificationPanelOpen(false);
                    }}
                    onMarkAllAsRead={handleMarkAllAsRead}
                />
            )}
        </div>
        <div className="relative" ref={profileMenuRef}>
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
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 border border-gray-200 dark:border-gray-700 z-10">
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
                <button onClick={handleLogoutClick} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <LogOutIcon className="w-4 h-4 mr-3" />
                    Logout
                </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}