import React, { useState, useMemo } from 'react';
import { RenewalMode } from '../types';
import type { Contract, UserProfile } from '../types';
import { XIcon, RefreshCwIcon, FileTextIcon, EditIcon, XCircleIcon, SparklesIcon, LoaderIcon, UserIcon } from './icons';
import { summarizePerformanceMetrics } from '../services/geminiService';

interface RenewalDecisionModalProps {
    contract: Contract;
    contracts: Contract[];
    currentUser: UserProfile;
    onClose: () => void;
    onConfirm: (mode: RenewalMode, notes?: string) => void;
    onStartRenegotiation: (notes?: string) => void;
    onFinalizeRenewAsIs: (notes?: string) => void;
    onCreateRenewalFeedback: (renewalRequestId: string, feedbackText: string) => void;
}

type Step = 'initial' | 'changes' | 'confirm_asis' | 'amend_vs_renegotiate';

const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const InfoItem = ({ label, value, className = '' }: { label: string; value: React.ReactNode; className?: string }) => (
    <div className={className}>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{value}</p>
    </div>
);

const BigButton = ({ title, description, icon, onClick, color }: { title: string; description: string; icon: React.ReactNode; onClick: () => void; color: string; }) => (
    <button
        onClick={onClick}
        className={`w-full text-left relative flex rounded-lg border p-4 shadow-sm focus:outline-none transition-all border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:ring-2 hover:ring-primary-400`}
    >
        <div className="flex items-center">
            <div className={`flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-${color}-100 dark:bg-${color}-900/20 mr-4`}>
               {icon}
            </div>
            <div className="flex flex-col">
                <span className="block text-md font-semibold text-gray-900 dark:text-gray-100">{title}</span>
                <span className="block text-sm text-gray-500 dark:text-gray-400">{description}</span>
            </div>
        </div>
    </button>
);


