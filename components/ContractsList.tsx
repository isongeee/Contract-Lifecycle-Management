import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Contract } from '../types';
import { ContractStatus, ContractType, RiskLevel, ContractFrequency } from '../types';
import StatusTag from './StatusTag';
import { SearchIcon, ChevronDownIcon, PlusIcon, ArrowUpIcon, ArrowDownIcon, LoaderIcon } from './icons';
import { useAppContext } from '../contexts/AppContext';
import Pagination from './Pagination';
import { fetchContractsPage, ContractsPage } from '../lib/contractsApi';

interface FilterOption {
  value: string;
  label:string;
}

const ITEMS_PER_PAGE = 10;

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
const riskOptions = Object.values(RiskLevel).map(r => ({ value: r, label: r }));
const frequencyOptions = Object.values(ContractFrequency).map(f => ({ value: f, label: f }));

const defaultVisibleStatuses = Object.values(ContractStatus).filter(s => s !== ContractStatus.ARCHIVED && s !== ContractStatus.SUPERSEDED);

const StatusFilterDropdown = ({ selected, onChange }: { selected: Set<ContractStatus>; onChange: (statuses: Set<ContractStatus>) => void; }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleToggle = (status: ContractStatus) => {
        const newSet = new Set(selected);
        if (newSet.has(status)) {
            newSet.delete(status);
        } else {
            newSet.add(status);
        }
        onChange(newSet);
    };
    
    const handleSelectAll = (isChecked: boolean) => {
        onChange(isChecked ? new Set(Object.values(ContractStatus)) : new Set());
    };
    
    const allSelected = selected.size === Object.values(ContractStatus).length;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="appearance-none w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-gray-200 text-left flex justify-between items-center"
            >
                <span>{selected.size === 0 ? "Select Status" : `${selected.size} Status${selected.size > 1 ? 'es' : ''} selected`}</span>
                <ChevronDownIcon className="h-4 w-4" />
            </button>
            {isOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                        <label className="flex items-center space-x-2 px-2 py-1">
                            <input type="checkbox" checked={allSelected} onChange={e => handleSelectAll(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">All Statuses</span>
                        </label>
                    </div>
                    <div className="p-2">
                        {Object.values(ContractStatus).map(status => (
                            <label key={status} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600">
                                <input type="checkbox" checked={selected.has(status)} onChange={() => handleToggle(status)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                <StatusTag type="contract" status={status} />
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const specialRiskOptions = [
    ...riskOptions,
    { value: 'HighAndCritical', label: 'High / Critical' }
];

interface SortableHeaderProps {
    label: React.ReactNode;
    columnKey: string;
    sortConfig: { key: string; direction: 'asc' | 'desc' };
    onSort: (key: string) => void;
}

const SortableHeader = ({ label, columnKey, sortConfig, onSort }: SortableHeaderProps) => {
    const isActive = sortConfig.key === columnKey;
    return (
        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
            <button onClick={() => onSort(columnKey)} className="flex items-center space-x-1 group">
                <span>{label}</span>
                <span className={`transition-opacity ${isActive ? 'opacity-100' : 'opacity-20 group-hover:opacity-100'}`}>
                    {isActive && sortConfig.direction === 'asc' && <ArrowUpIcon className="h-4 w-4" />}
                    {isActive && sortConfig.direction === 'desc' && <ArrowDownIcon className="h-4 w-4" />}
                    {!isActive && <ArrowUpIcon className="h-4 w-4" />}
                </span>
            </button>
        </th>
    );
};

export default function ContractsList() {
  const { handleSelectContract, handleStartCreate, initialFilters, currentUser, contracts: allContracts, lastUpdated } = useAppContext();
  
  const [contracts, setContracts] = useState<Partial<Contract>[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleStatuses, setVisibleStatuses] = useState<Set<ContractStatus>>(new Set(defaultVisibleStatuses));
  const [typeFilter, setTypeFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState(initialFilters.ownerId || '');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'endDate', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
      if (initialFilters.status) {
          setVisibleStatuses(new Set([initialFilters.status as ContractStatus]));
      } else {
          setVisibleStatuses(new Set(defaultVisibleStatuses));
      }
    
    setOwnerFilter(initialFilters.ownerId || '');
    if (initialFilters.riskLevels?.includes(RiskLevel.HIGH) && initialFilters.riskLevels?.includes(RiskLevel.CRITICAL)) {
        setRiskFilter('HighAndCritical');
    } else {
        setRiskFilter('');
    }
    if (!initialFilters.ownerId) setOwnerFilter('');
    if (!initialFilters.riskLevels) setRiskFilter('');
    setTypeFilter('');
    setFrequencyFilter('');
  }, [initialFilters]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, visibleStatuses, typeFilter, riskFilter, frequencyFilter, ownerFilter]);

  useEffect(() => {
    let isMounted = true;
    if (!currentUser?.companyId) return;

    setIsLoading(true);
    setError(null);
    
    const filters = {
        search: searchTerm,
        status: visibleStatuses,
        type: typeFilter,
        risk: riskFilter,
        frequency: frequencyFilter,
        ownerId: ownerFilter,
    };

    fetchContractsPage(currentUser.companyId, currentPage, ITEMS_PER_PAGE, filters, sortConfig)
      .then(res => {
        if (isMounted) {
            setContracts(res.items);
            setTotal(res.total);
        }
      })
      .catch(err => {
        if (isMounted) {
            setError(err.message ?? 'Failed to load contracts');
        }
      })
      .finally(() => {
        if (isMounted) {
            setIsLoading(false);
        }
      });

    return () => {
        isMounted = false;
    };
  }, [currentUser?.companyId, currentPage, searchTerm, visibleStatuses, typeFilter, riskFilter, frequencyFilter, ownerFilter, sortConfig, lastUpdated]);

  
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
        key,
        direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setVisibleStatuses(new Set(defaultVisibleStatuses));
    setTypeFilter('');
    setRiskFilter('');
    setFrequencyFilter('');
    setOwnerFilter('');
  };
  
  if (!currentUser) return null;

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
                onClick={() => handleStartCreate()}
                className="flex items-center px-4 py-2 text-sm font-semibold text-white dark:text-primary-900 bg-primary rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 whitespace-nowrap">
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 items-end">
            <FilterDropdown label="Types" options={typeOptions} selected={typeFilter} onChange={setTypeFilter} />
            <StatusFilterDropdown selected={visibleStatuses} onChange={setVisibleStatuses} />
            <FilterDropdown label="Risk Levels" options={specialRiskOptions} selected={riskFilter} onChange={setRiskFilter} />
            <FilterDropdown label="Frequencies" options={frequencyOptions} selected={frequencyFilter} onChange={setFrequencyFilter} />
            <div className="flex items-center justify-end">
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
              <SortableHeader columnKey="title" label="Title" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader columnKey="counterparty" label="Counterparty" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader columnKey="status" label="Status" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader columnKey="value" label="Value" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader columnKey="endDate" label="End Date" sortConfig={sortConfig} onSort={handleSort} />
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading ? (
                <tr><td colSpan={5} className="text-center py-10"><LoaderIcon className="w-8 h-8 mx-auto text-primary" /></td></tr>
            ) : error ? (
                <tr><td colSpan={5} className="text-center py-10 text-red-500">{error}</td></tr>
            ) : contracts.map((contract) => (
              <tr key={contract.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => {
                  const fullContract = allContracts.find(c => c.id === contract.id);
                  handleSelectContract(fullContract || (contract as Contract));
              }}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{contract.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{contract.type}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{contract.counterparty!.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusTag type="contract" status={contract.status!} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(contract.value!)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{contract.endDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
       {!isLoading && !error && contracts.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No contracts found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(total / ITEMS_PER_PAGE)}
        onPageChange={setCurrentPage}
        totalItems={total}
        itemsPerPage={ITEMS_PER_PAGE}
      />
    </div>
  );
}