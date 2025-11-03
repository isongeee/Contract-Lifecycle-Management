import React, { useState, useEffect } from 'react';
import type { Contract, UserProfile } from '../types';
import { ContractStatus, ContractType, RiskLevel } from '../types';
import StatusTag from './StatusTag';
import { SearchIcon, ChevronDownIcon, PlusIcon } from './icons';

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

export default function ContractsList({ contracts, onSelectContract, onStartCreate, initialFilters = {}, currentUser }: ContractsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialFilters.status || '');
  const [typeFilter, setTypeFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState(initialFilters.ownerId || '');

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
  }, [initialFilters]);


  const filteredContracts = contracts.filter(contract => {
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
      riskMatch()
    );
  });

  const handleCreateNew = () => {
    onStartCreate();
  };
  
  const specialRiskOptions = [
      ...riskOptions,
      { value: 'HighAndCritical', label: 'High / Critical' }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Contracts Repository</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {ownerFilter ? 'Showing contracts assigned to you.' : 'Manage, search, and review all organizational contracts.'}
                </p>
            </div>
            <button 
                onClick={handleCreateNew}
                className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 whitespace-nowrap">
                <PlusIcon className="w-5 h-5 mr-2" />
                Create new Contract
            </button>
        </div>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative md:col-span-6 lg:col-span-3">
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
             <FilterDropdown 
                label="Types"
                options={typeOptions} 
                selected={typeFilter} 
                onChange={setTypeFilter}
            />
            <FilterDropdown 
                label="Statuses"
                options={statusOptions} 
                selected={statusFilter} 
                onChange={setStatusFilter}
            />
            <FilterDropdown 
                label="Risk Levels"
                options={specialRiskOptions} 
                selected={riskFilter} 
                onChange={setRiskFilter}
            />
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
            {filteredContracts.map((contract) => (
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
       {filteredContracts.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No contracts found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try adjusting your search or filter criteria.</p>
          </div>
        )}
    </div>
  );
}