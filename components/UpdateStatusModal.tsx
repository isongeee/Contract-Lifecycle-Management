
import React, { useState } from 'react';
import type { Contract } from '../types';
import { ContractStatus } from '../types';
import { XIcon } from './icons';

interface UpdateStatusModalProps {
  contract: Contract;
  onClose: () => void;
  onUpdate: (newStatus: ContractStatus) => void;
}

export default function UpdateStatusModal({ contract, onClose, onUpdate }: UpdateStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<ContractStatus>(contract.status);

  const handleUpdate = () => {
    onUpdate(selectedStatus);
  };

  return (
    <div className="relative z-20" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md">
                     <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                        <button type="button" onClick={onClose} className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                            <span className="sr-only">Close</span>
                            <XIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                    </div>
                    <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start w-full">
                            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                                <h3 className="text-lg font-semibold leading-6 text-gray-900" id="modal-title">
                                    Update Contract Status
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Select the new status for "{contract.title}".
                                </p>
                                <div className="mt-4">
                                    <label htmlFor="status-select" className="block text-sm font-medium text-gray-700">
                                        New Status
                                    </label>
                                    <select
                                        id="status-select"
                                        name="status"
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                                        value={selectedStatus}
                                        onChange={(e) => setSelectedStatus(e.target.value as ContractStatus)}
                                    >
                                        {Object.values(ContractStatus).map(status => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                        <button type="button" onClick={handleUpdate} className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 sm:ml-3 sm:w-auto">
                            Update Status
                        </button>
                        <button type="button" onClick={onClose} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}
