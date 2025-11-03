
import React from 'react';
import type { Contract, Property } from '../types';
import { ArrowLeftIcon, HomeIcon, FileTextIcon } from './icons';
import StatusTag from './StatusTag';

interface PropertyDetailProps {
  property: Property;
  contracts: Contract[];
  onBack: () => void;
  onSelectContract: (contract: Contract) => void;
}

const formatFullAddress = (property: Property) => {
    return [
        property.addressLine1,
        property.addressLine2,
        `${property.city}, ${property.state} ${property.zipCode}`,
        property.country
    ].filter(Boolean).join(', ');
}

export default function PropertyDetail({ property, contracts, onBack, onSelectContract }: PropertyDetailProps) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center text-sm font-semibold text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeftIcon className="w-4 h-4 mr-2" />
        Back to all properties
      </button>

      <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center bg-gray-100 rounded-lg">
                <HomeIcon className="w-8 h-8 text-gray-500" />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
                <p className="mt-1 text-md text-gray-600">{formatFullAddress(property)}</p>
            </div>
        </div>
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Counterparty</th>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{contract.counterparty.name}</td>
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
                <FileTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No Associated Contracts</h3>
                <p className="mt-1 text-sm text-gray-500">This property does not have any contracts linked to it.</p>
            </div>
          )}
      </div>
    </div>
  );
}
