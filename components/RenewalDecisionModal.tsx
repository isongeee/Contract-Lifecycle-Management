
import React, { useState } from 'react';
import { RenewalMode } from '../types';
import { XIcon, RefreshCwIcon, FileTextIcon, EditIcon, XCircleIcon } from './icons';

interface RenewalDecisionModalProps {
    onClose: () => void;
    onConfirm: (mode: RenewalMode) => void;
}

const decisionOptions = [
    {
        mode: RenewalMode.RENEW_AS_IS,
        title: 'Renew As-Is',
        description: 'Renew the contract with the same terms, applying any standard uplift. This is a fast-track option.',
        icon: <RefreshCwIcon className="h-6 w-6 text-green-600" />,
        color: 'green'
    },
    {
        mode: RenewalMode.NEW_CONTRACT,
        title: 'Renegotiate Terms (New Contract)',
        description: 'Start a new negotiation. The existing contract will be superseded by a new, active agreement upon completion.',
        icon: <FileTextIcon className="h-6 w-6 text-blue-600" />,
        color: 'blue'
    },
    {
        mode: RenewalMode.AMENDMENT,
        title: 'Amend Existing Contract',
        description: 'Create a formal amendment to modify or extend the terms of the current contract without replacing it.',
        icon: <EditIcon className="h-6 w-6 text-indigo-600" />,
        color: 'indigo'
    },
    {
        mode: RenewalMode.TERMINATE,
        title: 'Terminate Contract',
        description: 'Do not renew the contract. This will begin the offboarding and contract closure process.',
        icon: <XCircleIcon className="h-6 w-6 text-red-600" />,
        color: 'red'
    }
];

export default function RenewalDecisionModal({ onClose, onConfirm }: RenewalDecisionModalProps) {
    const [selectedMode, setSelectedMode] = useState<RenewalMode | null>(null);

    const handleConfirm = () => {
        if (selectedMode) {
            onConfirm(selectedMode);
        }
    };

    return (
        <div className="relative z-20" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                    <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                        <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                            <button type="button" onClick={onClose} className="rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                                <XIcon className="h-6 w-6" aria-hidden="true" />
                            </button>
                        </div>
                        <div className="bg-white dark:bg-gray-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                            <h3 className="text-xl font-semibold leading-6 text-gray-900 dark:text-gray-100" id="modal-title">
                                Renewal Decision
                            </h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Choose the strategic path for this contract renewal. Your selection will determine the next steps in the workflow.
                            </p>
                            <fieldset className="mt-6">
                                <legend className="sr-only">Renewal decision options</legend>
                                <div className="space-y-4">
                                    {decisionOptions.map((option) => (
                                        <label
                                            key={option.mode}
                                            className={`relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none transition-all ${
                                                selectedMode === option.mode ? `border-primary-500 ring-2 ring-primary-500` : 'border-gray-300 dark:border-gray-600'
                                            } hover:border-primary-400`}
                                        >
                                            <input
                                                type="radio"
                                                name="renewal-mode"
                                                value={option.mode}
                                                className="sr-only"
                                                checked={selectedMode === option.mode}
                                                onChange={(e) => setSelectedMode(e.target.value as RenewalMode)}
                                                aria-labelledby={`${option.mode}-title`}
                                                aria-describedby={`${option.mode}-description`}
                                            />
                                            <div className="flex items-center">
                                                <div className={`flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-${option.color}-100 dark:bg-${option.color}-900/20 mr-4`}>
                                                   {option.icon}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span id={`${option.mode}-title`} className="block text-md font-semibold text-gray-900 dark:text-gray-100">
                                                        {option.title}
                                                    </span>
                                                    <span id={`${option.mode}-description`} className="block text-sm text-gray-500 dark:text-gray-400">
                                                        {option.description}
                                                    </span>
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={!selectedMode}
                                className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-900 shadow-sm hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirm Decision
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 sm:mt-0 sm:w-auto"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
