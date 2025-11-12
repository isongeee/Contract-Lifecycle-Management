import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { ArrowLeftIcon, ClockIcon, EditIcon, FileTextIcon, RefreshCwIcon, UserIcon } from './icons';
import StatusTag from './StatusTag';
import type { RenewalFeedback, UserProfile } from '../types';

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
);

const Card = ({ title, icon, children, actions }: { title: string; icon: React.ReactNode; children?: React.ReactNode; actions?: React.ReactNode }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center">{icon}{title}</h3>
            {actions && <div>{actions}</div>}
        </div>
        <div className="p-6">{children}</div>
    </div>
);


const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export default function RenewalWorkspace() {
    const { 
        selectedContract, 
        contracts, 
        handleNavigate, 
        handleSelectContract,
        onUpdateRenewalTerms,
        onCreateRenewalFeedback,
        currentUser,
        users,
    } = useAppContext();

    const childContract = useMemo(() => {
        if (!selectedContract) return null;
        return contracts.find(c => c.parentContractId === selectedContract.id);
    }, [contracts, selectedContract]);
    
    const [newFeedback, setNewFeedback] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    
    const renewalRequest = selectedContract?.renewalRequest;

    const [terms, setTerms] = useState({
        renewalTermMonths: renewalRequest?.renewalTermMonths ?? selectedContract?.renewalTermMonths ?? 12,
        noticePeriodDays: renewalRequest?.noticePeriodDays ?? selectedContract?.noticePeriodDays ?? 30,
        upliftPercent: renewalRequest?.upliftPercent ?? selectedContract?.upliftPercent ?? 0,
    });

    if (!selectedContract || !renewalRequest || !currentUser) {
        return (
            <div>
                <button onClick={() => handleNavigate('renewals')} className="flex items-center text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 mb-4">
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    Back to Renewals Hub
                </button>
                <div className="text-center py-10">
                    <h2 className="text-xl font-bold">No Renewal Selected</h2>
                    <p className="text-gray-500 mt-2">Please select an in-progress renewal to view its workspace.</p>
                </div>
            </div>
        )
    }
    
    const handleSave = () => {
        if (!renewalRequest) return;
        onUpdateRenewalTerms(renewalRequest.id, terms);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setTerms({
            renewalTermMonths: renewalRequest.renewalTermMonths ?? selectedContract.renewalTermMonths ?? 12,
            noticePeriodDays: renewalRequest.noticePeriodDays ?? selectedContract.noticePeriodDays ?? 30,
            upliftPercent: renewalRequest.upliftPercent ?? selectedContract.upliftPercent ?? 0,
        });
        setIsEditing(false);
    };

    const handleInputChange = (field: keyof typeof terms, value: string) => {
        setTerms(prev => ({ ...prev, [field]: Number(value) }));
    };

    const handleAddFeedback = () => {
        if (newFeedback.trim() && renewalRequest) {
            onCreateRenewalFeedback(renewalRequest.id, newFeedback);
            setNewFeedback('');
        }
    };
    
    const feedback = renewalRequest.feedback || [];
    const upliftAmount = selectedContract.value * (terms.upliftPercent / 100);
    const projectedValue = selectedContract.value + upliftAmount;
    
    const editActions = (
        <div className="flex items-center space-x-2">
            {!isEditing && (
                <button onClick={() => setIsEditing(true)} className="flex items-center px-3 py-1.5 text-xs font-semibold text-primary-800 dark:text-primary-200 bg-primary-100 dark:bg-primary-900/40 rounded-md hover:bg-primary-200">
                    <EditIcon className="w-4 h-4 mr-1.5" />
                    Edit Terms
                </button>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            <div>
                <button onClick={() => handleNavigate('renewals')} className="flex items-center text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 mb-2">
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    Back to Renewals Hub
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Renewal Workspace: {selectedContract.title}</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">This is your central hub for managing the in-progress renewal of this contract.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card title="Renewal Overview" icon={<FileTextIcon className="w-5 h-5 mr-3 text-gray-400" />} actions={editActions}>
                        {isEditing ? (
                            <div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Renewal Term (Months)</label>
                                        <input type="number" value={terms.renewalTermMonths} onChange={e => handleInputChange('renewalTermMonths', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-sm"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Notice Period (Days)</label>
                                        <input type="number" value={terms.noticePeriodDays} onChange={e => handleInputChange('noticePeriodDays', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-sm"/>
                                    </div>
                                     <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Uplift %</label>
                                        <input type="number" value={terms.upliftPercent} onChange={e => handleInputChange('upliftPercent', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-sm"/>
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end space-x-3">
                                    <button onClick={handleCancel} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                                    <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700">Save Changes</button>
                                </div>
                            </div>
                        ) : (
                            <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6">
                               <DetailItem label="Renewal Status" value={<StatusTag type="renewal" status={renewalRequest.status} />} />
                               <DetailItem label="Renewal Mode" value={<span className="font-semibold capitalize">{renewalRequest.mode.replace('_', ' ')}</span>} />
                               <DetailItem label="Original End Date" value={selectedContract.endDate} />
                               <DetailItem label="Notice Deadline" value={<span className="text-red-600 dark:text-red-400 font-bold">{renewalRequest.noticeDeadline}</span>} />
                               <DetailItem label="Renewal Owner" value={renewalRequest.renewalOwner ? `${renewalRequest.renewalOwner.firstName} ${renewalRequest.renewalOwner.lastName}` : 'Unassigned'} />
                               <DetailItem label="Current Value" value={formatCurrency(selectedContract.value)} />
                               <DetailItem label="Proposed Uplift" value={`${formatCurrency(upliftAmount)} (${terms.upliftPercent}%)`} />
                               <DetailItem label="Projected New Value" value={formatCurrency(projectedValue)} />
                               <DetailItem label="New Term Length" value={`${terms.renewalTermMonths} months`} />
                            </dl>
                        )}
                    </Card>

                     {childContract && (
                          <Card title="Associated Documents" icon={<RefreshCwIcon className="w-5 h-5 mr-3 text-gray-400" />}>
                             <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">This renewal is being managed via a new contract draft. All changes should be made there.</p>
                             <button onClick={() => handleSelectContract(childContract)} className="w-full text-left p-3 rounded-md bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30">
                                <p className="font-semibold text-primary-800 dark:text-primary-200">{childContract.title}</p>
                                <p className="text-xs text-primary-700 dark:text-primary-300">Status: {childContract.status}</p>
                             </button>
                          </Card>
                     )}
                </div>

                <div className="lg:col-span-1">
                     <Card title="Stakeholder Feedback" icon={<UserIcon className="w-5 h-5 mr-3 text-gray-400" />}>
                        <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                            {feedback.length > 0 ? feedback.map((fb: RenewalFeedback) => (
                                <div key={fb.id} className="flex items-start space-x-3">
                                    <img src={fb.user.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{fb.user.firstName} {fb.user.lastName}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 italic">"{fb.feedback}"</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No feedback has been submitted.</p>
                            )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 flex items-start space-x-3">
                            <img src={currentUser.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
                            <div className="flex-1">
                                <textarea value={newFeedback} onChange={e => setNewFeedback(e.target.value)} placeholder="Add your feedback..." rows={2} className="w-full text-sm p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary focus:border-primary bg-white dark:bg-gray-900" />
                                <div className="text-right mt-2">
                                    <button onClick={handleAddFeedback} className="px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 rounded-md hover:bg-primary-700">Submit Feedback</button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}