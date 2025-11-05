import React, { useState, useCallback, useEffect } from 'react';
import type { Contract, Clause, Property, ContractStatus, ContractVersion } from '../types';
import { ApprovalStatus } from '../types';
import StatusTag from './StatusTag';
import { ArrowLeftIcon, SparklesIcon, LoaderIcon, CopyIcon, FileTextIcon } from './icons';
import { APPROVAL_STATUS_COLORS } from '../constants';
import { summarizeContractRisk, extractClauses } from '../services/geminiService';
import UpdateStatusModal from './UpdateStatusModal';
import CreateVersionModal from './CreateVersionModal';

interface ContractDetailProps {
  contract: Contract;
  properties: Property[];
  onBack: () => void;
  onUpdateStatus: (contractId: string, newStatus: ContractStatus) => void;
  onCreateNewVersion: (contractId: string, newVersionData: Omit<ContractVersion, 'id' | 'versionNumber' | 'createdAt' | 'author'>) => void;
}

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
);

const ApprovalWidget = ({ steps }: { steps: Contract['approvalSteps']}) => (
    <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Approval Workflow</h3>
        {steps.length > 0 ? (
            <ol className="relative border-l border-gray-200">
                {steps.map((step, index) => (
                    <li key={step.id} className="mb-6 ml-6">
                        <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ring-8 ring-white ${APPROVAL_STATUS_COLORS[step.status]} text-xs`}>
                           {index + 1}
                        </span>
                        <div className="ml-2">
                             <h4 className="flex items-center mb-1 text-md font-semibold text-gray-900">{`${step.approver.firstName} ${step.approver.lastName}`}
                                <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${APPROVAL_STATUS_COLORS[step.status]}`}>
                                    {step.status}
                                </span>
                            </h4>
                            <time className="block mb-2 text-sm font-normal leading-none text-gray-400">
                                {step.status === ApprovalStatus.APPROVED ? `Approved on ${step.approvedAt}` : `Awaiting response`}
                            </time>
                            <p className="text-sm text-gray-600">{step.approver.role}</p>
                        </div>
                    </li>
                ))}
            </ol>
        ) : (
            <p className="text-sm text-gray-500">No approval steps required for this contract.</p>
        )}
    </div>
);

