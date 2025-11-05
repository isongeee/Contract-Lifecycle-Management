import React, { useState } from 'react';
import type { Contract, ContractVersion, UserProfile } from '../types';
import { XIcon } from './icons';

interface RequestApprovalModalProps {
  contract: Contract;
  users: UserProfile[];
  onClose: () => void;
  onSave: (approvers: UserProfile[], versionId: string) => void;
}

export default function RequestApprovalModal({ contract, users, onClose, onSave }: RequestApprovalModalProps) {
    const [selectedVersionId, setSelectedVersionId] = useState<string>(contract.versions[contract.versions.length - 1]?.id || '');
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    const handleToggleUser = (userId: string) => {
        setSelectedUserIds(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleSave = () => {
        const selectedApprovers = users.filter(u => selectedUserIds.includes(u.id));
        if (selectedApprovers.length > 0 && selectedVersionId) {
            onSave(selectedApprovers, selectedVersionId);
        } else {
            alert('Please select a final version and at least one approver.');
        }
    };
    
    // Admins and owners can't be selected as approvers for now to avoid self-approval loops.
    const availableApprovers = users.filter(u => u.role !== 'Admin' && u.id !== contract.owner.id);

    return (
        <div className="relative z-20" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                    <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-xl">
                        <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                            <button type="button" onClick={onClose} className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                                <XIcon className="h-6 w-6" aria-hidden="true" />
                            </button>
                        </div>
                        <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                           <h3 className="text-lg font-semibold leading-6 text-gray-900" id="modal-title">
                                Request Approval
                            </h3>
                            <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Select Final Version</label>
                                    <select value={selectedVersionId} onChange={e => setSelectedVersionId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary focus:border-primary">
                                        {contract.versions.slice().reverse().map(v => (
                                            <option key={v.id} value={v.id}>Version {v.versionNumber} ({v.createdAt} by {v.author.firstName})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Choose Approvers</label>
                                    <div className="mt-2 space-y-2 border border-gray-200 rounded-md p-2 max-h-60 overflow-y-auto">
                                        {availableApprovers.map(user => (
                                            <label key={user.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                                                <input type="checkbox" checked={selectedUserIds.includes(user.id)} onChange={() => handleToggleUser(user.id)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                                                <div className="flex items-center space-x-2">
                                                    <img src={user.avatarUrl} className="h-8 w-8 rounded-full" />
                                                    <div>
                                                        <p className="font-medium text-sm">{user.firstName} {user.lastName}</p>
                                                        <p className="text-xs text-gray-500">{user.role}</p>
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                            <button type="button" onClick={handleSave} className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-900 shadow-sm hover:bg-primary-600 sm:ml-3 sm:w-auto">
                                Submit for Approval
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