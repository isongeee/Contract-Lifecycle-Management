import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { ArrowLeftIcon, ClockIcon, EditIcon, FileTextIcon, RefreshCwIcon, UserIcon } from './icons';
import { MOCK_REVIEW_CHECKLIST } from '../constants';
import StatusTag from './StatusTag';
import type { RenewalFeedback } from '../types';

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
);

// FIX: Made the `children` prop optional to resolve typing issues.
const Card = ({ title, icon, children }: { title: string; icon: React.ReactNode; children?: React.ReactNode; }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center">{icon}{title}</h3>
        </div>
        <div className="p-6">{children}</div>
    </div>
);

const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export default function RenewalWorkspace() {
    const { selectedContract, contracts, handleNavigate, handleSelectContract } = useAppContext();
    const [checklistItems, setChecklistItems] = useState(() => MOCK_REVIEW_CHECKLIST.map(item => ({...item, isCompleted: false })));

    const handleChecklistItemToggle = (id: string) => {
        setChecklistItems(prev => prev.map(item => item.id === id ? { ...item, isCompleted: !item.isCompleted } : item));
    };

    const childContract = useMemo(() => {
        if (!selectedContract) return null;
        return contracts.find(c => c.parentContractId === selectedContract.id);
    }, [contracts, selectedContract]);

    if (!selectedContract || !selectedContract.renewalRequest) {
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
    
    const { renewalRequest } = selectedContract;
    const feedback = renewalRequest.feedback || [];
    const upliftAmount = selectedContract.value * ((renewalRequest.upliftPercent || 0) / 100);
    const projectedValue = selectedContract.value + upliftAmount;

    return (
        <div className="space-y-6">
            <div>
                <button onClick={() => handleNavigate('renewals')} className="flex items-center text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 mb-2">
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    Back to Renewals Hub
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Renewal Workspace: {selectedContract.title}</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage the renewal process for this contract.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card title="Key Details" icon={<ClockIcon className="w-5 h-5 mr-3 text-gray-400" />}>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-6">
                           <DetailItem label="Renewal Status" value={<StatusTag type="renewal" status={renewalRequest.status} />} />
                           <DetailItem label="Renewal Mode" value={<span className="font-semibold capitalize">{renewalRequest.mode.replace('_', ' ')}</span>} />
                           <DetailItem label="Original End Date" value={selectedContract.endDate} />
                           <DetailItem label="Notice Deadline" value={<span className="text-red-600 dark:text-red-400 font-bold">{renewalRequest.noticeDeadline}</span>} />
                           <DetailItem label="Renewal Owner" value={renewalRequest.renewalOwner ? `${renewalRequest.renewalOwner.firstName} ${renewalRequest.renewalOwner.lastName}` : 'Unassigned'} />
                        </dl>
                    </Card>

                    <Card title="Financials" icon={<FileTextIcon className="w-5 h-5 mr-3 text-gray-400" />}>
                         <dl className="grid grid-cols-2 gap-x-4 gap-y-6">
                            <DetailItem label="Current Value" value={formatCurrency(selectedContract.value)} />
                            <DetailItem label="Proposed Uplift" value={`${formatCurrency(upliftAmount)} (${renewalRequest.upliftPercent}%)`} />
                            <DetailItem label="Projected New Value" value={formatCurrency(projectedValue)} />
                            <DetailItem label="New Term Length" value={`${renewalRequest.renewalTermMonths} months`} />
                        </dl>
                    </Card>

                    <Card title="Stakeholder Feedback" icon={<UserIcon className="w-5 h-5 mr-3 text-gray-400" />}>
                        <div className="space-y-4 max-h-60 overflow-y-auto">
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
                    </Card>
                </div>

                <div className="lg:col-span-1 space-y-6">
                     <Card title="Renewal Checklist" icon={<EditIcon className="w-5 h-5 mr-3 text-gray-400" />}>
                        <fieldset className="space-y-3">
                           {checklistItems.map(item => (
                               <div key={item.id} className="relative flex items-start">
                                   <div className="flex h-6 items-center">
                                       <input id={item.id} type="checkbox" checked={item.isCompleted} onChange={() => handleChecklistItemToggle(item.id)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600" />
                                   </div>
                                   <div className="ml-3 text-sm leading-6">
                                       <label htmlFor={item.id} className={`font-medium text-gray-900 dark:text-gray-100 ${item.isCompleted ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>{item.text}</label>
                                   </div>
                               </div>
                           ))}
                        </fieldset>
                     </Card>
                     {childContract && (
                          <Card title="Associated Documents" icon={<RefreshCwIcon className="w-5 h-5 mr-3 text-gray-400" />}>
                             <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">This renewal is being managed via a new contract draft.</p>
                             <button onClick={() => handleSelectContract(childContract)} className="w-full text-left p-3 rounded-md bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30">
                                <p className="font-semibold text-primary-800 dark:text-primary-200">{childContract.title}</p>
                                <p className="text-xs text-primary-700 dark:text-primary-300">Status: {childContract.status}</p>
                             </button>
                          </Card>
                     )}
                </div>
            </div>
        </div>
    );
}