const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const VersionHistory = ({ versions, selectedVersionId, onSelectVersion }: { versions: Contract['versions']; selectedVersionId: string; onSelectVersion: (id: string) => void; }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Version History</h3>
        <p className="text-sm text-gray-500 mb-4">Select a version to view its details and content.</p>
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
                            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 italic">
                                {v.content.trim().substring(0, 75)}...
                            </p>
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
        <div className="bg-primary-50 border border-primary-200 p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary-900 flex items-center">
                    <SparklesIcon className="w-5 h-5 mr-2" />
                    Gemini AI Analysis
                </h3>
                <div className="flex space-x-2">
                    <button onClick={onSummary} disabled={isLoadingSummary} className="px-3 py-1.5 text-xs font-semibold text-primary-800 bg-white border border-primary-300 rounded-md hover:bg-primary-100 disabled:opacity-50 disabled:cursor-wait flex items-center">
                        {isLoadingSummary ? <LoaderIcon className="w-4 h-4 mr-1.5" /> : null}
                        Summarize Risk
                    </button>
                    <button onClick={onExtract} disabled={isLoadingClauses} className="px-3 py-1.5 text-xs font-semibold text-primary-800 bg-white border border-primary-300 rounded-md hover:bg-primary-100 disabled:opacity-50 disabled:cursor-wait flex items-center">
                         {isLoadingClauses ? <LoaderIcon className="w-4 h-4 mr-1.5" /> : null}
                        Extract Clauses
                    </button>
                </div>
            </div>
            
            {riskSummary && (
                <div className="mt-4">
                    <h4 className="font-semibold text-gray-800">Risk Summary:</h4>
                    <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap bg-white/50 p-3 rounded-md">{riskSummary}</div>
                </div>
            )}

            {extractedClauses && extractedClauses.length > 0 && (
                <div className="mt-4">
                    <h4 className="font-semibold text-gray-800">Extracted Clauses:</h4>
                    <div className="mt-2 space-y-3">
                        {extractedClauses.map(clause => (
                            <div key={clause.id} className="p-3 bg-white/50 rounded-md border border-primary-100">
                                <p className="font-semibold text-sm text-gray-900">{clause.title}</p>
                                <p className="text-sm text-gray-600 mt-1 italic">"{clause.summary}"</p>
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

export default function ContractDetail({ contract: initialContract, properties, onBack, onUpdateStatus, onCreateNewVersion }: ContractDetailProps) {
  const [contract, setContract] = useState(initialContract);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [viewedVersionId, setViewedVersionId] = useState(initialContract.versions[initialContract.versions.length - 1].id);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isLoadingClauses, setIsLoadingClauses] = useState(false);
  
  const latestVersion = contract.versions[contract.versions.length - 1];
  const viewedVersion = contract.versions.find(v => v.id === viewedVersionId) || latestVersion;

  useEffect(() => {
    setContract(initialContract);
    const newLatestVersion = initialContract.versions[initialContract.versions.length - 1];
    if (newLatestVersion) {
        setViewedVersionId(newLatestVersion.id);
    }
  }, [initialContract]);

  const handleSummarizeRisk = useCallback(async () => {
    setIsLoadingSummary(true);
    const summary = await summarizeContractRisk(viewedVersion.content);
    setContract(c => ({...c, riskSummary: summary, extractedClauses: undefined })); // Clear clauses when re-summarizing
    setIsLoadingSummary(false);
  }, [viewedVersion.content]);

  const handleExtractClauses = useCallback(async () => {
    setIsLoadingClauses(true);
    const clauses = await extractClauses(viewedVersion.content);
    setContract(c => ({...c, extractedClauses: clauses, riskSummary: undefined })); // Clear summary when extracting
    setIsLoadingClauses(false);
  }, [viewedVersion.content]);

  const handleStatusUpdate = (newStatus: ContractStatus) => {
    onUpdateStatus(contract.id, newStatus);
    setIsUpdatingStatus(false);
  };
  
  const handleSaveNewVersion = (newVersionData: Omit<ContractVersion, 'id' | 'versionNumber' | 'createdAt' | 'author'>) => {
    onCreateNewVersion(contract.id, newVersionData);
    setIsCreatingVersion(false);
  };

  const handleSelectVersion = (id: string) => {
    setViewedVersionId(id);
    // Clear old analysis when switching versions
    setContract(c => ({ ...c, riskSummary: undefined, extractedClauses: undefined }));
  };

  return (
    <div>
        <button onClick={onBack} className="flex items-center text-sm font-semibold text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to all contracts
        </button>

        <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{contract.title}</h1>
                    <div className="mt-2 flex items-center space-x-4">
                        <StatusTag type="contract" status={contract.status} />
                        <StatusTag type="risk" status={contract.riskLevel} />
                        <span className="text-sm font-semibold text-gray-500">Viewing Version {viewedVersion.versionNumber}</span>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <button onClick={() => setIsCreatingVersion(true)} className="flex items-center px-4 py-2 text-sm font-semibold text-primary-700 bg-primary-100 rounded-lg hover:bg-primary-200">
                        <CopyIcon className="w-4 h-4 mr-2" />
                        Create New Version
                    </button>
                    <button onClick={() => setIsUpdatingStatus(true)} className="px-4 py-2 text-sm font-semibold text-primary-900 bg-primary rounded-lg hover:bg-primary-600">
                        Update Status
                    </button>
                </div>
            </div>
             <dl className="mt-6 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                <DetailItem label="Counterparty" value={contract.counterparty.name} />
                <DetailItem label="Contract Value" value={formatCurrency(viewedVersion.value)} />
                <DetailItem label="Start Date" value={viewedVersion.startDate} />
                <DetailItem label="End Date" value={viewedVersion.endDate} />
                {viewedVersion.property && (
                    <DetailItem label="Property" value={
                        <span>
                            {viewedVersion.property.name}
                            <p className="text-xs text-gray-500">{formatPropertyAddress(viewedVersion.property)}</p>
                        </span>
                    } />
                )}
                <DetailItem label="Owner" value={
                    <div className="flex items-center space-x-2">
                        <img className="h-6 w-6 rounded-full" src={contract.owner.avatarUrl} alt={`${contract.owner.firstName} ${contract.owner.lastName}`} />
                        <span>{`${contract.owner.firstName} ${contract.owner.lastName}`}</span>
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
                 <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Document (Version {viewedVersion.versionNumber})</h3>
                    <div className="prose prose-sm max-w-none p-4 bg-gray-50 rounded-md border h-64 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-xs">{viewedVersion.content}</pre>
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
        {isUpdatingStatus && (
            <UpdateStatusModal 
                contract={contract}
                onClose={() => setIsUpdatingStatus(false)}
                onUpdate={handleStatusUpdate}
            />
        )}
        {isCreatingVersion && (
            <CreateVersionModal
                contract={contract}
                properties={properties}
                onClose={() => setIsCreatingVersion(false)}
                onSave={handleSaveNewVersion}
            />
        )}
    </div>
  );
}