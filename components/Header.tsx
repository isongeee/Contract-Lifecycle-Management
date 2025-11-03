
import React from 'react';
import { SearchIcon, ChevronDownIcon } from './icons';

export default function Header() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex-shrink-0 flex items-center justify-between px-6">
      <div className="flex items-center">
        {/* Can be used for breadcrumbs or page title */}
      </div>
      <div className="flex items-center space-x-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search contracts..."
            className="w-64 pl-10 pr-4 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-primary focus:border-primary placeholder-[#9ca3af]"
          />
        </div>
        <div className="flex items-center space-x-3">
          <img
            className="h-9 w-9 rounded-full object-cover"
            src="https://i.pravatar.cc/150?u=user-1"
            alt="User avatar"
          />
          <div>
            <p className="text-sm font-semibold text-gray-800">Alice Johnson</p>
            <p className="text-xs text-gray-500">Legal Counsel</p>
          </div>
          <button className="text-gray-500 hover:text-gray-700">
            <ChevronDownIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
