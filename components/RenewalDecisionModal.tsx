import React, { useState, useMemo } from 'react';
import type { Contract, RenewalMode } from '../types';
import { XIcon, RefreshCwIcon, FileTextIcon, EditIcon, XCircleIcon, SparklesIcon, LoaderIcon, UserIcon } from './icons';
import { summarizePerformanceMetrics } from '../services/geminiService';

interface RenewalDecisionModalProps {
    contract: Contract;
    contracts: Contract[];
    onClose: () => void;
    onConfirm: (mode: RenewalMode, notes?: string) => void;
}

const decisionOptions = [
    {
        mode: 'renew_as_is' as RenewalMode,
        title: 'Renew As-Is',
        description: 'Renew the contract with the same terms, applying any standard uplift. This is a fast-track option.',
        icon: <RefreshCwIcon className="h-6 w-6 text-green-600" />,
        color: 'green'
    },
    {
        mode: 'new_contract' as RenewalMode,
        title: 'Renegotiate Terms (New Contract)',
        description: 'Start a new negotiation. The existing contract will be superseded by a new, active agreement upon completion.',
        icon: <FileTextIcon className="h-6 w-6 text-blue-600" />,
        color: 'blue'
    },
    {
        mode: 'amendment' as RenewalMode,
        title: 'Amend Existing Contract',
        description: 'Create a formal amendment to modify or extend the terms of the current contract without replacing it.',
        icon: <EditIcon className="h-6 w-6 text-indigo-600" />,
        color: 'indigo'
    },
    {
        mode: 'terminate' as RenewalMode,
        title: 'Terminate Contract',
        description: 'Do not renew the contract. This will begin the offboarding and contract closure process.',
        icon: <XCircleIcon className="h-6 w-6 text-red-600" />,
        color: 'red'
    }
];

const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const InfoItem = ({ label, value, className = '' }: { label: string; value: React.ReactNode; className?: string }) => (
    <div className={className}>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{value}</p>
    </div>
);

const mockStakeholderFeedback = [
    { name: 'Bob Williams', role: 'Sales Director', feedback: 'The reporting from this vendor has been inconsistent. We need to tighten the SLAs around data delivery in the next term.'},
    { name: 'Diana Prince', role: 'Procurement', feedback: 'Overall, the service has been good, but we should explore if there are opportunities for cost savings or bundling additional services.'},
];

