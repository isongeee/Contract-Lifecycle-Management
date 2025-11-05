import React from 'react';
import type { ContractStatus as ContractStatusType } from '../types';
import { ContractStatus } from '../types';
import { XIcon, AlertTriangleIcon } from './icons';

type ContractAction = ContractStatusType | 'APPROVE_STEP' | 'REJECT_STEP';

interface ConfirmStatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  contractTitle: string;
  currentStatus: ContractStatusType;
  action: ContractAction;
}

const getActionInfo = (action: ContractAction, currentStatus: ContractStatusType, contractTitle: string) => {
    switch (action) {
        case 'APPROVE_STEP':
            return {
                title: 'Confirm Approval',
                message: `Are you sure you want to approve the contract "${contractTitle}"?`,
                details: "This will record your approval. If all approvals are met, the contract will be marked as 'Approved'.",
                confirmText: 'Yes, Approve',
                iconColor: 'text-green-500',
                buttonColor: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
                iconBgColor: 'bg-green-100 dark:bg-green-900/20',
            };
        case 'REJECT_STEP':
            return {
                title: 'Confirm Rejection',
                message: `Are you sure you want to reject this contract?`,
                details: `This will send the contract "${contractTitle}" back to the '${ContractStatus.IN_REVIEW}' status for revision.`,
                confirmText: 'Yes, Reject',
                iconColor: 'text-red-500',
                buttonColor: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
                iconBgColor: 'bg-red-100 dark:bg-red-900/20',
            };
        default:
             return {
                title: 'Confirm Status Change',
                message: `Are you sure you want to change the status for "${contractTitle}"?`,
                details: `The status will be updated from '${currentStatus}' to '${action}'.`,
                confirmText: 'Yes, Confirm Change',
                iconColor: 'text-yellow-500',
                buttonColor: 'bg-primary hover:bg-primary-600 focus:ring-primary-500 text-primary-900',
                iconBgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
            };
    }
};


export default function ConfirmStatusChangeModal({ isOpen, onClose, onConfirm, contractTitle, currentStatus, action }: ConfirmStatusChangeModalProps) {
  if (!isOpen || !action) return null;

  const { title, message, details, confirmText, iconColor, buttonColor, iconBgColor } = getActionInfo(action, currentStatus, contractTitle);

  return (
    <div className="relative z-30" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                     <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                        <button type="button" onClick={onClose} className="rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                            <span className="sr-only">Close</span>
                            <XIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                    </div>
                    <div className="bg-white dark:bg-gray-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                             <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${iconBgColor} sm:mx-0 sm:h-10 sm:w-10`}>
                                <AlertTriangleIcon className={`h-6 w-6 ${iconColor}`} aria-hidden="true" />
                            </div>
                            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                <h3 className="text-lg font-semibold leading-6 text-gray-900 dark:text-gray-100" id="modal-title">
                                    {title}
                                </h3>
                                <div className="mt-2">
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {message}
                                  </p>
                                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-medium">
                                      {details}
                                  </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                        <button type="button" onClick={onConfirm} className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold shadow-sm sm:ml-3 sm:w-auto ${buttonColor}`}>
                            {confirmText}
                        </button>
                        <button type="button" onClick={onClose} className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 sm:mt-0 sm:w-auto">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}
