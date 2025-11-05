import React, { useState, useMemo } from 'react';
import type { Contract, UserProfile, ContractStatus as ContractStatusType } from '../types';
import { ContractStatus, ApprovalStatus } from '../types';
import ApprovalRequestCard from './ApprovalRequestCard';
import { CheckCircleIcon } from './icons';

type ContractAction = ContractStatusType | 'APPROVE_STEP' | 'REJECT_STEP';

interface ApprovalsPageProps {
  contracts: Contract[];
  onTransition: (contractId: string, action: ContractAction, payload?: any) => void;
  currentUser: UserProfile;
}

const Section = ({ title, children, count }: { title: string; children?: React.ReactNode; count: number}) => (
    <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">{title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">You have {count} request{count === 1 ? '' : 's'} in this category.</p>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

export default function ApprovalsPage({ contracts, onTransition, currentUser }: ApprovalsPageProps) {

    const { myPending, allPending } = useMemo(() => {
        const myPending: Contract[] = [];
        const allPending: Contract[] = [];

        contracts.forEach(contract => {
            if (contract.status === ContractStatus.PENDING_APPROVAL) {
                allPending.push(contract);
                const hasPendingStepForMe = contract.approvalSteps.some(
                    step => step.approver.id === currentUser.id && step.status === ApprovalStatus.PENDING
                );
                if (hasPendingStepForMe) {
                    myPending.push(contract);
                }
            }
        });
        return { myPending, allPending };
    }, [contracts, currentUser.id]);

    const handleApprove = (contractId: string, stepId: string) => {
        onTransition(contractId, 'APPROVE_STEP', { stepId });
    };

    const handleReject = (contractId: string, stepId: string) => {
         if (window.confirm("Are you sure you want to reject this approval? This will send the contract back to the 'In Review' stage.")) {
            onTransition(contractId, 'REJECT_STEP', { stepId });
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Approval Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Review and action pending contract requests.</p>
            </div>

            <Section title="Pending My Approval" count={myPending.length}>
                {myPending.length > 0 ? (
                    myPending.map(contract => (
                        <ApprovalRequestCard 
                            key={`${contract.id}-my`}
                            contract={contract} 
                            onApprove={handleApprove}
                            onReject={handleReject}
                            currentUserApproverId={currentUser.id}
                        />
                    ))
                ) : (
                    <div className="text-center py-10 bg-white dark:bg-gray-800/50 rounded-lg border border-dashed dark:border-gray-700">
                        <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
                        <h3 className="mt-2 text-md font-medium text-gray-900 dark:text-gray-100">All caught up!</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">You have no pending approvals.</p>
                    </div>
                )}
            </Section>

            <Section title="All Pending Requests" count={allPending.length}>
                 {allPending.length > 0 ? (
                    allPending.map(contract => (
                       <div key={`${contract.id}-all`} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border dark:border-gray-700 flex justify-between items-center">
                           <div>
                               <p className="font-semibold text-gray-800 dark:text-gray-100">{contract.title}</p>
                               <p className="text-sm text-gray-500 dark:text-gray-400">
                                   Waiting on: {contract.approvalSteps.filter(s => s.status === ApprovalStatus.PENDING).map(s => `${s.approver.firstName} ${s.approver.lastName}`).join(', ')}
                               </p>
                           </div>
                           <span className="text-xs font-semibold px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 rounded-full">
                               Pending
                           </span>
                       </div>
                    ))
                ) : (
                    <div className="text-center py-10 bg-white dark:bg-gray-800/50 rounded-lg border border-dashed dark:border-gray-700">
                         <h3 className="mt-2 text-md font-medium text-gray-900 dark:text-gray-100">No Pending Approvals</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">There are no contracts pending approval across the organization.</p>
                    </div>
                )}
            </Section>

        </div>
    );
}