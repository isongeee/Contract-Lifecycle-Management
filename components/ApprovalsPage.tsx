import React, { useState, useMemo } from 'react';
import type { Contract, UserProfile } from '../types';
import { ContractStatus, ApprovalStatus } from '../types';
import ApprovalRequestCard from './ApprovalRequestCard';
import { CheckCircleIcon } from './icons';

interface ApprovalsPageProps {
  contracts: Contract[];
  setContracts: React.Dispatch<React.SetStateAction<Contract[]>>;
  currentUser: UserProfile;
}

// FIX: Made children prop optional to satisfy type checker for what appears to be correct usage.
const Section = ({ title, children, count }: { title: string; children?: React.ReactNode; count: number}) => (
    <div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">{title}</h2>
        <p className="text-sm text-gray-500 mb-4">You have {count} request{count === 1 ? '' : 's'} in this category.</p>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

export default function ApprovalsPage({ contracts, setContracts, currentUser }: ApprovalsPageProps) {

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

    const handleApprovalAction = (contractId: string, stepId: string, newStatus: ApprovalStatus.APPROVED | ApprovalStatus.REJECTED) => {
        setContracts(prevContracts => {
            const newContracts = [...prevContracts];
            const contractIndex = newContracts.findIndex(c => c.id === contractId);
            if (contractIndex === -1) return prevContracts;

            const contractToUpdate = { ...newContracts[contractIndex] };
            const stepIndex = contractToUpdate.approvalSteps.findIndex(s => s.id === stepId);
            if (stepIndex === -1) return prevContracts;
            
            // Update the step status
            contractToUpdate.approvalSteps = [...contractToUpdate.approvalSteps];
            contractToUpdate.approvalSteps[stepIndex] = {
                ...contractToUpdate.approvalSteps[stepIndex],
                status: newStatus,
                approvedAt: new Date().toISOString().split('T')[0] // Set current date
            };

            // Check if all approvals are now complete
            const allApproved = contractToUpdate.approvalSteps.every(s => s.status === ApprovalStatus.APPROVED);
            if (allApproved) {
                contractToUpdate.status = ContractStatus.APPROVED;
            }

            newContracts[contractIndex] = contractToUpdate;
            return newContracts;
        });
    };
    
    const handleApprove = (contractId: string, stepId: string) => {
        handleApprovalAction(contractId, stepId, ApprovalStatus.APPROVED);
    };

    const handleReject = (contractId: string, stepId: string) => {
        handleApprovalAction(contractId, stepId, ApprovalStatus.REJECTED);
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Approval Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">Review and action pending contract requests.</p>
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
                    <div className="text-center py-10 bg-white rounded-lg border border-dashed">
                        <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
                        <h3 className="mt-2 text-md font-medium text-gray-900">All caught up!</h3>
                        <p className="mt-1 text-sm text-gray-500">You have no pending approvals.</p>
                    </div>
                )}
            </Section>

            <Section title="All Pending Requests" count={allPending.length}>
                 {allPending.length > 0 ? (
                    allPending.map(contract => (
                       <div key={`${contract.id}-all`} className="bg-white p-4 rounded-lg shadow-sm border flex justify-between items-center">
                           <div>
                               <p className="font-semibold text-gray-800">{contract.title}</p>
                               <p className="text-sm text-gray-500">
                                   Waiting on: {contract.approvalSteps.filter(s => s.status === ApprovalStatus.PENDING).map(s => `${s.approver.firstName} ${s.approver.lastName}`).join(', ')}
                               </p>
                           </div>
                           <span className="text-xs font-semibold px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                               Pending
                           </span>
                       </div>
                    ))
                ) : (
                    <div className="text-center py-10 bg-white rounded-lg border border-dashed">
                         <h3 className="mt-2 text-md font-medium text-gray-900">No Pending Approvals</h3>
                        <p className="mt-1 text-sm text-gray-500">There are no contracts pending approval across the organization.</p>
                    </div>
                )}
            </Section>

        </div>
    );
}