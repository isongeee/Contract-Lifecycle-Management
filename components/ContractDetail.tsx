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

const VersionHistory = ({ versions }: { versions: Contract['versions'] }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Version History</h3>
        <ul className="space-y-4">
            {versions.slice().reverse().map(v => (
                <li key={v.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                        <img className="h-8 w-8 rounded-full" src={v.author.avatarUrl} alt={`${v.author.firstName} ${v.author.lastName}`} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-800">Version {v.versionNumber}</p>
                        <p className="text-sm text-gray-500">by {`${v.author.firstName} ${v.author.lastName}`} on {v.createdAt}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Value: <span className="font-semibold">{formatCurrency(v.value)}</span> | End Date: <span className="font-semibold">{v.endDate}</span>
                        </p>
                         {v.fileName && (
                            <div className="mt-1 flex items-center text-xs text-blue-600">
                                <FileTextIcon className="w-3 h-3 mr-1" /> {v.fileName}
                            </div>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    </div>
);

const AiAnalysis = ({ contract, setContract }: { contract: Contract, setContract: React.Dispatch<React.SetStateAction<Contract>> }) => {
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);
    const [isLoadingClauses, setIsLoadingClauses] = useState(false);

    const handleSummarize = useCallback(async () => {
        setIsLoadingSummary(true);
        const summary = await summarizeContractRisk(contract.versions[contract.versions.length - 1].content);
        setContract(c => ({...c, riskSummary: summary }));
        setIsLoadingSummary(false);
    }, [contract, setContract]);

    const handleExtract = useCallback(async () => {
        setIsLoadingClauses(true);
        const clauses = await extractClauses(contract.versions[contract.versions.length - 1].content);
        setContract(c => ({...c, extractedClauses: clauses}));
        setIsLoadingClauses(false);
    }, [contract, setContract]);
    
    return (
        <div className="bg-primary-50 border border-primary-200 p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary-900 flex items-center">
                    <SparklesIcon className="w-5 h-5 mr-2" />
                    Gemini AI Analysis
                </h3>
                <div className="flex space-x-2">
                    <button onClick={handleSummarize} disabled={isLoadingSummary} className="px-3 py-1.5 text-xs font-semibold text-primary-800 bg-white border border-primary-300 rounded-md hover:bg-primary-100 disabled:opacity-50 disabled:cursor-wait flex items-center">
                        {isLoadingSummary ? <LoaderIcon className="w-4 h-4 mr-1.5" /> : null}
                        Summarize Risk
                    </button>
                    <button onClick={handleExtract} disabled={isLoadingClauses} className="px-3 py-1.5 text-xs font-semibold text-primary-800 bg-white border border-primary-300 rounded-md hover:bg-primary-100 disabled:opacity-50 disabled:cursor-wait flex items-center">
                         {isLoadingClauses ? <LoaderIcon className="w-4 h-4 mr-1.5" /> : null}
                        Extract Clauses
                    </button>
                </div>
            </div>
            
            {contract.riskSummary && (
                <div className="mt-4">
                    <h4 className="font-semibold text-gray-800">Risk Summary:</h4>
                    <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap bg-white/50 p-3 rounded-md">{contract.riskSummary}</div>
                </div>
            )}

            {contract.extractedClauses && contract.extractedClauses.length > 0 && (
                <div className="mt-4">
                    <h4 className="font-semibold text-gray-800">Extracted Clauses:</h4>
                    <div className="mt-2 space-y-3">
                        {contract.extractedClauses.map(clause => (
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
  
  const latestVersion = contract.versions[contract.versions.length - 1];

  useEffect(() => {
    setContract(initialContract);
  }, [initialContract]);

  const handleStatusUpdate = (newStatus: ContractStatus) => {
    onUpdateStatus(contract.id, newStatus);
    setIsUpdatingStatus(false);
  };
  
  const handleSaveNewVersion = (newVersionData: Omit<ContractVersion, 'id' | 'versionNumber' | 'createdAt' | 'author'>) => {
    onCreateNewVersion(contract.id, newVersionData);
    setIsCreatingVersion(false);
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
                        <span className="text-sm font-semibold text-gray-500">Version {latestVersion.versionNumber}</span>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <button onClick={() => setIsCreatingVersion(true)} className="flex items-center px-4 py-2 text-sm font-semibold text-primary-700 bg-primary-100 rounded-lg hover:bg-primary-200">
                        <CopyIcon className="w-4 h-4 mr-2" />
                        Create New Version
                    </button>
                    <button onClick={() => setIsUpdatingStatus(true)} className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-600">
                        Update Status
                    </button>
                </div>
            </div>
             <dl className="mt-6 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                <DetailItem label="Counterparty" value={contract.counterparty.name} />
                <DetailItem label="Contract Value" value={formatCurrency(contract.value)} />
                <DetailItem label="Start Date" value={contract.startDate} />
                <DetailItem label="End Date" value={contract.endDate} />
                {contract.property && (
                    <DetailItem label="Property" value={
                        <span>
                            {contract.property.name}
                            <p className="text-xs text-gray-500">{formatPropertyAddress(contract.property)}</p>
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
                <AiAnalysis contract={contract} setContract={setContract} />
                 <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Document</h3>
                    <div className="prose prose-sm max-w-none p-4 bg-gray-50 rounded-md border h-64 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-xs">{latestVersion.content}</pre>
                    </div>
                </div>
            </div>
            <div className="space-y-6">
                <ApprovalWidget steps={contract.approvalSteps} />
                <VersionHistory versions={contract.versions} />
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