
import React, { useState, useCallback } from 'react';
import type { Contract, Clause } from '../types';
import { ApprovalStatus } from '../types';
import StatusTag from './StatusTag';
import { ArrowLeftIcon, SparklesIcon, LoaderIcon } from './icons';
import { APPROVAL_STATUS_COLORS } from '../constants';
import { summarizeContractRisk, extractClauses } from '../services/geminiService';

interface ContractDetailProps {
  contract: Contract;
  onBack: () => void;
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
                             <h4 className="flex items-center mb-1 text-md font-semibold text-gray-900">{step.approver.name}
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

const VersionHistory = ({ versions }: { versions: Contract['versions'] }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Version History</h3>
        <ul className="space-y-4">
            {versions.map(v => (
                <li key={v.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                        <img className="h-8 w-8 rounded-full" src={v.author.avatarUrl} alt={v.author.name} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-800">Version {v.versionNumber}</p>
                        <p className="text-sm text-gray-500">Updated by {v.author.name} on {v.createdAt}</p>
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

export default function ContractDetail({ contract: initialContract, onBack }: ContractDetailProps) {
  const [contract, setContract] = useState(initialContract);
  
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
                    </div>
                </div>
                 <button className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-600">
                    Update Status
                </button>
            </div>
             <dl className="mt-6 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                <DetailItem label="Counterparty" value={contract.counterparty.name} />
                <DetailItem label="Contract Value" value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(contract.value)} />
                <DetailItem label="Start Date" value={contract.startDate} />
                <DetailItem label="End Date" value={contract.endDate} />
                <DetailItem label="Owner" value={
                    <div className="flex items-center space-x-2">
                        <img className="h-6 w-6 rounded-full" src={contract.owner.avatarUrl} alt={contract.owner.name} />
                        <span>{contract.owner.name}</span>
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
                        <pre className="whitespace-pre-wrap text-xs">{contract.versions[contract.versions.length - 1].content}</pre>
                    </div>
                </div>
            </div>
            <div className="space-y-6">
                <ApprovalWidget steps={contract.approvalSteps} />
                <VersionHistory versions={contract.versions} />
            </div>
        </div>
    </div>
  );
}