export default function RenewalDecisionModal({ contract, contracts, currentUser, onClose, onConfirm, onStartRenegotiation, onFinalizeRenewAsIs, onCreateRenewalFeedback }: RenewalDecisionModalProps) {
    const [step, setStep] = useState<Step>('initial');
    const [justification, setJustification] = useState('');
    const [performanceSummary, setPerformanceSummary] = useState('');
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [newFeedback, setNewFeedback] = useState('');

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

    const handleAddFeedback = () => {
        if (newFeedback.trim() && contract.renewalRequest) {
            onCreateRenewalFeedback(contract.renewalRequest.id, newFeedback);
            setNewFeedback('');
        }
    };
    
    const upliftAmount = contract.value * ((contract.renewalRequest?.upliftPercent || 0) / 100);
    const projectedValue = contract.value + upliftAmount;
    
    const termMonths = contract.renewalRequest?.renewalTermMonths ?? contract.renewalTermMonths ?? 12;
    const originalEndDate = new Date(contract.endDate + 'T00:00:00Z');
    const newStartDate = new Date(originalEndDate);
    newStartDate.setUTCDate(newStartDate.getUTCDate() + 1);
    const newEndDate = new Date(newStartDate);
    newEndDate.setUTCMonth(newEndDate.getUTCMonth() + termMonths);
    newEndDate.setUTCDate(newEndDate.getUTCDate() - 1);


    const renderStepContent = () => {
        switch (step) {
            case 'initial':
                return (
                    <div>
                        <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">Start the Renewal Process</h4>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Do you intend to continue the relationship with {contract.counterparty.name} under this agreement?
                        </p>
                        <div className="mt-4 flex space-x-4">
                            <button onClick={() => setStep('changes')} className="flex-1 text-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">Yes, Proceed with Renewal</button>
                            <button onClick={() => onConfirm(RenewalMode.TERMINATE, justification)} className="flex-1 text-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">No, Terminate Contract</button>
                        </div>
                    </div>
                );

            case 'changes':
                return (
                    <div>
                         <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">Will there be changes?</h4>
                         <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Will there be any changes to the terms of the contract (besides standard date and value uplifts)?</p>
                         <div className="mt-4 flex space-x-4">
                            <button onClick={() => setStep('amend_vs_renegotiate')} className="flex-1 text-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">Yes, We Need to Make Changes</button>
                            <button onClick={() => setStep('confirm_asis')} className="flex-1 text-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">No, Renew with No Changes</button>
                        </div>
                    </div>
                );
            
            case 'confirm_asis':
                 return (
                    <div>
                         <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">Confirm "Renew As-Is"</h4>
                         <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Please confirm the details of this one-click renewal.</p>
                         <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-900/50 rounded-lg space-y-2 text-sm">
                             <p>This action will:</p>
                             <ul className="list-disc list-inside space-y-1">
                                <li>Create a new, immediately <span className="font-semibold">Active</span> contract for the next term ({newStartDate.toISOString().split('T')[0]} to {newEndDate.toISOString().split('T')[0]}).</li>
                                <li>Set the new value to <span className="font-semibold">{formatCurrency(projectedValue)}</span> (including the {contract.renewalRequest?.upliftPercent || 0}% uplift).</li>
                                <li>Mark the current contract as '<span className="font-semibold">Superseded</span>'.</li>
                             </ul>
                             <p className="font-bold text-red-600 dark:text-red-400 pt-2">This action is final and cannot be undone.</p>
                         </div>
                    </div>
                );
            
            case 'amend_vs_renegotiate':
                return (
                    <div>
                        <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">How will you be making changes?</h4>
                        <div className="mt-4 space-y-3">
                            <BigButton 
                                title="Create an Amendment"
                                description="Best for minor changes. This will create a new version of the current contract and return it to the 'In Review' stage for you to edit."
                                icon={<EditIcon className="h-6 w-6 text-indigo-600" />}
                                color="indigo"
                                onClick={() => onConfirm(RenewalMode.AMENDMENT, justification)}
                            />
                            <BigButton 
                                title="Draft a New Contract"
                                description="Best for major renegotiations. This will create a brand new, separate contract in 'Draft' status, linked to the original, for you to work on."
                                icon={<FileTextIcon className="h-6 w-6 text-blue-600" />}
                                color="blue"
                                onClick={() => onStartRenegotiation(justification)}
                            />
                        </div>
                    </div>
                );
            
            default: return null;
        }
    }
    
    const renderFooter = () => {
        const showJustification = step !== 'initial' && step !== 'changes';
        
        let confirmButton = null;
        if (step === 'confirm_asis') {
            confirmButton = <button onClick={() => onFinalizeRenewAsIs(justification)} className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-900 shadow-sm hover:bg-primary-600 sm:ml-3 sm:w-auto">Confirm & Renew</button>
        }

        return (
            <>
                {showJustification && (
                    <div className="px-6 pb-4">
                         <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                             Justification / Notes
                         </label>
                         <textarea 
                             value={justification}
                             onChange={(e) => setJustification(e.target.value)}
                             rows={2}
                             placeholder="Optional notes for audit trail..."
                             className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 focus:ring-primary focus:border-primary"
                         />
                    </div>
                )}
                <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 sm:flex sm:px-6">
                    {step !== 'initial' && <button type="button" onClick={() => setStep(step === 'amend_vs_renegotiate' || step === 'confirm_asis' ? 'changes' : 'initial')} className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 sm:mt-0 sm:w-auto">Back</button>}
                    <div className="flex-grow"></div>
                    {confirmButton}
                    <button type="button" onClick={onClose} className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 sm:mt-0 sm:w-auto sm:ml-3">Cancel</button>
                </div>
            </>
        )
    }

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
                        <div className="bg-white dark:bg-gray-800 px-4 pt-5 sm:p-6 sm:pb-0">
                            <h3 className="text-xl font-semibold leading-6 text-gray-900 dark:text-gray-100" id="modal-title">
                                Renewal Decision Support
                            </h3>
                             <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Review the information below to make an informed decision for <span className="font-semibold">{contract.title}</span>.
                            </p>

                            <div className="mt-6 space-y-4 max-h-[60vh] overflow-y-auto pr-4 pb-4">
                                <div className="space-y-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                    <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">Decision Support Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-600">
                                            <h5 className="font-semibold text-gray-700 dark:text-gray-300">Financial Impact</h5>
                                            <div className="mt-2 space-y-2">
                                                <InfoItem label="Current Contract Value" value={formatCurrency(contract.value)} />
                                                <InfoItem label="Total Lifetime Value" value={formatCurrency(lifetimeValue)} />
                                                <InfoItem label="Proposed Uplift" value={`${formatCurrency(upliftAmount)} (${contract.renewalRequest?.upliftPercent || 0}%)`} />
                                                <InfoItem label="Projected New Value" value={formatCurrency(projectedValue)} />
                                            </div>
                                        </div>
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
                               </div>
                               <div className="p-4">
                                  {renderStepContent()}
                               </div>
                            </div>

                        </div>
                        {renderFooter()}
                    </div>
                </div>
            </div>
        </div>
    );
}