
import React from 'react';
import type { Contract, Counterparty } from '../types';
import { ArrowLeftIcon, BuildingOfficeIcon } from './icons';
import StatusTag from './StatusTag';

interface CounterpartyDetailProps {
  counterparty: Counterparty;
  contracts: Contract[];
  onBack: () => void;
  onSelectContract: (contract: Contract) => void;
}

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900">{value || <span className="text-gray-400">N/A</span>}</dd>
    </div>
);

export default function CounterpartyDetail({ counterparty, contracts, onBack, onSelectContract }: CounterpartyDetailProps) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center text-sm font-semibold text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeftIcon className="w-4 h-4 mr-2" />
        Back to all counterparties
      </button>

      <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center bg-gray-100 rounded-lg">
                <BuildingOfficeIcon className="w-8 h-8 text-gray-500" />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{counterparty.name}</h1>
                <p className="mt-1 text-md text-gray-600">{counterparty.address}</p>
            </div>
        </div>
        <dl className="mt-6 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
            <DetailItem label="Primary Contact" value={counterparty.contactName} />
            <DetailItem label="Contact Email" value={counterparty.contactEmail} />
            <DetailItem label="Contact Phone" value={counterparty.contactPhone} />
        </dl>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
         <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Associated Contracts ({contracts.length})</h2>
         </div>
         <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Value</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">End Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onSelectContract(contract)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{contract.title}</div>
                      <div className="text-xs text-gray-500">{contract.type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusTag type="contract" status={contract.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(contract.value)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{contract.endDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {contracts.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900">No Associated Contracts</h3>
              <p className="mt-1 text-sm text-gray-500">This counterparty does not have any contracts in the system.</p>
            </div>
          )}
      </div>
    </div>
  );
}