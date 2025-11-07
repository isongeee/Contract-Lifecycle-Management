
import React, { useState, useMemo } from 'react';
import type { Contract, SigningStatus } from '../types';
import { ContractStatus } from '../types';
import StatusTag from './StatusTag';
import { SearchIcon, PenSquareIcon } from './icons';

interface SigningPageProps {
  contracts: Contract[];
  onSelectContract: (contract: Contract) => void;
  onUpdateSigningStatus: (contractId: string, status: SigningStatus) => void;
  onMarkAsExecuted: (contractId: string) => void;
}

const SigningActions = ({ contract, onUpdateSigningStatus, onMarkAsExecuted }: { contract: Contract, onUpdateSigningStatus: (contractId: string, status: SigningStatus) => void, onMarkAsExecuted: (contractId: string) => void }) => {
    // Determine next action
    let nextAction = null;
    switch(contract.signingStatus) {
        case 'Awaiting Internal Signature':
            nextAction = { label: 'Send to Counterparty', status: 'Sent to Counterparty' as SigningStatus };
            break;
        case 'Sent to Counterparty':
            nextAction = { label: 'Mark as Viewed', status: 'Viewed by Counterparty' as SigningStatus };
            break;
        case 'Viewed by Counterparty':
            nextAction = { label: 'Mark as Signed by Counterparty', status: 'Signed by Counterparty' as SigningStatus };
            break;
        case 'Signed by Counterparty':
             // The final action is to change the main contract status, not the signing sub-status
            return <button onClick={() => onMarkAsExecuted(contract.id)} className="px-3 py-1.5 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">Mark as Executed</button>;
    }
    
    if (!nextAction) return null;

    return <button onClick={() => onUpdateSigningStatus(contract.id, nextAction.status)} className="px-3 py-1.5 text-sm font-semibold text-primary-900 bg-primary rounded-md hover:bg-primary-600">{nextAction.label}</button>
}

export default function SigningPage({ contracts, onSelectContract, onUpdateSigningStatus, onMarkAsExecuted }: SigningPageProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const signingContracts = useMemo(() => {
    return contracts.filter(c => 
      c.status === ContractStatus.SENT_FOR_SIGNATURE &&
      (c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.counterparty.name.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a,b) => new Date(b.signingStatusUpdatedAt || 0).getTime() - new Date(a.signingStatusUpdatedAt || 0).getTime());
  }, [contracts, searchTerm]);

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Signing Tracker</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Track contracts that are out for signature and manage the e-signature process.
            </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
                type="search"
                placeholder="Search by title or counterparty..."
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
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Signing Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Last Updated</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Owner</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Next Action</th>
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {signingContracts.map(contract => (
                <tr key={contract.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                        <button onClick={() => onSelectContract(contract)} className="text-left">
                            <div className="font-semibold text-primary-700 hover:underline">{contract.title}</div>
                            <div className="text-xs text-gray-500">{contract.counterparty.name}</div>
                        </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                    {contract.signingStatus && <StatusTag type="signing" status={contract.signingStatus} />}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{contract.signingStatusUpdatedAt ? new Date(contract.signingStatusUpdatedAt).toLocaleDateString() : 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{`${contract.owner.firstName} ${contract.owner.lastName}`}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                        <SigningActions contract={contract} onUpdateSigningStatus={onUpdateSigningStatus} onMarkAsExecuted={onMarkAsExecuted} />
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
        {signingContracts.length === 0 && (
            <div className="text-center py-12">
            <PenSquareIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No contracts out for signature</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Contracts marked as 'Sent for Signature' will appear here.</p>
            </div>
        )}
        </div>
    </div>
  );
}
