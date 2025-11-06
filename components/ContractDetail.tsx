
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { Contract, Clause, Property, ContractStatus as ContractStatusType, ContractVersion, UserProfile } from '../types';
import { ContractStatus, ApprovalStatus } from '../types';
import StatusTag from './StatusTag';
// FIX: Imported the missing ArchiveIcon component.
import { ArrowLeftIcon, SparklesIcon, LoaderIcon, CopyIcon, FileTextIcon, ChevronDownIcon, ArchiveIcon, CheckCircleIcon, XCircleIcon } from './icons';
import { APPROVAL_STATUS_COLORS } from '../constants';
import { summarizeContractRisk, extractClauses } from '../services/geminiService';
import CreateVersionModal from './CreateVersionModal';
import RequestApprovalModal from './RequestApprovalModal';
import ConfirmStatusChangeModal from './ConfirmStatusChangeModal';

type ContractAction = ContractStatus | 'APPROVE_STEP' | 'REJECT_STEP';

interface ContractDetailProps {
  contract: Contract;
  properties: Property[];
  users: UserProfile[];
  currentUser: UserProfile;
  onBack: () => void;
  onTransition: (contractId: string, action: ContractAction, payload?: any) => void;
  onCreateNewVersion: (contractId: string, newVersionData: Omit<ContractVersion, 'id' | 'versionNumber' | 'createdAt' | 'author'>) => void;
}

