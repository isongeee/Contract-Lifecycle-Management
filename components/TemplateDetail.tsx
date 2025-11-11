import React from 'react';
import { ArrowLeftIcon, PlusCircleIcon, BookTextIcon } from './icons';
import { useAppContext } from '../contexts/AppContext';

export default function TemplateDetail() {
  const { selectedTemplate, handleBackToTemplatesList, handleUseTemplate } = useAppContext();

  if (!selectedTemplate) return null;

  return (
    <div>
        <button onClick={handleBackToTemplatesList} className="flex items-center text-sm font-semibold text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to all templates
        </button>

        <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 flex items-center justify-center bg-primary-100 rounded-lg">
                            <BookTextIcon className="w-5 h-5 text-primary-700" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">{selectedTemplate.name}</h1>
                    </div>
                    <p className="text-md text-gray-600 ml-13">{selectedTemplate.description}</p>
                </div>
                 <button 
                    onClick={() => handleUseTemplate(selectedTemplate)}
                    className="flex items-center px-4 py-2 text-sm font-semibold text-primary-900 bg-primary rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                    <PlusCircleIcon className="w-5 h-5 mr-2" />
                    Use this template
                </button>
            </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Template Content</h3>
            <div className="prose prose-sm max-w-none p-4 bg-gray-50 rounded-md border h-[60vh] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-xs font-mono">{selectedTemplate.content}</pre>
            </div>
        </div>
    </div>
  );
}