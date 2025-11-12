import React, { useState, useMemo } from 'react';
import type { Contract, UserProfile } from '../types';
import { RenewalStatus, RenewalMode } from '../types';
import StatusTag from './StatusTag';
import { SearchIcon, SlidersHorizontalIcon, ArrowUpIcon, ArrowDownIcon, RefreshCwIcon } from './icons';

interface RenewalsQueueProps {
  contracts: Contract[];
  users: UserProfile[];
  onSelectContract: (contract: Contract) => void;
  onNavigateToWorkspace: (contract: Contract) => void;
}

const FilterDropdown = ({ label, options, selected, onChange, placeholder }: { label: string; options: {value: string, label: string}[]; selected: string; onChange: (value: string) => void; placeholder: string; }) => (
    <div>
        <label className="text-xs text-gray-500 dark:text-gray-400">{label}</label>
        <select 
            className="mt-1 appearance-none w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={selected}
            onChange={(e) => onChange(e.target.value)}
        >
            <option value="">{placeholder}</option>
            {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
    </div>
);

export default function RenewalsQueue({ contracts, users, onSelectContract, onNavigateToWorkspace }: RenewalsQueueProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'noticeDeadline', direction: 'asc' });

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
        key,
        direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortableHeader = ({ label, columnKey }: { label: React.ReactNode; columnKey: string }) => {
    const isActive = sortConfig.key === columnKey;
    return (
        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
            <button onClick={() => handleSort(columnKey)} className="flex items-center space-x-1 group">
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

  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
        const renewal = c.renewalRequest;
        if (!renewal) return false;
        
        return (
            (c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.counterparty.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
            (statusFilter === '' || renewal.status === statusFilter) &&
            (ownerFilter === '' || renewal.renewalOwner?.id === ownerFilter) &&
            (modeFilter === '' || renewal.mode === modeFilter)
        );
    });
  }, [contracts, searchTerm, statusFilter, ownerFilter, modeFilter]);
  
  const sortedContracts = useMemo(() => {
    return [...filteredContracts].sort((a, b) => {
        let valA: any, valB: any;
        switch (sortConfig.key) {
            case 'title':
                valA = a.title.toLowerCase(); valB = b.title.toLowerCase(); break;
            case 'counterparty':
                valA = a.counterparty.name.toLowerCase(); valB = b.counterparty.name.toLowerCase(); break;
            case 'renewalStatus':
                valA = a.renewalRequest?.status || ''; valB = b.renewalRequest?.status || ''; break;
            case 'endDate':
                valA = new Date(a.endDate || 0).getTime(); valB = new Date(b.endDate || 0).getTime(); break;
            case 'noticeDeadline':
                valA = new Date(a.renewalRequest?.noticeDeadline || 0).getTime(); valB = new Date(b.renewalRequest?.noticeDeadline || 0).getTime(); break;
            case 'owner':
                valA = a.renewalRequest?.renewalOwner ? `${a.renewalRequest.renewalOwner.firstName} ${a.renewalRequest.renewalOwner.lastName}` : 'Z';
                valB = b.renewalRequest?.renewalOwner ? `${b.renewalRequest.renewalOwner.firstName} ${b.renewalRequest.renewalOwner.lastName}` : 'Z';
                break;
            default: return 0;
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
  }, [filteredContracts, sortConfig]);

  const hasFilters = searchTerm || statusFilter || ownerFilter || modeFilter;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <SearchIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="search"
            placeholder="Search renewals by title or counterparty..."
            className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2.5 pl-10 text-sm focus:ring-primary focus:border-primary"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FilterDropdown label="Status" placeholder="All Statuses" options={Object.values(RenewalStatus).map(s => ({value: s, label: s}))} selected={statusFilter} onChange={setStatusFilter} />
            <FilterDropdown label="Owner" placeholder="All Owners" options={users.map(u => ({value: u.id, label: `${u.firstName} ${u.lastName}`}))} selected={ownerFilter} onChange={setOwnerFilter} />
            <FilterDropdown label="Mode" placeholder="All Modes" options={Object.values(RenewalMode).map(m => ({value: m, label: m.replace(/_/g, ' ')}))} selected={modeFilter} onChange={setModeFilter} />
            <div className="flex items-end">
                <button onClick={() => { setSearchTerm(''); setStatusFilter(''); setOwnerFilter(''); setModeFilter(''); }} className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
                    Clear Filters
                </button>
            </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <SortableHeader columnKey="title" label="Contract" />
              <SortableHeader columnKey="counterparty" label="Counterparty" />
              <SortableHeader columnKey="renewalStatus" label="Renewal Status" />
              <SortableHeader columnKey="endDate" label="End Date" />
              <SortableHeader columnKey="noticeDeadline" label="Notice Deadline" />
              <SortableHeader columnKey="owner" label="Owner" />
              <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedContracts.map(contract => (
              <tr key={contract.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900 dark:text-gray-100">{contract.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{contract.counterparty.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {contract.renewalRequest && <StatusTag type="renewal" status={contract.renewalRequest.status} />}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{contract.endDate}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600 dark:text-red-400">{contract.renewalRequest?.noticeDeadline || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{contract.renewalRequest?.renewalOwner ? `${contract.renewalRequest.renewalOwner.firstName} ${contract.renewalRequest.renewalOwner.lastName}` : 'Unassigned'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button onClick={() => onSelectContract(contract)} className="text-primary-600 hover:text-primary-900">View</button>
                  {contract.renewalRequest?.status === RenewalStatus.IN_PROGRESS && (
                      <button onClick={() => onNavigateToWorkspace(contract)} className="px-2 py-1 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">Workspace</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sortedContracts.length === 0 && (
          hasFilters ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No contracts match your criteria</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try adjusting your search or filter settings.</p>
            </div>
          ) : (
            <div className="text-center py-12">
                <RefreshCwIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">Renewals Queue is Empty</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
                    Contracts nearing their expiration date will appear here once a renewal process has been initiated.
                    You can start a renewal from the Contract Detail page for any active contract expiring within 90 days.
                </p>
            </div>
          )
      )}
    </div>
  );
}