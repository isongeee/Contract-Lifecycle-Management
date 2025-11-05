
import React from 'react';
import type { Contract } from '../types';
import { CheckCircleIcon, XCircleIcon } from './icons';

interface ApprovalRequestCardProps {
    contract: Contract;
    onApprove: (contractId: string, stepId: string) => void;
    onReject: (contractId: string, stepId: string) => void;
    // We assume we know who the current user is to find the relevant step
    currentUserApproverId: string;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);


// FIX: Changed component to React.FC to correctly handle props including the 'key' prop.
const ApprovalRequestCard: React.FC<ApprovalRequestCardProps> = ({ contract, onApprove, onReject, currentUserApproverId }) => {
    const relevantStep = contract.approvalSteps.find(step => step.approver.id === currentUserApproverId);
    if (!relevantStep) return null; // Should not happen if filtered correctly

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-5">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs text-primary-700 dark:text-primary-300 font-semibold uppercase">{contract.type}</p>
                        <h4 className="font-bold text-gray-800 dark:text-gray-100 text-lg">{contract.title}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">vs. {contract.counterparty.name}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-lg text-gray-800 dark:text-gray-100">{formatCurrency(contract.value)}</p>
                         <p className="text-sm text-gray-500 dark:text-gray-400">Value</p>
                    </div>
                </div>
                <div className="mt-4 flex items-center space-x-3">
                    <img className="h-8 w-8 rounded-full" src={contract.owner.avatarUrl} alt={`${contract.owner.firstName} ${contract.owner.lastName}`} />
                    <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{`${contract.owner.firstName} ${contract.owner.lastName}`}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Requested on {contract.versions[contract.versions.length - 1].createdAt}</p>
                    </div>
                </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 px-5 py-3 flex justify-end items-center space-x-3">
                 <button 
                    onClick={() => onReject(contract.id, relevantStep.id)}
                    className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                    <XCircleIcon className="w-5 h-5 mr-2 text-red-500" />
                    Reject
                </button>
                <button
                    onClick={() => onApprove(contract.id, relevantStep.id)}
                    className="flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                    <CheckCircleIcon className="w-5 h-5 mr-2" />
                    Approve
                </button>
            </div>
        </div>
    )
}

export default ApprovalRequestCard;