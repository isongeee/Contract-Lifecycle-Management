import React, { useState, useMemo } from 'react';
import type { Contract, Counterparty } from '../types';
import { ContractStatus } from '../types';
import { SearchIcon, BuildingOfficeIcon, PlusIcon } from './icons';

interface CounterpartyWithMeta extends Counterparty {
    activeContracts: number;
    totalContracts: number;
}

interface CounterpartiesListProps {
  contracts: Contract[];
  counterparties: Counterparty[];
  onSelectCounterparty: (counterparty: Counterparty) => void;
  onStartCreate: () => void;
}

const formatAddress = (counterparty: Counterparty) => {
    return `${counterparty.addressLine1}, ${counterparty.city}, ${counterparty.state}`;
};

const formatFullAddress = (cp: Counterparty) => {
    return [cp.addressLine1, cp.addressLine2, `${cp.city}, ${cp.state} ${cp.zipCode}`, cp.country].filter(Boolean).join(', ');
}

const CounterpartyCard = ({ counterparty, onSelect }: { counterparty: CounterpartyWithMeta; onSelect: () => void; }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200 flex flex-col h-full">
        <div className="p-5">
            <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <BuildingOfficeIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                </div>
                <div>
                    <div className="flex items-center gap-x-3">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">{counterparty.name}</h3>
                        <span className="text-xs font-semibold bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-2 py-0.5 rounded-full">{counterparty.type}</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{formatAddress(counterparty)}</p>
                </div>
            </div>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-3 grid grid-cols-2 gap-2">
            <div className="text-center">
                <p className="text-xl font-bold text-primary-800 dark:text-primary-300">{counterparty.activeContracts}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Active</p>
            </div>
             <div className="text-center">
                <p className="text-xl font-bold text-gray-700 dark:text-gray-200">{counterparty.totalContracts}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Total</p>
            </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 text-right mt-auto">
            <button onClick={onSelect} className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200">
                View Details &rarr;
            </button>
        </div>
    </div>
);


export default function CounterpartiesList({ contracts, counterparties, onSelectCounterparty, onStartCreate }: CounterpartiesListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const counterpartiesWithMeta = useMemo<CounterpartyWithMeta[]>(() => {
    return counterparties.map(cp => {
        const relatedContracts = contracts.filter(c => c.counterparty.id === cp.id);
        return {
            ...cp,
            activeContracts: relatedContracts.filter(c => c.status === ContractStatus.ACTIVE).length,
            totalContracts: relatedContracts.length,
        };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [contracts, counterparties]);

  const filteredCounterparties = counterpartiesWithMeta.filter(cp => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
        cp.name.toLowerCase().includes(searchTermLower) ||
        formatFullAddress(cp).toLowerCase().includes(searchTermLower)
    );
  });

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Counterparties</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage all external organizations and partners you do business with.</p>
            </div>
            <button 
                onClick={onStartCreate}
                className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Counterparty
            </button>
        </div>
        
        <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
                type="search"
                placeholder="Search by name or address..."
                autoComplete="off"
                className="block w-full max-w-lg rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2.5 pl-10 pr-3 text-sm text-gray-900 dark:text-gray-100 placeholder-[#9ca3af] dark:placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCounterparties.map(cp => (
                <CounterpartyCard key={cp.id} counterparty={cp} onSelect={() => onSelectCounterparty(cp)} />
            ))}
        </div>
        
        {filteredCounterparties.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-dashed">
                 <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">No counterparties found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your search for "{searchTerm}" did not match any records.</p>
            </div>
        )}
    </div>
  );
}