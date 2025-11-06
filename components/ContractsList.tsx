import React, { useState, useEffect, useMemo } from 'react';
import type { Contract, UserProfile } from '../types';
import { ContractStatus, ContractType, RiskLevel, ContractFrequency } from '../types';
import StatusTag from './StatusTag';
import { SearchIcon, ChevronDownIcon, PlusIcon, ArrowUpIcon, ArrowDownIcon } from './icons';

interface ContractsListProps {
  contracts: Contract[];
  onSelectContract: (contract: Contract) => void;
  onStartCreate: () => void;
  initialFilters?: { status?: string; riskLevels?: RiskLevel[]; ownerId?: string };
  currentUser: UserProfile;
}

interface FilterOption {
  value: string;
  label:string;
}

const FilterDropdown = ({ label, options, selected, onChange }: { label: string; options: FilterOption[]; selected: string; onChange: (value: string) => void; }) => (
    <div className="relative">
        <select 
            className="appearance-none w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-gray-200"
            value={selected}
            onChange={(e) => onChange(e.target.value)}
        >
            <option value="">All {label}</option>
            {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
            <ChevronDownIcon className="h-4 w-4" />
        </div>
    </div>
);

const typeOptions = Object.values(ContractType).map(t => ({ value: t, label: t }));
const statusOptions = Object.values(ContractStatus).map(s => ({ value: s, label: s }));
const riskOptions = Object.values(RiskLevel).map(r => ({ value: r, label: r }));
const frequencyOptions = Object.values(ContractFrequency).map(f => ({ value: f, label: f }));

export default function ContractsList({ contracts, onSelectContract, onStartCreate, initialFilters = {}, currentUser }: ContractsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialFilters.status || '');
  const [typeFilter, setTypeFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState(initialFilters.ownerId || '');
  const [sortKey, setSortKey] = useState('endDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    setStatusFilter(initialFilters.status || '');
    setOwnerFilter(initialFilters.ownerId || '');
    if (initialFilters.riskLevels?.includes(RiskLevel.HIGH) && initialFilters.riskLevels?.includes(RiskLevel.CRITICAL)) {
        setRiskFilter('HighAndCritical');
    } else {
        setRiskFilter('');
    }
    // Reset other filters unless they are the primary one being set
    if (!initialFilters.status) setStatusFilter('');
    if (!initialFilters.ownerId) setOwnerFilter('');
    if (!initialFilters.riskLevels) setRiskFilter('');
    setTypeFilter('');
    setFrequencyFilter('');
  }, [initialFilters]);


  const filteredContracts = useMemo(() => contracts.filter(contract => {
    const riskMatch = () => {
        if (riskFilter === '') return true;
        if (riskFilter === 'HighAndCritical') {
            return contract.riskLevel === RiskLevel.HIGH || contract.riskLevel === RiskLevel.CRITICAL;
        }
        return contract.riskLevel === riskFilter;
    };
    
    return (
      (contract.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
       contract.counterparty.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === '' || contract.status === statusFilter) &&
      (typeFilter === '' || contract.type === typeFilter) &&
      (ownerFilter === '' || contract.owner.id === ownerFilter) &&
      (frequencyFilter === '' || contract.frequency === frequencyFilter) &&
      riskMatch()
    );
  }), [contracts, searchTerm, statusFilter, typeFilter, riskFilter, frequencyFilter, ownerFilter]);

  const sortedContracts = useMemo(() => {
    return [...filteredContracts].sort((a, b) => {
        let valA, valB;
        switch (sortKey) {
            case 'title':
                valA = a.title.toLowerCase();
                valB = b.title.toLowerCase();
                break;
            case 'value':
                valA = a.value;
                valB = b.value;
                break;
            case 'endDate':
            case 'updatedAt':
                valA = new Date(a[sortKey as 'endDate' | 'updatedAt'] || 0).getTime();
                valB = new Date(b[sortKey as 'endDate' | 'updatedAt'] || 0).getTime();
                break;
            default:
                return 0;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
  }, [filteredContracts, sortKey, sortDirection]);

  const handleCreateNew = () => {
    onStartCreate();
  };
  
  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setTypeFilter('');
    setRiskFilter('');
    setFrequencyFilter('');
    setOwnerFilter('');
  };

  const specialRiskOptions = [
      ...riskOptions,
      { value: 'HighAndCritical', label: 'High / Critical' }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Contracts Repository</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {ownerFilter ? 'Showing contracts assigned to you.' : 'Manage, search, and review all organizational contracts.'}
                </p>
            </div>
            <button 
                onClick={handleCreateNew}
                className="flex items-center px-4 py-2 text-sm font-semibold text-primary-900 bg-primary rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 whitespace-nowrap">
                <PlusIcon className="w-5 h-5 mr-2" />
                Create new Contract
            </button>
        </div>
        
        <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            <input
                id="contract-search"
                type="search"
                placeholder="Search by title or counterparty..."
                autoComplete="off"
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2.5 pl-10 pr-3 text-sm text-gray-900 dark:text-gray-100 placeholder-[#9ca3af] dark:placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#BDAD49]/60 focus:border-[#BDAD49]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 items-end">
            <FilterDropdown label="Types" options={typeOptions} selected={typeFilter} onChange={setTypeFilter} />
            <FilterDropdown label="Statuses" options={statusOptions} selected={statusFilter} onChange={setStatusFilter} />
            <FilterDropdown label="Risk Levels" options={specialRiskOptions} selected={riskFilter} onChange={setRiskFilter} />
            <FilterDropdown label="Frequencies" options={frequencyOptions} selected={frequencyFilter} onChange={setFrequencyFilter} />
            <div className="lg:col-span-2 flex items-center justify-end space-x-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</label>
                <select 
                    className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-gray-200"
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value)}
                >
                    <option value="endDate">End Date</option>
                    <option value="updatedAt">Last Updated</option>
                    <option value="title">Title</option>
                    <option value="value">Value</option>
                </select>
                <button
                    onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600"
                    aria-label={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
                >
                    {sortDirection === 'asc' ? <ArrowUpIcon className="h-5 w-5 text-gray-600 dark:text-gray-300"/> : <ArrowDownIcon className="h-5 w-5 text-gray-600 dark:text-gray-300"/>}
                </button>
                 <button onClick={handleClearFilters} className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
                    Clear All
                </button>
            </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Title</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Counterparty</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Value</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">End Date</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">View</span></th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedContracts.map((contract) => (
              <tr key={contract.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => onSelectContract(contract)}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{contract.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{contract.type}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{contract.counterparty.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusTag type="contract" status={contract.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(contract.value)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{contract.endDate}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <a href="#" className="text-primary-600 hover:text-primary-900">View</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
       {sortedContracts.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No contracts found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try adjusting your search or filter criteria.</p>
          </div>
        )}
    </div>
  );
}