const ContractActions = ({ contract, onRequestTransition, onOpenApprovalModal, onStartCreateNewVersion }: { contract: Contract, onRequestTransition: (action: ContractAction) => void, onOpenApprovalModal: () => void, onStartCreateNewVersion: () => void }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const allApproved = contract.approvalSteps.every(s => s.status === ApprovalStatus.APPROVED);

    const mainAction = () => {
        switch (contract.status) {
            case ContractStatus.DRAFT:
                return <button onClick={() => onRequestTransition(ContractStatus.IN_REVIEW)} className="px-4 py-2 text-sm font-semibold text-primary-900 bg-primary rounded-lg hover:bg-primary-600">Submit for Review</button>;
            case ContractStatus.IN_REVIEW:
                return <button onClick={onOpenApprovalModal} className="px-4 py-2 text-sm font-semibold text-primary-900 bg-primary rounded-lg hover:bg-primary-600">Request Approval</button>;
            case ContractStatus.APPROVED:
                return <button onClick={() => onRequestTransition(ContractStatus.SENT_FOR_SIGNATURE)} className="px-4 py-2 text-sm font-semibold text-primary-900 bg-primary rounded-lg hover:bg-primary-600">Send for Signature</button>;
            case ContractStatus.SENT_FOR_SIGNATURE:
                 return <button onClick={() => onRequestTransition(ContractStatus.FULLY_EXECUTED)} className="px-4 py-2 text-sm font-semibold text-primary-900 bg-primary rounded-lg hover:bg-primary-600">Mark as Executed</button>;
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
    
    return (
        <div className="flex space-x-3">
            {mainAction()}
            <button onClick={onStartCreateNewVersion} className="flex items-center px-4 py-2 text-sm font-semibold text-primary-700 bg-primary-100 rounded-lg hover:bg-primary-200">
                <CopyIcon className="w-4 h-4 mr-2" />
                Create New Version
            </button>
            <div className="relative">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                    <ChevronDownIcon className="w-5 h-5" />
                </button>
                {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 border z-10">
                        <button onClick={() => { onRequestTransition(ContractStatus.ARCHIVED); setIsMenuOpen(false); }} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            <ArchiveIcon className="w-4 h-4 mr-2" /> Archive
                        </button>
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

const ApprovalWidget = ({ steps }: { steps: Contract['approvalSteps']}) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Approval Workflow</h3>
        {steps.length > 0 ? (
            <ol className="relative border-l border-gray-200 dark:border-gray-700">
                {steps.map((step, index) => (
                    <li key={step.id} className="mb-6 ml-6">
                        <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ring-8 ring-white dark:ring-gray-800 ${APPROVAL_STATUS_COLORS[step.status]} text-xs`}>
                           {index + 1}
                        </span>
                        <div className="ml-2">
                             <h4 className="flex items-center mb-1 text-md font-semibold text-gray-900 dark:text-gray-100">{`${step.approver.firstName} ${step.approver.lastName}`}
                                <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${APPROVAL_STATUS_COLORS[step.status]}`}>
                                    {step.status}
                                </span>
                            </h4>
                            <time className="block mb-2 text-sm font-normal leading-none text-gray-400">
                                {step.status === ApprovalStatus.APPROVED ? `Approved on ${step.approvedAt}` : `Awaiting response`}
                            </time>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{step.approver.role}</p>
                        </div>
                    </li>
                ))}
            </ol>
        ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No approval steps have been initiated for this version.</p>
        )}
    </div>
);

const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const VersionHistory = ({ versions, selectedVersionId, onSelectVersion }: { versions: Contract['versions']; selectedVersionId: string; onSelectVersion: (id: string) => void; }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Version History</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Select a version to view its details and content.</p>
        <ul className="space-y-1 -mx-2">
            {versions.slice().reverse().map(v => (
                <li key={v.id}>
                    <button 
                        onClick={() => onSelectVersion(v.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors flex items-start space-x-3 ${v.id === selectedVersionId ? 'bg-primary-100 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                    >
                        <div className="flex-shrink-0">
                            <img className="h-8 w-8 rounded-full" src={v.author.avatarUrl} alt={`${v.author.firstName} ${v.author.lastName}`} />
                        </div>
                        <div>
                            <p className={`text-sm font-semibold ${v.id === selectedVersionId ? 'text-primary-800 dark:text-primary-100' : 'text-gray-800 dark:text-gray-200'}`}>Version {v.versionNumber}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">by {`${v.author.firstName} ${v.author.lastName}`} on {v.createdAt}</p>
                            {v.fileName && (
                                <div className="mt-1 flex items-center text-xs text-blue-600 dark:text-blue-400">
                                    <FileTextIcon className="w-3 h-3 mr-1" /> {v.fileName}
                                </div>
                            )}
                        </div>
                    </button>
                </li>
            ))}
        </ul>
    </div>
);

const AiAnalysis = ({ onSummary, onExtract, riskSummary, extractedClauses, isLoadingSummary, isLoadingClauses }: { 
    onSummary: () => void; 
    onExtract: () => void;
    riskSummary?: string;
    extractedClauses?: Clause[];
    isLoadingSummary: boolean;
    isLoadingClauses: boolean;
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
}

export default function ContractDetail({ contract: initialContract, properties, users, currentUser, onBack, onTransition, onCreateNewVersion }: ContractDetailProps) {
  const [contract, setContract] = useState(initialContract);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [isRequestingApproval, setIsRequestingApproval] = useState(false);
  const [viewedVersionId, setViewedVersionId] = useState(initialContract.versions[initialContract.versions.length - 1].id);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isLoadingClauses, setIsLoadingClauses] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    action: ContractAction | null;
    payload?: any;
  }>({ isOpen: false, action: null, payload: undefined });
  
  const latestVersion = contract.versions[contract.versions.length - 1];
  const viewedVersion = contract.versions.find(v => v.id === viewedVersionId) || latestVersion;

  useEffect(() => {
    setContract(initialContract);
    const newLatestVersion = initialContract.versions[initialContract.versions.length - 1];
    if (newLatestVersion) {
        setViewedVersionId(newLatestVersion.id);
    }
  }, [initialContract]);

  const handleRequestTransition = (action: ContractAction, payload?: any) => {
    setConfirmModalState({ isOpen: true, action, payload });
  };

  const myPendingApprovalStep = useMemo(() => {
      if (contract.status !== ContractStatus.PENDING_APPROVAL) {
          return null;
      }
      return contract.approvalSteps.find(step => step.approver.id === currentUser.id && step.status === ApprovalStatus.PENDING);
  }, [contract, currentUser]);

  const handleApprove = () => {
      if (myPendingApprovalStep) {
          handleRequestTransition('APPROVE_STEP', { stepId: myPendingApprovalStep.id });
      }
  };

  const handleReject = () => {
      if (myPendingApprovalStep) {
           handleRequestTransition('REJECT_STEP', { stepId: myPendingApprovalStep.id });
      }
  };

  const handleSummarizeRisk = useCallback(async () => {
    setIsLoadingSummary(true);
    const summary = await summarizeContractRisk(viewedVersion.content);
    setContract(c => ({...c, riskSummary: summary, extractedClauses: undefined }));
    setIsLoadingSummary(false);
  }, [viewedVersion.content]);

  const handleExtractClauses = useCallback(async () => {
    setIsLoadingClauses(true);
    const clauses = await extractClauses(viewedVersion.content);
    setContract(c => ({...c, extractedClauses: clauses, riskSummary: undefined }));
    setIsLoadingClauses(false);
  }, [viewedVersion.content]);

  const handleSaveNewVersion = (newVersionData: Omit<ContractVersion, 'id' | 'versionNumber' | 'createdAt' | 'author'>) => {
    onCreateNewVersion(contract.id, newVersionData);
    setIsCreatingVersion(false);
  };

  const handleSelectVersion = (id: string) => {
    setViewedVersionId(id);
    setContract(c => ({ ...c, riskSummary: undefined, extractedClauses: undefined }));
  };
  
  const handleRequestApproval = (approvers: UserProfile[], versionId: string) => {
    onTransition(contract.id, ContractStatus.PENDING_APPROVAL, { approvers, draft_version_id: versionId });
    setIsRequestingApproval(false);
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
                     <button 
                        onClick={handleReject}
                        className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                        <XCircleIcon className="w-5 h-5 mr-2 text-red-500" />
                        Reject
                    </button>
                    <button
                        onClick={handleApprove}
                        className="flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                        <CheckCircleIcon className="w-5 h-5 mr-2" />
                        Approve
                    </button>
                </div>
            </div>
        )}

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm mb-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{contract.title}</h1>
                    <div className="mt-2 flex items-center space-x-4">
                        <StatusTag type="contract" status={contract.status} />
                        <StatusTag type="risk" status={contract.riskLevel} />
                        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Viewing Version {viewedVersion.versionNumber}</span>
                    </div>
                </div>
                <ContractActions 
                    contract={contract} 
                    onRequestTransition={handleRequestTransition} 
                    onOpenApprovalModal={() => setIsRequestingApproval(true)} 
                    onStartCreateNewVersion={() => setIsCreatingVersion(true)}
                />
            </div>
             <dl className="mt-6 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                <DetailItem label="Counterparty" value={contract.counterparty.name} />
                <DetailItem label="Contract Value" value={formatCurrency(viewedVersion.value)} />
                <DetailItem label="Effective Date" value={viewedVersion.effectiveDate} />
                <DetailItem label="End Date" value={viewedVersion.endDate} />
                {viewedVersion.property && (
                    <DetailItem label="Property" value={
                        <span>
                            {viewedVersion.property.name}
                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatPropertyAddress(viewedVersion.property)}</p>
                        </span>
                    } />
                )}
                <DetailItem label="Owner" value={
                    <div className="flex items-center space-x-2">
                        <img className="h-6 w-6 rounded-full" src={contract.owner.avatarUrl} alt={`${contract.owner.firstName} ${contract.owner.lastName}`} />
                        <span className="dark:text-gray-200">{`${contract.owner.firstName} ${contract.owner.lastName}`}</span>
                    </div>
                } />
            </dl>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <AiAnalysis 
                    onSummary={handleSummarizeRisk}
                    onExtract={handleExtractClauses}
                    riskSummary={contract.riskSummary}
                    extractedClauses={contract.extractedClauses}
                    isLoadingSummary={isLoadingSummary}
                    isLoadingClauses={isLoadingClauses}
                />
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Contract Document (Version {viewedVersion.versionNumber})</h3>
                    <div className="prose prose-sm max-w-none p-4 bg-gray-50 dark:bg-gray-900/50 rounded-md border dark:border-gray-700 h-64 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-xs font-sans">{viewedVersion.content}</pre>
                    </div>
                </div>
            </div>
            <div className="space-y-6">
                <ApprovalWidget steps={contract.approvalSteps} />
                <VersionHistory 
                    versions={contract.versions} 
                    selectedVersionId={viewedVersionId}
                    onSelectVersion={handleSelectVersion}
                />
            </div>
        </div>
        {isCreatingVersion && (
            <CreateVersionModal
                contract={contract}
                properties={properties}
                onClose={() => setIsCreatingVersion(false)}
                onSave={handleSaveNewVersion}
            />
        )}
        {isRequestingApproval && (
            <RequestApprovalModal
                contract={contract}
                users={users}
                onClose={() => setIsRequestingApproval(false)}
                onSave={handleRequestApproval}
            />
        )}
        {confirmModalState.isOpen && confirmModalState.action && (
            <ConfirmStatusChangeModal
                isOpen={confirmModalState.isOpen}
                onClose={() => setConfirmModalState({ isOpen: false, action: null, payload: undefined })}
                onConfirm={() => {
                    if (confirmModalState.action) {
                        onTransition(contract.id, confirmModalState.action, confirmModalState.payload);
                    }
                    setConfirmModalState({ isOpen: false, action: null, payload: undefined });
                }}
                contractTitle={contract.title}
                currentStatus={contract.status}
                action={confirmModalState.action}
            />
        )}
    </div>
  );
}
