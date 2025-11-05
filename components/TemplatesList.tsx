
import React, { useState } from 'react';
import type { ContractTemplate } from '../types';
import { ContractType } from '../types';
import { SearchIcon, BookTextIcon } from './icons';

interface TemplatesListProps {
  templates: ContractTemplate[];
  onSelectTemplate: (template: ContractTemplate) => void;
}

// FIX: Changed component to React.FC to correctly handle props including the 'key' prop.
const TemplateCard: React.FC<{ template: ContractTemplate, onSelect: () => void }> = ({ template, onSelect }) => (
    <button onClick={onSelect} className="w-full text-left bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-primary-300 transition-all duration-200 p-5 flex flex-col h-full">
        <div className="flex-shrink-0 flex items-center mb-3">
            <div className="w-10 h-10 flex items-center justify-center bg-primary-100 rounded-lg mr-4">
                <BookTextIcon className="w-5 h-5 text-primary-700" />
            </div>
            <div>
                 <span className="text-xs font-semibold bg-primary-200 text-primary-800 px-2 py-0.5 rounded-full">{template.type}</span>
            </div>
        </div>
        <div className="flex-grow">
            <h3 className="font-bold text-gray-800 text-md">{template.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{template.description}</p>
        </div>
        <div className="mt-4">
             <span className="text-sm font-semibold text-primary-600 hover:text-primary-800">
                View Template &rarr;
            </span>
        </div>
    </button>
);


export default function TemplatesList({ templates, onSelectTemplate }: TemplatesListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTemplates = templates.filter(template => {
    return (
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Contract Templates</h1>
            <p className="mt-1 text-sm text-gray-500">Start from a pre-approved template to create new contracts quickly and consistently.</p>
        </div>
        
        <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
                type="search"
                placeholder="Search templates..."
                autoComplete="off"
                className="block w-full max-w-lg rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-[#9ca3af] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map(template => (
                <TemplateCard 
                    key={template.id} 
                    template={template} 
                    onSelect={() => onSelectTemplate(template)}
                />
            ))}
        </div>
        
        {filteredTemplates.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                <h3 className="text-lg font-medium text-gray-900">No templates found</h3>
                <p className="mt-1 text-sm text-gray-500">Your search for "{searchTerm}" did not match any templates.</p>
            </div>
        )}
    </div>
  );
}
