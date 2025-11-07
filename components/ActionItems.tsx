import React, { useState } from 'react';
import type { Contract } from '../types';
import { ApprovalStatus } from '../types';
import { CheckCircleIcon, ClockIcon } from './icons';

interface ActionItemsProps {
    myApprovals: Contract[];
    myExpiringContracts: (Contract & { daysLeft: number })[];
    onSelectContract: (contract: Contract) => void;
}

const TabButton = ({ label, count, isActive, onClick }: { label: string; count: number; isActive: boolean; onClick: () => void; }) => (
    <button
        onClick={onClick}
        className={`px-3 py-2 text-sm font-medium rounded-md flex items-center transition-colors ${
            isActive
                ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-200'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
        }`}
    >
        {label}
        {count > 0 && <span className={`ml-2 text-xs font-bold rounded-full px-2 py-0.5 ${isActive ? 'bg-primary text-primary-900' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'}`}>{count}</span>}
    </button>
);

export default function ActionItems({ myApprovals, myExpiringContracts, onSelectContract }: ActionItemsProps) {
    const [activeTab, setActiveTab] = useState('approvals');

    const renderApprovals = () => (
        <div>
            {myApprovals.length > 0 ? (
                <ul className="space-y-3">
                    {myApprovals.map(c => (
                        <li key={c.id}>
                            <button onClick={() => onSelectContract(c)} className="w-full text-left flex items-center space-x-3 p-2 -m-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-yellow-100 text-yellow-700 rounded-full">
                                    <CheckCircleIcon className="w-5 h-5"/>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{c.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">vs. {c.counterparty.name}</p>
                                </div>
                                <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">Awaiting your approval</span>
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="text-center py-8">
                    <CheckCircleIcon className="mx-auto h-10 w-10 text-green-500" />
                    <p className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">You're all caught up!</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">No contracts are waiting for your approval.</p>
                </div>
            )}
        </div>
    );

    const renderExpiring = () => (
         <div>
            {myExpiringContracts.length > 0 ? (
                <ul className="space-y-3">
                    {myExpiringContracts.map(c => (
                        <li key={c.id}>
                            <button onClick={() => onSelectContract(c)} className="w-full text-left flex items-center space-x-3 p-2 -m-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-red-100 text-red-700 rounded-full">
                                    <ClockIcon className="w-5 h-5"/>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{c.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">vs. {c.counterparty.name}</p>
                                </div>
                                <span className="text-sm font-semibold text-red-700 dark:text-red-400">{c.daysLeft} days left</span>
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="text-center py-8">
                     <ClockIcon className="mx-auto h-10 w-10 text-gray-400" />
                    <p className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No contracts expiring soon</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">None of your contracts are expiring in the next 90 days.</p>
                </div>
            )}
        </div>
    );

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm h-full">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">My Workspace</h3>
                <div className="flex items-center space-x-2">
                    <TabButton label="My Approvals" count={myApprovals.length} isActive={activeTab === 'approvals'} onClick={() => setActiveTab('approvals')} />
                    <TabButton label="Expiring Soon" count={myExpiringContracts.length} isActive={activeTab === 'expiring'} onClick={() => setActiveTab('expiring')} />
                </div>
            </div>
            <div className="mt-4">
                {activeTab === 'approvals' ? renderApprovals() : renderExpiring()}
            </div>
        </div>
    );
}
