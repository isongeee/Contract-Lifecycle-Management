
import React, { useState, useCallback } from 'react';
import type { Contract, ReviewChecklistItem } from '../types';
import { SparklesIcon, LoaderIcon, ArrowLeftIcon, FileTextIcon, CheckCircleIcon } from './icons';
import { generateRenewalDraft } from '../services/geminiService';
import { MOCK_REVIEW_CHECKLIST } from '../constants';

interface RenewalWorkspaceProps {
    contract: Contract;
    onSendForApproval: (draftContent: string) => void;
    onBack: () => void;
}

const TabButton = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
            active 
                ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 border-t border-l border-r text-primary-600' 
                : 'bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
    >
        {label}
    </button>
);

export default function RenewalWorkspace({ contract, onSendForApproval, onBack }: RenewalWorkspaceProps) {
    const [prompt, setPrompt] = useState('');
    const [draftContent, setDraftContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [checklist, setChecklist] = useState<ReviewChecklistItem[]>(MOCK_REVIEW_CHECKLIST);
    const [activeTab, setActiveTab] = useState<'document' | 'checklist'>('document');
    
    const latestVersion = contract.versions[contract.versions.length - 1];

    const handleGenerateDraft = useCallback(async () => {
        if (!latestVersion?.content || !prompt) return;
        setIsGenerating(true);
        const newDraft = await generateRenewalDraft(latestVersion.content, prompt);
        setDraftContent(newDraft);
        setIsGenerating(false);
    }, [latestVersion, prompt]);

    const handleChecklistToggle = (id: string) => {
        setChecklist(prev => prev.map(item => item.id === id ? { ...item, isCompleted: !item.isCompleted } : item));
    };

    const isChecklistComplete = checklist.every(item => item.isCompleted);

    return (
        <div>
            <button onClick={onBack} className="flex items-center text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 mb-4">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to contract detail
            </button>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Renewal Workspace: {contract.title}</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    You are in the '{contract.renewalRequest?.status}' stage. Use the tools below to prepare the renewal document.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Panel */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                    <div className="flex border-b border-gray-200 dark:border-gray-700 px-4">
                        <TabButton label="Reference Document" active={activeTab === 'document'} onClick={() => setActiveTab('document')} />
                        <TabButton label="Review Checklist" active={activeTab === 'checklist'} onClick={() => setActiveTab('checklist')} />
                    </div>
                    <div className="p-4 h-[60vh] overflow-y-auto">
                        {activeTab === 'document' && (
                            <div>
                                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Reference: Version {latestVersion.versionNumber}</h3>
                                <div className="prose prose-sm max-w-none mt-2 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-md">
                                    <pre className="whitespace-pre-wrap text-xs font-sans">{latestVersion.content}</pre>
                                </div>
                            </div>
                        )}
                        {activeTab === 'checklist' && (
                            <div>
                                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Guided Review Checklist</h3>
                                 <ul className="mt-3 space-y-3">
                                    {checklist.map(item => (
                                        <li key={item.id}>
                                            <label className="flex items-start space-x-3">
                                                <input type="checkbox" checked={item.isCompleted} onChange={() => handleChecklistToggle(item.id)} className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                                                <span className={`text-sm ${item.isCompleted ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-700 dark:text-gray-200'}`}>{item.text}</span>
                                            </label>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel */}
                 <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 flex flex-col">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">Drafting Assistant</h3>
                    <div>
                        <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-2">1. Provide Instructions</label>
                        <textarea
                            id="prompt"
                            rows={3}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., Renew for another 24 months with a 5% uplift and add a standard data privacy clause."
                            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm mt-1 focus:ring-primary focus:border-primary bg-white dark:bg-gray-700"
                        />
                        <button
                            onClick={handleGenerateDraft}
                            disabled={isGenerating || !prompt}
                            className="mt-2 flex items-center px-4 py-2 text-sm font-semibold text-primary-900 bg-primary rounded-lg hover:bg-primary-600 disabled:opacity-50"
                        >
                            {isGenerating ? <LoaderIcon className="w-5 h-5 mr-2" /> : <SparklesIcon className="w-5 h-5 mr-2" />}
                            {isGenerating ? 'Generating...' : 'Generate First Draft'}
                        </button>
                    </div>
                    <div className="mt-4 flex-grow flex flex-col">
                        <label htmlFor="draft" className="block text-sm font-medium text-gray-700 dark:text-gray-300">2. Review and Edit Draft</label>
                        <textarea
                            id="draft"
                            value={draftContent}
                            onChange={(e) => setDraftContent(e.target.value)}
                            placeholder="The AI-generated draft will appear here..."
                            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm mt-1 flex-grow focus:ring-primary focus:border-primary bg-white dark:bg-gray-700"
                        />
                    </div>
                 </div>
            </div>
             <div className="mt-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm flex justify-end items-center space-x-3">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                    {isChecklistComplete ? 'All review items complete!' : `${checklist.filter(i => !i.isCompleted).length} review items remaining.`}
                </div>
                <button
                    onClick={() => onSendForApproval(draftContent)}
                    disabled={!draftContent || !isChecklistComplete}
                    title={!isChecklistComplete ? "Please complete all review checklist items before sending for approval." : !draftContent ? "Please generate and review a draft first." : ""}
                    className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <CheckCircleIcon className="w-5 h-5 mr-2" />
                    Save Draft & Send for Approval
                </button>
            </div>
        </div>
    );
}
