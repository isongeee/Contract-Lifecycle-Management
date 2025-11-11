import React, { useState } from 'react';
import { SearchIcon } from './icons';
import { useAppContext } from '../contexts/AppContext';

export default function GlobalSearchInput() {
    const [searchTerm, setSearchTerm] = useState('');
    const { handleGlobalSearch } = useAppContext();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            handleGlobalSearch(searchTerm.trim());
        }
    };

    return (
        <form onSubmit={handleSubmit} className="relative w-full max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
                type="search"
                placeholder="Search all contract documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 py-2 pl-10 pr-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary"
            />
        </form>
    );
}
