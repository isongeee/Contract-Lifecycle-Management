import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { Contract, Clause, Property, ContractStatus as ContractStatusType, ContractVersion, UserProfile, AuditLog, RenewalStatus, RenewalMode, SigningStatus, Comment } from '../types';
import { ContractStatus, ApprovalStatus, ContractFrequency, RenewalStatus as RenewalStatusEnum, SigningStatus as SigningStatusEnum, RenewalMode as RenewalModeEnum } from '../types';
import StatusTag from './StatusTag';
import { ArrowLeftIcon, SparklesIcon, LoaderIcon, CopyIcon, FileTextIcon, ChevronDownIcon, ArchiveIcon, CheckCircleIcon, XCircleIcon, HomeIcon, ClockIcon, RefreshCwIcon, PenSquareIcon, GitCompareIcon, MessageSquareIcon, EditIcon, AlertTriangleIcon, DownloadIcon } from './icons';
import { APPROVAL_STATUS_COLORS, RENEWAL_STATUS_COLORS } from '../constants';
import { summarizeContractRisk, extractClauses } from '../services/geminiService';
import CreateVersionModal from './CreateVersionModal';
import RequestApprovalModal from './RequestApprovalModal';
import ConfirmStatusChangeModal from './ConfirmStatusChangeModal';
import { supabase } from '../lib/supabaseClient';
import RenewalDecisionModal from './RenewalDecisionModal';
import VersionComparisonView from './VersionComparisonView';
import CommentsPanel from './CommentsPanel';
import UpdateStatusModal from './UpdateStatusModal';
import { jsPDF } from 'jspdf';
import { useAppContext } from '../contexts/AppContext';

type ContractAction = ContractStatus | 'APPROVE_STEP' | 'REJECT_STEP';

interface ContractDetailProps {
  contractId: string;
  properties: Property[];
  users: UserProfile[];
  currentUser: UserProfile;
  onBack: () => void;
  onTransition: (contractId: string, action: ContractAction, payload?: any) => void;
  onCreateNewVersion: (contractId: string, newVersionData: Omit<ContractVersion, 'id' | 'versionNumber' | 'createdAt' | 'author'> & { file?: File | null }) => void;
  onRenewalDecision: (renewalRequestId: string, mode: RenewalMode, notes?: string) => void;
  onCreateRenewalRequest: (contractId: string) => void;
  onSelectContract: (contractId: string) => void;
  onRenewAsIs: (contractId: string, notes?: string) => void;
  onStartRenegotiation: (originalContractId: string, notes?: string) => void;
  onUpdateSigningStatus: (contractId: string, status: SigningStatus) => void;
  onCreateComment: (versionId: string, content: string) => void;
  onResolveComment: (commentId: string, isResolved: boolean) => void;
  onCreateRenewalFeedback: (renewalRequestId: string, feedbackText: string) => void;
  onUpdateRenewalTerms: (renewalRequestId: string, updatedTerms: { renewalTermMonths: number; noticePeriodDays: number; upliftPercent: number; }) => void;
  onNavigate: (view: string) => void;
  onDownloadFile: (storagePath: string, fileName: string) => void;
}

