import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { LoaderIcon, SearchIcon } from './icons';
import type { SearchResult } from '../types';

const HighlightedSnippet = ({ text, highlight }: { text: string; highlight: string }) => {
    if (!highlight.trim()) {
        return <span>{text}</span>;
    }
    const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
        <span>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <mark key={i} className="bg-primary-200 dark:bg-primary-800/50 text-gray-900 dark:text-gray-100 rounded px-1">
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </span>
    );
};

// FIX: Changed component to React.FC to correctly handle props including the 'key' prop used in lists.
const ResultItem: React.FC<{ result: SearchResult, onSelect: (contractId: string) => void }> = ({ result, onSelect }) => {
    return (
        <button onClick={() => onSelect(result.contractId)} className="w-full text-left p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700 transition-all">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-primary-700 dark:text-primary-300 text-md">{result.contractTitle}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">vs. {result.counterpartyName} (Version {result.versionNumber})</p>
                </div>
            </div>
            <blockquote className="mt-3 text-sm text-gray-600 dark:text-gray-300 border-l-4 border-gray-200 dark:border-gray-600 pl-4 py-1">
                <HighlightedSnippet text={result.snippet} highlight={useAppContext().globalSearchTerm} />
            </blockquote>
        </button>
    );
};

export default function SearchResultsPage() {
    const { 
        isPerformingGlobalSearch, 
        globalSearchResults, 
        globalSearchTerm,
        handleSelectContract,
        contracts
    } = useAppContext();

    const handleResultClick = (contractId: string) => {
        const contract = contracts.find(c => c.id === contractId);
        if (contract) {
            handleSelectContract(contract);
        }
    };

    if (isPerformingGlobalSearch) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <LoaderIcon className="w-12 h-12 text-primary" />
                <h2 className="mt-4 text-xl font-bold text-gray-800 dark:text-gray-100">Searching...</h2>
                <p className="mt-2 text-md text-gray-600 dark:text-gray-400">Looking for "{globalSearchTerm}" in all documents.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Found {globalSearchResults.length} result{globalSearchResults.length !== 1 && 's'} for</p>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">"{globalSearchTerm}"</h1>
            </div>

            {globalSearchResults.length > 0 ? (
                <div className="space-y-4">
                    {globalSearchResults.map(result => (
                        <ResultItem key={result.versionId} result={result} onSelect={handleResultClick} />
                    ))}
                </div>
            ) : (
                 <div className="text-center py-16 bg-white dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                    <SearchIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">No results found</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your search for "{globalSearchTerm}" did not yield any results in the contract documents.</p>
                </div>
            )}
        </div>
    );
}