export default function RenewalDecisionModal({ contract, contracts, onClose, onConfirm }: RenewalDecisionModalProps) {
    const [selectedMode, setSelectedMode] = useState<RenewalMode | null>(null);
    const [justification, setJustification] = useState('');
    const [performanceSummary, setPerformanceSummary] = useState('');
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

    const lifetimeValue = useMemo(() => {
        let total = contract.value;
        let current = contract;
        const contractMap = new Map(contracts.map(c => [c.id, c]));
        
        while (current.parentContractId) {
            const parent = contractMap.get(current.parentContractId);
            if (parent) {
                total += parent.value;
                current = parent;
            } else {
                break;
            }
        }
        return total;
    }, [contract, contracts]);

    const handleGenerateSummary = async () => {
        const latestVersion = contract.versions[contract.versions.length - 1];
        if (!latestVersion?.content) return;
        setIsGeneratingSummary(true);
        const summary = await summarizePerformanceMetrics(latestVersion.content);
        setPerformanceSummary(summary);
        setIsGeneratingSummary(false);
    };

    const isConfirmDisabled = selectedMode === 'terminate' && justification.trim() === '';

    const handleConfirm = () => {
        if (selectedMode && !isConfirmDisabled) {
            onConfirm(selectedMode, justification);
        }
    };

    const upliftAmount = contract.value * ((contract.renewalRequest?.upliftPercent || 0) / 100);
    const projectedValue = contract.value + upliftAmount;

    return (
        <div className="relative z-20" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                    <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl">
                        <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                            <button type="button" onClick={onClose} className="rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                                <XIcon className="h-6 w-6" aria-hidden="true" />
                            </button>
                        </div>
                        <div className="bg-white dark:bg-gray-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4 max-h-[90vh] overflow-y-auto">
                            <h3 className="text-xl font-semibold leading-6 text-gray-900 dark:text-gray-100" id="modal-title">
                                Renewal Decision Support
                            </h3>
                             <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Review the information below to make an informed decision for <span className="font-semibold">{contract.title}</span>.
                            </p>

                            <div className="mt-6 space-y-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                               <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">Decision Support Information</h4>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   {/* Financial Impact */}
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-600">
                                        <h5 className="font-semibold text-gray-700 dark:text-gray-300">Financial Impact</h5>
                                        <div className="mt-2 space-y-2">
                                            <InfoItem label="Current Contract Value" value={formatCurrency(contract.value)} />
                                            <InfoItem label="Total Lifetime Value" value={formatCurrency(lifetimeValue)} />
                                            <InfoItem label="Proposed Uplift" value={`${formatCurrency(upliftAmount)} (${contract.renewalRequest?.upliftPercent || 0}%)`} />
                                            <InfoItem label="Projected New Value" value={formatCurrency(projectedValue)} />
                                        </div>
                                    </div>
                                    {/* AI Summary */}
                                     <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-600 flex flex-col">
                                        <div className="flex justify-between items-center">
                                            <h5 className="font-semibold text-gray-700 dark:text-gray-300">AI Performance Summary</h5>
                                            <button onClick={handleGenerateSummary} disabled={isGeneratingSummary} className="flex items-center text-xs font-semibold text-primary-700 dark:text-primary-300 hover:text-primary-900 disabled:opacity-50">
                                                <SparklesIcon className="w-4 h-4 mr-1" />
                                                {isGeneratingSummary ? 'Generating...' : 'Generate'}
                                            </button>
                                        </div>
                                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 flex-grow">
                                            {isGeneratingSummary && <div className="flex items-center"><LoaderIcon className="w-4 h-4 mr-2" />Analyzing...</div>}
                                            {performanceSummary ? (
                                                <div className="text-xs whitespace-pre-wrap font-mono bg-gray-100 dark:bg-gray-900/50 p-2 rounded-md h-28 overflow-y-auto">{performanceSummary}</div>
                                            ) : (
                                                <p className="text-xs text-center text-gray-400 py-8">Click 'Generate' to get an AI summary of performance metrics and obligations.</p>
                                            )}
                                        </div>
                                    </div>
                               </div>
                               {/* Stakeholder Feedback */}
                               <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-600">
                                   <h5 className="font-semibold text-gray-700 dark:text-gray-300">Stakeholder Feedback (Simulated)</h5>
                                   <div className="mt-2 space-y-3">
                                       {mockStakeholderFeedback.map((fb, i) => (
                                           <div key={i} className="flex items-start space-x-3">
                                               <UserIcon className="w-8 h-8 p-1.5 text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-full" />
                                               <div>
                                                   <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{fb.name} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({fb.role})</span></p>
                                                   <p className="text-sm text-gray-600 dark:text-gray-400 italic">"{fb.feedback}"</p>
                                               </div>
                                           </div>
                                       ))}
                                   </div>
                               </div>
                            </div>

                            <fieldset className="mt-6">
                                <legend className="text-md font-semibold text-gray-800 dark:text-gray-200">Choose Renewal Path</legend>
                                <div className="mt-2 space-y-3">
                                    {decisionOptions.map((option) => (
                                        <label
                                            key={option.mode}
                                            className={`relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none transition-all ${
                                                selectedMode === option.mode ? `border-primary-500 ring-2 ring-primary-500` : 'border-gray-300 dark:border-gray-600'
                                            } hover:border-primary-400`}
                                        >
                                            <input
                                                type="radio"
                                                name="renewal-mode"
                                                value={option.mode}
                                                className="sr-only"
                                                checked={selectedMode === option.mode}
                                                onChange={(e) => setSelectedMode(e.target.value as RenewalMode)}
                                            />
                                            <div className="flex items-center">
                                                <div className={`flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-${option.color}-100 dark:bg-${option.color}-900/20 mr-4`}>
                                                   {option.icon}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="block text-md font-semibold text-gray-900 dark:text-gray-100">{option.title}</span>
                                                    <span className="block text-sm text-gray-500 dark:text-gray-400">{option.description}</span>
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                            
                            <div className="mt-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Justification / Notes {selectedMode === 'terminate' && <span className="text-red-500">*</span>}
                                </label>
                                <textarea 
                                    value={justification}
                                    onChange={(e) => setJustification(e.target.value)}
                                    rows={3}
                                    placeholder={selectedMode === 'terminate' ? 'Please provide a reason for terminating this contract...' : 'Optional notes...'}
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 focus:ring-primary focus:border-primary"
                                />
                            </div>

                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={!selectedMode || isConfirmDisabled}
                                title={isConfirmDisabled ? "Justification is required to terminate a contract." : undefined}
                                className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-900 shadow-sm hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirm Decision
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 sm:mt-0 sm:w-auto"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}