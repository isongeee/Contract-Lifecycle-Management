
import React, { useState, useMemo } from 'react';
import type { Contract } from '../types';
import StatusTag from './StatusTag';
import { SearchIcon } from './icons';

interface RenewalsQueueProps {
  contracts: Contract[];
  onSelectContract: (contract: Contract) => void;
}

export default function RenewalsQueue({ contracts, onSelectContract }: RenewalsQueueProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredContracts = useMemo(() => {
    return contracts.filter(c => 
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.counterparty.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [contracts, searchTerm]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <SearchIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="search"
            placeholder="Search renewals by title or counterparty..."
            className="block w-full max-w-lg rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2.5 pl-10 text-sm focus:ring-primary focus:border-primary"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Contract</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Counterparty</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Renewal Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">End Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Notice Deadline</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Owner</th>
              <th className="relative px-6 py-3"><span className="sr-only">View</span></th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredContracts.map(contract => (
              <tr key={contract.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => onSelectContract(contract)}>
                <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900 dark:text-gray-100">{contract.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{contract.counterparty.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {contract.renewalRequest && <StatusTag type="renewal" status={contract.renewalRequest.status} />}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{contract.endDate}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600 dark:text-red-400">{contract.renewalRequest?.noticeDeadline || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{contract.renewalRequest?.renewalOwner ? `${contract.renewalRequest.renewalOwner.firstName} ${contract.renewalRequest.renewalOwner.lastName}` : 'Unassigned'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <span className="text-primary-600 hover:text-primary-900">View</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filteredContracts.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No contracts in renewal process</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Contracts nearing their end date will appear here once a renewal request is created.</p>
        </div>
      )}
    </div>
  );
}
