
import React, { useState, useMemo } from 'react';
import type { Property, Contract, UserProfile } from '../types';
import { SearchIcon, HomeIcon, PlusIcon, FileTextIcon } from './icons';

interface PropertyWithMeta extends Property {
    contractCount: number;
}

interface PropertiesListProps {
  properties: Property[];
  contracts: Contract[];
  onSelectProperty: (property: Property) => void;
  onStartCreate: () => void;
  currentUser: UserProfile;
}

const formatAddress = (property: Property) => {
    const line2 = property.addressLine2 ? `${property.addressLine2}, ` : '';
    return `${property.addressLine1}, ${line2}${property.city}, ${property.state} ${property.zipCode}, ${property.country}`;
};

// FIX: Changed component to React.FC to correctly handle props including the 'key' prop.
const PropertyCard: React.FC<{ property: PropertyWithMeta, onSelect: () => void }> = ({ property, onSelect }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-primary-300 transition-all duration-200 flex flex-col h-full">
        <div className="p-5 flex-grow">
            <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-gray-100 rounded-lg">
                    <HomeIcon className="w-6 h-6 text-gray-500" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-800 text-md">{property.name}</h3>
                    <p className="text-sm text-gray-500">{property.addressLine1}</p>
                    <p className="text-sm text-gray-500">{`${property.city}, ${property.state} ${property.zipCode}`}</p>
                    <p className="text-sm text-gray-500">{property.country}</p>
                </div>
            </div>
        </div>
         <div className="border-t border-gray-200 px-5 py-3">
             <div className="flex items-center space-x-2">
                <FileTextIcon className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                    <span className="font-bold text-gray-800">{property.contractCount}</span> associated contract{property.contractCount !== 1 ? 's' : ''}
                </span>
            </div>
        </div>
        <div className="bg-gray-50 p-3 text-right">
             <button onClick={onSelect} className="text-sm font-semibold text-primary-600 hover:text-primary-800">
                View Details &rarr;
            </button>
        </div>
    </div>
);


export default function PropertiesList({ properties, contracts, onSelectProperty, onStartCreate, currentUser }: PropertiesListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const propertiesWithMeta = useMemo<PropertyWithMeta[]>(() => {
    return properties.map(p => {
        const relatedContracts = contracts.filter(c => c.property?.id === p.id);
        return {
            ...p,
            contractCount: relatedContracts.length,
        };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [contracts, properties]);

  const filteredProperties = propertiesWithMeta.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    formatAddress(p).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
                <p className="mt-1 text-sm text-gray-500">Manage all physical properties and locations.</p>
            </div>
            {currentUser.role === 'Admin' && (
                <button 
                    onClick={onStartCreate}
                    className="flex items-center px-4 py-2 text-sm font-semibold text-primary-900 bg-primary rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Add Property
                </button>
            )}
        </div>
        
        <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
                type="search"
                placeholder="Search by name or address..."
                autoComplete="off"
                className="block w-full max-w-lg rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-[#9ca3af] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map(p => (
                <PropertyCard key={p.id} property={p} onSelect={() => onSelectProperty(p)} />
            ))}
        </div>
        
        {filteredProperties.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                 <HomeIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No properties found</h3>
                <p className="mt-1 text-sm text-gray-500">Your search for "{searchTerm}" did not match any records.</p>
            </div>
        )}
    </div>
  );
}