const ContractActions = ({ contract, onRequestTransition, onOpenApprovalModal, onStartCreateNewVersion }: { contract: Contract, onRequestTransition: (action: ContractAction) => void, onOpenApprovalModal: () => void, onStartCreateNewVersion: () => void }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const mainAction = () => {
        switch (contract.status) {
            case ContractStatus.DRAFT:
                return <button onClick={() => onRequestTransition(ContractStatus.IN_REVIEW)} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700">Submit for Review</button>;
            case ContractStatus.IN_REVIEW:
                return <button onClick={onOpenApprovalModal} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700">Request Approval</button>;
            case ContractStatus.APPROVED:
                return <button onClick={() => onRequestTransition(ContractStatus.SENT_FOR_SIGNATURE)} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700">Send for Signature</button>;
            case ContractStatus.SENT_FOR_SIGNATURE:
                // This action is now handled by the SigningProgressWidget for better UX.
                return null;
            case ContractStatus.FULLY_EXECUTED:
                const effectiveDate = new Date(contract.effectiveDate);
                if (effectiveDate <= new Date()) {
                    return <button onClick={() => onRequestTransition(ContractStatus.ACTIVE)} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700">Activate Contract</button>;
                }
                return <span className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-200 rounded-lg">Awaiting Activation</span>;
            default:
                return null;
        }
    }

    const canCreateNewVersion = [ContractStatus.DRAFT, ContractStatus.IN_REVIEW].includes(contract.status);
    
    return (
        <div className="flex space-x-3">
            {mainAction()}
            {canCreateNewVersion && (
                <button onClick={onStartCreateNewVersion} className="flex items-center px-4 py-2 text-sm font-semibold text-primary-700 bg-primary-100 rounded-lg hover:bg-primary-200">
                    <CopyIcon className="w-4 h-4 mr-2" />
                    Create New Version
                </button>
            )}
            <div className="relative">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                    <ChevronDownIcon className="w-5 h-5" />
                </button>
                {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 border border-gray-200 dark:border-gray-700 z-10">
                        <button onClick={() => { onRequestTransition(ContractStatus.ARCHIVED); setIsMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <ArchiveIcon className="w-4 h-4 mr-2" /> Archive
                        </button>
                        {contract.status === ContractStatus.ACTIVE && (
                            <>
                                <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                                <button
                                    onClick={() => { onRequestTransition(ContractStatus.TERMINATED); setIsMenuOpen(false); }}
                                    className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    <XCircleIcon className="w-4 h-4 mr-2" /> Terminate Contract
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{value}</dd>
    </div>
);

const ApprovalWidget = ({ steps }: { steps: Contract['approvalSteps']}) => {
    // Sort steps to show pending first, then by date for completed ones.
    const sortedSteps = [...steps].sort((a, b) => {
        if (a.status === ApprovalStatus.PENDING && b.status !== ApprovalStatus.PENDING) return -1;
        if (a.status !== ApprovalStatus.PENDING && b.status === ApprovalStatus.PENDING) return 1;
        // For non-pending, sort by approval date descending (most recent first)
        if (a.approvedAt && b.approvedAt) return new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime();
        return 0;
    });

    const getStatusLine = (step: Contract['approvalSteps'][number]) => {
        const actionDate = step.approvedAt ? new Date(step.approvedAt) : null;
        const formattedDate = actionDate ? actionDate.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
        
        switch (step.status) {
            case ApprovalStatus.APPROVED:
                return actionDate ? `on ${formattedDate}` : 'Approved';
            case ApprovalStatus.PENDING:
                return 'Awaiting response';
            case ApprovalStatus.REJECTED:
                return actionDate ? `on ${formattedDate}` : 'Rejected';
            case ApprovalStatus.REQUESTED_CHANGES:
                return actionDate ? `on ${formattedDate}` : 'Changes requested';
            default:
                return 'Action pending';
        }
    };
    
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Approval Workflow</h3>
            {sortedSteps.length > 0 ? (
                <ol className="relative border-l border-gray-200 dark:border-gray-700">
                    {sortedSteps.map((step) => (
                        <li key={step.id} className="mb-6 ml-6">
                            <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ring-8 ring-white dark:ring-gray-800 ${APPROVAL_STATUS_COLORS[step.status]}`}>
                               {step.status === ApprovalStatus.APPROVED && <CheckCircleIcon className="w-4 h-4 text-green-800 dark:text-green-200" />}
                               {step.status === ApprovalStatus.REJECTED && <XCircleIcon className="w-4 h-4 text-red-800 dark:text-red-200" />}
                               {step.status === ApprovalStatus.PENDING && <ClockIcon className="w-4 h-4 text-yellow-800 dark:text-yellow-200" />}
                               {step.status === ApprovalStatus.REQUESTED_CHANGES && <EditIcon className="w-4 h-4 text-blue-800 dark:text-blue-200" />}
                            </span>
                            <div className="ml-2">
                                 <h4 className="flex items-center mb-1 text-md font-semibold text-gray-900 dark:text-gray-100">
                                    {`${step.approver.firstName} ${step.approver.lastName}`}
                                    <span className="text-sm text-gray-500 dark:text-gray-400 font-normal ml-2">- {step.approver.role}</span>
                                </h4>
                                <div className="flex items-center space-x-2">
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${APPROVAL_STATUS_COLORS[step.status]}`}>
                                        {step.status}
                                    </span>
                                    <time className="block text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
                                        {getStatusLine(step)}
                                    </time>
                                </div>
                                {step.comment && (
                                    <p className="mt-2 text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded-md text-gray-800 dark:text-gray-200 italic">
                                        "{step.comment}"
                                    </p>
                                )}
                            </div>
                        </li>
                    ))}
                </ol>
            ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No approval steps have been initiated for this version.</p>
            )}
        </div>
    );
};

const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const VersionHistory = ({ versions, selectedVersionId, onSelectVersion, onCompare, compareSelection, onToggleCompareSelection, onDownloadFile }: { versions: Contract['versions']; selectedVersionId: string | null; onSelectVersion: (id: string) => void; onCompare: () => void; compareSelection: string[]; onToggleCompareSelection: (id: string) => void; onDownloadFile: (path: string, name: string) => void; }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Version History</h3>
            <button onClick={onCompare} disabled={compareSelection.length !== 2} className="flex items-center px-3 py-1.5 text-xs font-semibold text-primary-800 dark:text-primary-200 bg-primary-100 dark:bg-primary-900/40 rounded-md hover:bg-primary-200 disabled:opacity-50 disabled:cursor-not-allowed">
                <GitCompareIcon className="w-4 h-4 mr-1.5" /> Compare ({compareSelection.length}/2)
            </button>
        </div>
        <ul className="space-y-1 -mx-2 max-h-60 overflow-y-auto">
            {versions.slice().reverse().map(v => (
                <li key={v.id} className={`p-2 rounded-lg transition-colors ${v.id === selectedVersionId ? 'bg-primary-100 dark:bg-primary-900/20' : ''}`}>
                    <div className="flex items-start space-x-3">
                        <input type="checkbox" onChange={() => onToggleCompareSelection(v.id)} checked={compareSelection.includes(v.id)} className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                        <div className="w-full text-left flex justify-between items-start">
                            <button onClick={() => onSelectVersion(v.id)} className="flex items-start space-x-2">
                                <img className="h-8 w-8 rounded-full" src={v.author.avatarUrl} alt={`${v.author.firstName} ${v.author.lastName}`} />
                                <div>
                                    <p className={`text-sm font-semibold ${v.id === selectedVersionId ? 'text-primary-800 dark:text-primary-100' : 'text-gray-800 dark:text-gray-200'}`}>Version {v.versionNumber}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">by {`${v.author.firstName}`} on {v.createdAt}</p>
                                </div>
                            </button>
                            {v.storagePath && v.fileName && (
                                <button onClick={() => onDownloadFile(v.storagePath!, v.fileName!)} title={`Download ${v.fileName}`} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600">
                                <DownloadIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    </div>
);

const AiAnalysis = ({ onSummary, onExtract, riskSummary, extractedClauses, isLoadingSummary, isLoadingClauses, aiError }: { 
    onSummary: () => void; 
    onExtract: () => void;
    riskSummary?: string;
    extractedClauses?: Clause[];
    isLoadingSummary: boolean;
    isLoadingClauses: boolean;
    aiError: string | null;
}) => {
    return (
        <div className="bg-primary-50 dark:bg-primary-900/10 border border-primary-200 dark:border-primary-900/30 p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-200 flex items-center">
                    <SparklesIcon className="w-5 h-5 mr-2" />
                    Gemini AI Analysis
                </h3>
                <div className="flex space-x-2">
                    <button onClick={onSummary} disabled={isLoadingSummary} className="px-3 py-1.5 text-xs font-semibold text-primary-800 dark:text-primary-200 bg-white dark:bg-gray-700 border border-primary-300 dark:border-primary-700 rounded-md hover:bg-primary-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-wait flex items-center">
                        {isLoadingSummary ? <LoaderIcon className="w-4 h-4 mr-1.5" /> : null}
                        Summarize Risk
                    </button>
                    <button onClick={onExtract} disabled={isLoadingClauses} className="px-3 py-1.5 text-xs font-semibold text-primary-800 dark:text-primary-200 bg-white dark:bg-gray-700 border border-primary-300 dark:border-primary-700 rounded-md hover:bg-primary-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-wait flex items-center">
                         {isLoadingClauses ? <LoaderIcon className="w-4 h-4 mr-1.5" /> : null}
                        Extract Clauses
                    </button>
                </div>
            </div>
            
            {aiError && (
                <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-md text-sm text-red-800 dark:text-red-200">
                    <p className="font-semibold flex items-center"><AlertTriangleIcon className="w-4 h-4 mr-2" /> AI Analysis Failed</p>
                    <p className="mt-1">{aiError}</p>
                </div>
            )}

            {riskSummary && (
                <div className="mt-4">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">Risk Summary:</h4>
                    <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-white/50 dark:bg-gray-900/20 p-3 rounded-md">{riskSummary}</div>
                </div>
            )}

            {extractedClauses && extractedClauses.length > 0 && (
                <div className="mt-4">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">Extracted Clauses:</h4>
                    <div className="mt-2 space-y-3">
                        {extractedClauses.map(clause => (
                            <div key={clause.id} className="p-3 bg-white/50 dark:bg-gray-900/20 rounded-md border border-primary-100 dark:border-primary-900/20">
                                <p className="font-semibold text-sm text-gray-900 dark:text-gray-200">{clause.title}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">"{clause.summary}"</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const formatPropertyAddress = (property: Property) => {
    return [
        property.addressLine1,
        property.addressLine2,
        `${property.city}, ${property.state} ${property.zipCode}`,
        property.country
    ].filter(Boolean).join(', ');
};

const AssociatedPropertiesCard = ({ contract, properties }: { contract: Contract, properties: Property[] }) => {
    if (contract.allocation === 'portfolio') {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center"><HomeIcon className="w-5 h-5 mr-2 text-gray-400"/>Associated Properties</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This is a portfolio-wide contract and is not associated with any specific properties.</p>
            </div>
        );
    }

    const associatedProperties = contract.allocation === 'single'
        ? (contract.property ? [contract.property] : [])
        : (contract.propertyAllocations || [])
            .map(alloc => properties.find(p => p.id === alloc.propertyId))
            .filter((p): p is Property => !!p);

    if (!associatedProperties || associatedProperties.length === 0) return null;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center"><HomeIcon className="w-5 h-5 mr-2 text-gray-400"/>Associated Propert{associatedProperties.length > 1 ? 'ies' : 'y'}</h3>
            <ul className="space-y-3">
                {associatedProperties.map(prop => (
                    prop && <li key={prop.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md border dark:border-gray-700">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{prop.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{formatPropertyAddress(prop)}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const FinancialsAndAllocationCard = ({ contract, viewedVersion, properties }: { contract: Contract; viewedVersion: ContractVersion; properties: Property[] }) => {
    const isSeasonal = contract.frequency === ContractFrequency.SEASONAL && contract.seasonalMonths && contract.seasonalMonths.length > 0;
    const hasMultiAllocations = contract.allocation === 'multi' && contract.propertyAllocations && contract.propertyAllocations.length > 0;
    const totalValue = viewedVersion.value;

    const getPropertyName = (propertyId?: string) => {
        if (!propertyId || propertyId === 'portfolio') return 'Portfolio-wide';
        return properties.find(p => p.id === propertyId)?.name || 'Unknown Property';
    };

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatMonthYear = (monthYear: string) => {
        const [year, monthNum] = monthYear.split('-');
        return `${MONTHS[parseInt(monthNum, 10) - 1]} ${year}`;
    };

    const renderAllocationDetails = () => {
        if (isSeasonal) {
            return (
                <div className="mt-4 pt-4 border-t dark:border-gray-700">
                    <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-3">Seasonal Allocation Breakdown</h4>
                    <div className="space-y-4">
                        {contract.propertyAllocations?.map(alloc => (
                            <div key={alloc.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md border dark:border-gray-700">
                                <p className="font-semibold text-gray-800 dark:text-gray-200">{getPropertyName(alloc.propertyId)}</p>
                                <dl className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2">
                                    {alloc.monthlyValues && Object.entries(alloc.monthlyValues)
                                        .sort(([a], [b]) => a.localeCompare(b))
                                        .map(([month, value]) => (
                                        <div key={month}>
                                            <dt className="text-xs text-gray-500 dark:text-gray-400">{formatMonthYear(month)}</dt>
                                            <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatCurrency(value)}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (hasMultiAllocations) {
            return (
                 <div className="mt-4 pt-4 border-t dark:border-gray-700">
                    <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-3">Multi-Property Allocation</h4>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="text-left text-gray-500 dark:text-gray-400">
                                <tr><th className="p-2 font-medium">Property</th><th className="p-2 font-medium">Allocated Value</th><th className="p-2 font-medium">% of Total</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {contract.propertyAllocations?.map(alloc => {
                                    const percentage = totalValue > 0 ? (alloc.allocatedValue / totalValue) * 100 : 0;
                                    return (
                                        <tr key={alloc.id}>
                                            <td className="p-2 font-semibold text-gray-800 dark:text-gray-200">{getPropertyName(alloc.propertyId)}</td>
                                            <td className="p-2">{formatCurrency(alloc.allocatedValue)}</td>
                                            <td className="p-2">{percentage.toFixed(2)}%</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }
        
        return null;
    };
    
    if (!isSeasonal && !hasMultiAllocations) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Financials & Allocation</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                <DetailItem label="Total Contract Value" value={formatCurrency(totalValue)} />
                <DetailItem label="Allocation Type" value={
                    <span className="font-semibold capitalize">{contract.allocation.charAt(0).toUpperCase() + contract.allocation.slice(1)}</span>
                } />
            </dl>
            {renderAllocationDetails()}
        </div>
    )
}

const AuditLogCard = ({ auditLogs }: { auditLogs?: AuditLog[] }) => {
    if (!auditLogs || auditLogs.length === 0) return null;
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">History & Audit Log</h3>
            <ul className="space-y-4">
                {auditLogs.slice().reverse().map(log => (
                    <li key={log.id} className="flex space-x-3">
                        <div>
                            <img src={log.user?.avatarUrl} className="h-8 w-8 rounded-full" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm">
                                <span className="font-semibold">{log.user?.firstName || 'System'} {log.user?.lastName || ''}</span>
                                {` updated ${log.changeType.replace('_', ' ')} from `}
                                <span className="font-semibold">{log.oldValue || 'none'}</span>
                                {` to `}
                                <span className="font-semibold">{log.newValue}</span>.
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(log.createdAt).toLocaleString()}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const RenewalCard = ({ contract, onOpenDecisionModal, onUpdateRenewalTerms }: { contract: Contract, onOpenDecisionModal: () => void; onUpdateRenewalTerms: (renewalRequestId: string, updatedTerms: { renewalTermMonths: number; noticePeriodDays: number; upliftPercent: number; }) => void; }) => {
    if (!contract.renewalRequest) return null;
    const { renewalRequest } = contract;
    
    const [isEditing, setIsEditing] = useState(false);
    const [terms, setTerms] = useState({
        renewalTermMonths: renewalRequest.renewalTermMonths ?? contract.renewalTermMonths ?? 12,
        noticePeriodDays: renewalRequest.noticePeriodDays ?? contract.noticePeriodDays ?? 30,
        upliftPercent: renewalRequest.upliftPercent ?? contract.upliftPercent ?? 0,
    });
    
    const handleSave = () => {
        onUpdateRenewalTerms(renewalRequest.id, terms);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setTerms({
            renewalTermMonths: renewalRequest.renewalTermMonths ?? contract.renewalTermMonths ?? 12,
            noticePeriodDays: renewalRequest.noticePeriodDays ?? contract.noticePeriodDays ?? 30,
            upliftPercent: renewalRequest.upliftPercent ?? contract.upliftPercent ?? 0,
        });
        setIsEditing(false);
    };

    const handleInputChange = (field: keyof typeof terms, value: string) => {
        setTerms(prev => ({ ...prev, [field]: Number(value) }));
    };
    
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Renewal Management</h3>
                 {renewalRequest.status === RenewalStatusEnum.IN_PROGRESS && !isEditing && (
                    <button onClick={() => setIsEditing(true)} className="flex items-center px-3 py-1.5 text-xs font-semibold text-primary-800 dark:text-primary-200 bg-primary-100 dark:bg-primary-900/40 rounded-md hover:bg-primary-200">
                        <EditIcon className="w-4 h-4 mr-1.5" />
                        Edit Terms
                    </button>
                 )}
            </div>

            {renewalRequest.status === RenewalStatusEnum.DECISION_NEEDED && (
                <div className="flex justify-between items-center bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg">
                    <div>
                        <p className="font-semibold text-primary-800 dark:text-primary-200">Action Required</p>
                        <p className="text-sm text-primary-700 dark:text-primary-300">Please make a decision on how to proceed with this renewal.</p>
                    </div>
                    <button onClick={onOpenDecisionModal} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700">
                        Make Decision
                    </button>
                </div>
            )}
            
            {(renewalRequest.status === RenewalStatusEnum.IN_PROGRESS) && (
                 <div>
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Renewal Status</p>
                            <StatusTag type="renewal" status={renewalRequest.status} />
                        </div>
                    </div>
                    
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 md:grid-cols-3">
                        {isEditing ? (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Renewal Term (Months)</label>
                                    <input type="number" value={terms.renewalTermMonths} onChange={e => handleInputChange('renewalTermMonths', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-sm"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Notice Period (Days)</label>
                                    <input type="number" value={terms.noticePeriodDays} onChange={e => handleInputChange('noticePeriodDays', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-sm"/>
                                </div>
                                 <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Uplift %</label>
                                    <input type="number" value={terms.upliftPercent} onChange={e => handleInputChange('upliftPercent', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-sm"/>
                                </div>
                            </>
                        ) : (
                            <>
                                <DetailItem label="Renewal Term" value={`${terms.renewalTermMonths} months`} />
                                <DetailItem label="Notice Period" value={`${terms.noticePeriodDays} days`} />
                                <DetailItem label="Uplift %" value={`${terms.upliftPercent}%`} />
                            </>
                        )}
                        <DetailItem label="Renewal Mode" value={<span className="font-semibold capitalize">{renewalRequest.mode.replace('_', ' ')}</span>} />
                        <DetailItem label="Renewal Owner" value={renewalRequest.renewalOwner ? `${renewalRequest.renewalOwner.firstName} ${renewalRequest.renewalOwner.lastName}` : 'Unassigned'} />
                         {renewalRequest.notes && <DetailItem label="Notes" value={renewalRequest.notes} />}
                    </dl>
                    {isEditing && (
                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={handleCancel} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                            <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700">Save Changes</button>
                        </div>
                    )}
                </div>
            )}
            
            {(renewalRequest.status === RenewalStatusEnum.COMPLETED || renewalRequest.status === RenewalStatusEnum.CANCELLED) && (
                 <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Renewal Status</p>
                    <StatusTag type="renewal" status={renewalRequest.status} />
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">This renewal process is complete.</p>
                 </div>
            )}
        </div>
    );
};

const SigningProgressWidget = ({ contract, onUpdateSigningStatus, onMarkAsExecuted }: { contract: Contract; onUpdateSigningStatus: (contractId: string, status: SigningStatus) => void; onMarkAsExecuted: (contractId: string) => void }) => {
    if (contract.status !== ContractStatus.SENT_FOR_SIGNATURE) return null;

    const steps = [
        { status: SigningStatusEnum.AWAITING_INTERNAL, label: 'Awaiting Internal Signature' },
        { status: SigningStatusEnum.SENT_TO_COUNTERPARTY, label: 'Sent to Counterparty' },
        { status: SigningStatusEnum.VIEWED_BY_COUNTERPARTY, label: 'Viewed by Counterparty' },
        { status: SigningStatusEnum.SIGNED_BY_COUNTERPARTY, label: 'Signed by Counterparty' },
    ];
    
    const currentStepIndex = contract.signingStatus ? steps.findIndex(step => step.status === contract.signingStatus) : -1;

    const nextAction = () => {
        if (currentStepIndex < steps.length - 1) {
            const nextStep = steps[currentStepIndex + 1];
            return <button onClick={() => onUpdateSigningStatus(contract.id, nextStep.status)} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700">Advance to: {nextStep.label}</button>;
        }
        if (currentStepIndex === steps.length - 1) {
            return <button onClick={() => onMarkAsExecuted(contract.id)} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700">Mark as Fully Executed</button>;
        }
        return null;
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center"><PenSquareIcon className="w-5 h-5 mr-2 text-gray-400"/>Signing Progress</h3>
            <ol className="relative border-l border-gray-200 dark:border-gray-700">
                {steps.map((step, index) => {
                    const isCompleted = currentStepIndex >= index;
                    const isActive = currentStepIndex === index;
                    return (
                        <li key={step.status} className="mb-6 ml-6">
                            <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ring-8 ring-white dark:ring-gray-800 ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}`}>
                                {isCompleted && <CheckCircleIcon className="w-4 h-4 text-white" />}
                            </span>
                            <div>
                                <h4 className={`text-md font-semibold ${isActive ? 'text-primary-600 dark:text-primary-300' : 'text-gray-900 dark:text-gray-100'}`}>{step.label}</h4>
                                {isActive && <time className="block mb-2 text-sm font-normal leading-none text-gray-400 dark:text-gray-500">Current Step (Updated {new Date(contract.signingStatusUpdatedAt || Date.now()).toLocaleDateString()})</time>}
                            </div>
                        </li>
                    )
                })}
            </ol>
            <div className="mt-6 flex justify-end">
                {nextAction()}
            </div>
        </div>
    )
};

const daysUntil = (dateStr: string) => {
    if (!dateStr) return Infinity;
    // Get today's date at midnight UTC to ensure consistent comparison
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    
    // Parse the YYYY-MM-DD string as midnight UTC
    const targetDate = new Date(dateStr + 'T00:00:00Z');
    if (isNaN(targetDate.getTime())) return Infinity;
    
    const diffTime = targetDate.getTime() - todayUTC.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};


export default function ContractDetail({ contractId, properties, users, currentUser, onBack, onTransition, onCreateNewVersion, onRenewalDecision, onCreateRenewalRequest, onSelectContract, onRenewAsIs, onStartRenegotiation, onUpdateSigningStatus, onCreateComment, onResolveComment, onCreateRenewalFeedback, onUpdateRenewalTerms, onNavigate, onDownloadFile }: ContractDetailProps) {
  const { contracts, isLoading: isContextLoading } = useAppContext();
  
  // Get contract from context for real-time updates
  const contract = useMemo(() => contracts.find(c => c.id === contractId) || null, [contracts, contractId]);

  const [error, setError] = useState<string | null>(null);

  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [isRequestingApproval, setIsRequestingApproval] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isLoadingClauses, setIsLoadingClauses] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isMakingDecision, setIsMakingDecision] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; action: ContractAction | null; payload?: any; }>({ isOpen: false, action: null, payload: undefined });
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [comparingVersions, setComparingVersions] = useState<{v1: ContractVersion, v2: ContractVersion} | null>(null);
  
  // Local state for AI analysis results (ephemeral)
  const [riskSummary, setRiskSummary] = useState<string | undefined>();
  const [extractedClauses, setExtractedClauses] = useState<Clause[] | undefined>();

  const [viewedVersionId, setViewedVersionId] = useState<string | null>(null);
  
  // Initialize viewed version on contract load or change
  useEffect(() => {
    if (contract && !viewedVersionId) {
         const newLatestVersion = contract.versions.length > 0 ? contract.versions[contract.versions.length - 1] : null;
         setViewedVersionId(newLatestVersion?.id || null);
    }
  }, [contract, viewedVersionId]);

  // Reset analysis when contract changes significantly (e.g. navigated away and back)
  useEffect(() => {
      setRiskSummary(undefined);
      setExtractedClauses(undefined);
  }, [contractId]);
  
  const latestVersion = useMemo(() => 
    contract?.versions.length ? contract.versions[contract.versions.length - 1] : null
  , [contract?.versions]);
    
  const viewedVersion = useMemo(() => 
    contract?.versions.find(v => v.id === viewedVersionId) || latestVersion
  , [contract?.versions, viewedVersionId, latestVersion]);

  const [editedContent, setEditedContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [parentContractTitle, setParentContractTitle] = useState<string | null>(null);

  useEffect(() => {
    if (contract?.parentContractId) {
        supabase.from('contracts').select('title').eq('id', contract.parentContractId).single().then(({ data }) => {
            if (data) setParentContractTitle(data.title);
        });
    } else {
        setParentContractTitle(null);
    }
  }, [contract?.parentContractId]);

  const canInitiateRenewal = (
    contract && (contract.status === ContractStatus.EXPIRED || 
    (contract.status === ContractStatus.ACTIVE && daysUntil(contract.endDate) <= 90)) 
    && !contract.renewalRequest
  );

  useEffect(() => {
    if (viewedVersion) {
        setEditedContent(viewedVersion.content);
        setIsDirty(false);
    }
  }, [viewedVersion]);

  const handleSaveNewVersion = (newVersionData: Omit<ContractVersion, 'id' | 'versionNumber' | 'createdAt' | 'author'> & { file?: File | null }) => {
    onCreateNewVersion(contractId, newVersionData);
    setIsCreatingVersion(false);
  };

  if (isContextLoading) {
    return <div className="flex items-center justify-center h-full"><LoaderIcon className="w-12 h-12 text-primary" /></div>;
  }

  if (!contract) {
    return <div className="text-center py-10 text-red-500">{error || "Contract not found or access denied."}</div>;
  }

  if (!viewedVersion) {
    return (
        <div>
            <button onClick={onBack} className="flex items-center text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 mb-4">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to all contracts
            </button>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{contract.title}</h1>
                 <div className="mt-4 text-center py-10">
                    <FileTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">No Versions Available</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">This contract currently has no versions. Please create one to proceed.</p>
                    <div className="mt-6">
                        <button
                            onClick={() => setIsCreatingVersion(true)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                            Create New Version
                        </button>
                    </div>
                </div>
            </div>
            {isCreatingVersion && ( <CreateVersionModal contract={contract} properties={properties} onClose={() => setIsCreatingVersion(false)} onSave={handleSaveNewVersion} /> )}
        </div>
    );
  }
  
  const canEditContent = [ContractStatus.DRAFT, ContractStatus.IN_REVIEW].includes(contract.status);

  const handleCancelEdit = () => {
    setEditedContent(viewedVersion.content);
    setIsDirty(false);
  };

  const handleSaveChanges = () => {
    if (!isDirty || !canEditContent) return;
    
    const { id, versionNumber, createdAt, author, comments, ...baseVersionData } = viewedVersion;
    
    const newVersionData = {
      ...baseVersionData,
      content: editedContent,
    };

    onCreateNewVersion(contract.id, newVersionData);
    setIsDirty(false);
  };


  const handleRequestTransition = (action: ContractAction, payload?: any) => {
    setConfirmModalState({ isOpen: true, action, payload });
  };

  const myPendingApprovalStep = useMemo(() => {
      if (contract.status !== ContractStatus.PENDING_APPROVAL) return null;
      return contract.approvalSteps.find(step => step.approver.id === currentUser.id && step.status === ApprovalStatus.PENDING);
  }, [contract, currentUser]);

  const handleApprove = () => myPendingApprovalStep && handleRequestTransition('APPROVE_STEP', { stepId: myPendingApprovalStep.id });
  const handleReject = () => myPendingApprovalStep && handleRequestTransition('REJECT_STEP', { stepId: myPendingApprovalStep.id });

  const handleSummarizeRisk = useCallback(async () => {
    setIsLoadingSummary(true);
    setAiError(null);
    try {
        const summary = await summarizeContractRisk(editedContent);
        setRiskSummary(summary);
        setExtractedClauses(undefined);
    } catch (error) {
        console.error("Error summarizing contract risk:", error);
        setAiError(error instanceof Error ? error.message : "An unknown error occurred during risk analysis.");
        setRiskSummary(undefined);
    } finally {
        setIsLoadingSummary(false);
    }
  }, [editedContent]);

  const handleExtractClauses = useCallback(async () => {
    setIsLoadingClauses(true);
    setAiError(null);
    try {
        const clauses = await extractClauses(editedContent);
        setExtractedClauses(clauses);
        setRiskSummary(undefined);
    } catch (error) {
        console.error("Error extracting clauses:", error);
        setAiError(error instanceof Error ? error.message : "An unknown error occurred during clause extraction.");
        setExtractedClauses(undefined);
    } finally {
        setIsLoadingClauses(false);
    }
  }, [editedContent]);

  const handleSelectVersion = (id: string) => {
    if (isDirty) {
        if (!window.confirm("You have unsaved changes. Are you sure you want to discard them and switch versions?")) {
            return;
        }
    }
    setViewedVersionId(id);
    setRiskSummary(undefined);
    setExtractedClauses(undefined);
  };
  
  const handleRequestApproval = (approvers: UserProfile[], versionId: string) => {
    onTransition(contract.id, ContractStatus.PENDING_APPROVAL, { approvers, draft_version_id: versionId });
    setIsRequestingApproval(false);
  };
  
  const handleToggleCompareSelection = (versionId: string) => {
    setCompareSelection(prev => 
        prev.includes(versionId)
            ? prev.filter(id => id !== versionId)
            : [...prev, versionId].slice(-2)
    );
  };

  const handleCompare = () => {
      if (compareSelection.length === 2) {
          const v1 = contract.versions.find(v => v.id === compareSelection[0]);
          const v2 = contract.versions.find(v => v.id === compareSelection[1]);
          if (v1 && v2) {
              setComparingVersions(v1.versionNumber < v2.versionNumber ? { v1, v2 } : { v1: v2, v2: v1 });
          }
      }
  };
  
  const handleGeneratePdf = () => {
    if (!editedContent) return;
  
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'pt',
      format: 'a4',
    });
  
    doc.setProperties({
      title: `${contract?.title || 'Contract'} - v${viewedVersion.versionNumber}`,
      author: `${currentUser.firstName} ${currentUser.lastName}`,
    });
  
    const margin = 40; // points
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const usableWidth = pageWidth - margin * 2;
  
    // Base font + simple line height
    doc.setFontSize(10);
    const lineHeight = doc.getFontSize() * 1.2; // 20% extra spacing for readability
  
    // Wrap the entire contract text to fit within the usable width
    const textLines = doc.splitTextToSize(editedContent, usableWidth);
  
    let y = margin;
  
    for (const line of textLines) {
      // If the next line doesn't fit on the current page, add a new page
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
  
      // Guard against any weird falsy values (just in case)
      doc.text(line || '', margin, y);
      y += lineHeight;
    }
  
    doc.save(
      `${(contract?.title || 'contract').replace(/\s+/g, '_')}_v${viewedVersion.versionNumber}.pdf`
    );
  };


  return (
    <div>
        <button onClick={onBack} className="flex items-center text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 mb-4">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to all contracts
        </button>

        {myPendingApprovalStep && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-r-lg mb-6 flex justify-between items-center shadow-sm">
                <div>
                    <h3 className="font-bold text-yellow-800 dark:text-yellow-200">Your Approval is Requested</h3>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">Please review this contract and approve or reject it.</p>
                </div>
                <div className="flex space-x-3">
                     <button onClick={handleReject} className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                        <XCircleIcon className="w-5 h-5 mr-2 text-red-500" />
                        Reject
                    </button>
                    <button onClick={handleApprove} className="flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                        <CheckCircleIcon className="w-5 h-5 mr-2" />
                        Approve
                    </button>
                </div>
            </div>
        )}

        {contract.status === ContractStatus.SENT_FOR_SIGNATURE && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-400 p-4 rounded-r-lg mb-6 flex justify-between items-center shadow-sm">
                <div>
                    <h3 className="font-bold text-indigo-800 dark:text-indigo-200">Out for Signature</h3>
                    <p className="text-sm text-indigo-700 dark:text-indigo-300">This contract is in the signing process. Track its progress on the Signing page.</p>
                </div>
                <button
                    onClick={() => onNavigate('signing')}
                    className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 whitespace-nowrap"
                >
                    <PenSquareIcon className="w-4 h-4 mr-2" />
                    Go to Signing Page
                </button>
            </div>
        )}

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm mb-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{contract.title}</h1>
                    {parentContractTitle && (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex items-center">
                            <RefreshCwIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                            Renewed from:{' '}
                            <button 
                                onClick={() => onSelectContract(contract.parentContractId!)} 
                                className="ml-1 font-semibold text-primary hover:underline focus:outline-none"
                            >
                                {parentContractTitle}
                            </button>
                        </p>
                    )}
                    <div className="mt-2 flex items-center space-x-4">
                        <div className="flex items-center gap-x-2">
                            <StatusTag type="contract" status={contract.status} />
                            {(currentUser.role === 'Admin' || currentUser.id === contract.owner.id) && (
                                <button
                                    onClick={() => setIsUpdatingStatus(true)}
                                    className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                                    title="Change Status"
                                >
                                    <EditIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <StatusTag type="risk" status={contract.riskLevel} />
                        {!comparingVersions && <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Viewing Version {viewedVersion.versionNumber}</span>}
                        {comparingVersions && <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Comparing v{comparingVersions.v1.versionNumber} and v{comparingVersions.v2.versionNumber}</span>}
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                     {canInitiateRenewal && (
                        <button 
                            onClick={() => onCreateRenewalRequest(contract.id)}
                            className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <RefreshCwIcon className="w-4 h-4 mr-2" />
                            Start Renewal Process
                        </button>
                    )}
                    <ContractActions contract={contract} onRequestTransition={handleRequestTransition} onOpenApprovalModal={() => setIsRequestingApproval(true)} onStartCreateNewVersion={() => setIsCreatingVersion(true)} />
                </div>
            </div>
             <dl className="mt-6 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                <DetailItem label="Counterparty" value={contract.counterparty.name} />
                <DetailItem label="Contract Value" value={formatCurrency(viewedVersion.value)} />
                <DetailItem label="Effective Date" value={viewedVersion.effectiveDate} />
                <DetailItem label="End Date" value={viewedVersion.endDate} />
                <DetailItem label="Frequency" value={viewedVersion.frequency} />
                <DetailItem label="Owner" value={ <div className="flex items-center space-x-2"> <img className="h-6 w-6 rounded-full" src={contract.owner.avatarUrl} alt={`${contract.owner.firstName} ${contract.owner.lastName}`} /> <span className="dark:text-gray-200">{`${contract.owner.firstName} ${contract.owner.lastName}`}</span> </div> } />
            </dl>
        </div>
        
        {contract.renewalRequest && (
            <div className="mb-6">
                 <RenewalCard contract={contract} onOpenDecisionModal={() => setIsMakingDecision(true)} onUpdateRenewalTerms={onUpdateRenewalTerms} />
            </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8 space-y-6">
                 {comparingVersions ? (
                    <div>
                        <button onClick={() => setComparingVersions(null)} className="text-sm font-semibold text-primary-600 mb-2">← Back to Document View</button>
                        <VersionComparisonView v1={comparingVersions.v1} v2={comparingVersions.v2} />
                    </div>
                 ) : (
                    <>
                        <AiAnalysis onSummary={handleSummarizeRisk} onExtract={handleExtractClauses} riskSummary={riskSummary} extractedClauses={extractedClauses} isLoadingSummary={isLoadingSummary} isLoadingClauses={isLoadingClauses} aiError={aiError} />
                        <FinancialsAndAllocationCard contract={contract} viewedVersion={viewedVersion} properties={properties} />
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Contract Document (Version {viewedVersion.versionNumber})</h3>
                                <button onClick={handleGeneratePdf} className="flex items-center px-3 py-1.5 text-xs font-semibold text-primary-800 dark:text-primary-200 bg-white dark:bg-gray-700 border border-primary-300 dark:border-primary-700 rounded-md hover:bg-primary-100 dark:hover:bg-gray-600">
                                    <DownloadIcon className="w-4 h-4 mr-1.5" />
                                    Generate PDF
                                </button>
                            </div>
                            <div className="prose prose-sm max-w-none">
                               <textarea
                                    value={editedContent}
                                    onChange={(e) => {
                                        setEditedContent(e.target.value);
                                        setIsDirty(true);
                                    }}
                                    readOnly={!canEditContent}
                                    rows={15}
                                    className={`w-full text-xs font-mono p-4 rounded-md border dark:border-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${canEditContent ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-900/50 cursor-not-allowed'}`}
                                />
                            </div>
                            {isDirty && canEditContent && (
                                <div className="mt-4 flex justify-end items-center space-x-3">
                                    <p className="text-sm text-yellow-600 dark:text-yellow-400">You have unsaved changes.</p>
                                    <button onClick={handleCancelEdit} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                                    <button onClick={handleSaveChanges} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700">Save as New Version</button>
                                </div>
                            )}
                        </div>
                    </>
                 )}
                 <ApprovalWidget steps={contract.approvalSteps} />
            </div>
            <div className="xl:col-span-4 space-y-6">
                <VersionHistory versions={contract.versions} selectedVersionId={viewedVersionId} onSelectVersion={handleSelectVersion} onCompare={handleCompare} compareSelection={compareSelection} onToggleCompareSelection={handleToggleCompareSelection} onDownloadFile={onDownloadFile}/>
                <CommentsPanel comments={viewedVersion.comments || []} users={users} currentUser={currentUser} versionId={viewedVersion.id} contractContent={editedContent} onCreateComment={onCreateComment} onResolveComment={onResolveComment} />
            </div>
        </div>
        {isCreatingVersion && ( <CreateVersionModal contract={contract} properties={properties} onClose={() => setIsCreatingVersion(false)} onSave={handleSaveNewVersion} /> )}
        {isRequestingApproval && ( <RequestApprovalModal contract={contract} users={users} onClose={() => setIsRequestingApproval(false)} onSave={handleRequestApproval} /> )}
        {confirmModalState.isOpen && confirmModalState.action && ( <ConfirmStatusChangeModal isOpen={confirmModalState.isOpen} onClose={() => setConfirmModalState({ isOpen: false, action: null, payload: undefined })} onConfirm={() => { if (confirmModalState.action) { onTransition(contract.id, confirmModalState.action, confirmModalState.payload); } setConfirmModalState({ isOpen: false, action: null, payload: undefined }); }} contractTitle={contract.title} currentStatus={contract.status} action={confirmModalState.action} /> )}
        {isMakingDecision && contract.renewalRequest && (
            <RenewalDecisionModal
                contract={contract}
                contracts={[]}
                onClose={() => setIsMakingDecision(false)}
                onConfirm={(mode, notes) => {
                    onRenewalDecision(contract.renewalRequest!.id, mode, notes);
                    setIsMakingDecision(false);
                }}
                onStartRenegotiation={(notes) => {
                    onStartRenegotiation(contract.id, notes);
                    setIsMakingDecision(false);
                }}
                onFinalizeRenewAsIs={(notes) => {
                    onRenewAsIs(contract.id, notes);
                    setIsMakingDecision(false);
                }}
                currentUser={currentUser}
                onCreateRenewalFeedback={onCreateRenewalFeedback}
            />
        )}
        {isUpdatingStatus && (
            <UpdateStatusModal
                contract={contract}
                onClose={() => setIsUpdatingStatus(false)}
                onUpdate={(newStatus) => {
                    onTransition(contract.id, newStatus);
                    setIsUpdatingStatus(false);
                }}
            />
        )}
    </div>
  );
}