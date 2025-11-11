import React, { useMemo } from 'react';
import type { Contract } from '../types';
import { ContractStatus, RiskLevel, ApprovalStatus } from '../types';
import { FileTextIcon, UsersIcon, DollarSignIcon, AlertTriangleIcon, UserIcon } from './icons';
import ContractsByStatusChart from './ContractsByStatusChart';
import ActionItems from './ActionItems';
import { useAppContext } from '../contexts/AppContext';

// A utility to format currency
const formatCurrency = (value: number) => {
    if (value >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
        return `$${(value / 1_000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
};


// A utility to calculate days between dates
const daysUntil = (dateStr: string) => {
    if(!dateStr) return Infinity;
    const today = new Date();
    today.setHours(0,0,0,0);
    const endDate = new Date(dateStr);
    endDate.setHours(0,0,0,0);
    const diffTime = endDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const MetricCard = ({ icon, label, value, color, onClick }: { icon: React.ReactNode; label: string; value: string | number, color: string; onClick: () => void; }) => (
    <button 
        onClick={onClick}
        className="w-full text-left bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm flex items-start space-x-4 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200 border border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
    >
        <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        </div>
    </button>
);


export default function Dashboard() {
    const { contracts, handleMetricNavigation, currentUser } = useAppContext();

    const {
        totalValue,
        activeCount,
        myContractsCount,
        myApprovals,
        myExpiringContracts,
        riskCount
    } = useMemo(() => {
        if (!currentUser) return { totalValue: 0, activeCount: 0, myContractsCount: 0, myApprovals: [], myExpiringContracts: [], riskCount: 0 };

        const activeContracts = contracts.filter(c => c.status === ContractStatus.ACTIVE);
        const myContracts = contracts.filter(c => c.owner.id === currentUser.id);
        
        const myApprovals = contracts.filter(c => 
            c.status === ContractStatus.PENDING_APPROVAL &&
            c.approvalSteps.some(step => step.approver.id === currentUser.id && step.status === ApprovalStatus.PENDING)
        );

        const myExpiringContracts = myContracts
            .map(c => ({ ...c, daysLeft: daysUntil(c.endDate) }))
            .filter(c => c.daysLeft >= 0 && c.daysLeft <= 90)
            .sort((a, b) => a.daysLeft - b.daysLeft);

        const highRisk = contracts.filter(c => c.riskLevel === RiskLevel.HIGH || c.riskLevel === RiskLevel.CRITICAL);
        const totalValue = activeContracts.reduce((sum, c) => sum + c.value, 0);

        return {
            totalValue,
            activeCount: activeContracts.length,
            myContractsCount: myContracts.length,
            myApprovals,
            myExpiringContracts,
            riskCount: highRisk.length,
        };
    }, [contracts, currentUser]);

    if (!currentUser) return null;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome back, {currentUser.firstName}!</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Here's an overview of your contract portfolio.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                 <MetricCard 
                    onClick={() => handleMetricNavigation('active')}
                    icon={<DollarSignIcon className="w-6 h-6 text-green-600" />}
                    label="Total Active Value"
                    value={formatCurrency(totalValue)}
                    color="bg-green-100"
                />
                <MetricCard 
                    onClick={() => handleMetricNavigation('active')}
                    icon={<FileTextIcon className="w-6 h-6 text-blue-600" />}
                    label="Active Contracts"
                    value={activeCount}
                    color="bg-blue-100"
                />
                <MetricCard 
                    onClick={() => handleMetricNavigation('my-contracts')}
                    icon={<UserIcon className="w-6 h-6 text-indigo-600" />}
                    label="My Assigned"
                    value={myContractsCount}
                    color="bg-indigo-100"
                />
                 <MetricCard 
                    onClick={() => handleMetricNavigation('pending')}
                    icon={<UsersIcon className="w-6 h-6 text-yellow-600" />}
                    label="Pending Approval"
                    value={contracts.filter(c => c.status === ContractStatus.PENDING_APPROVAL).length}
                    color="bg-yellow-100"
                />
                 <MetricCard 
                    onClick={() => handleMetricNavigation('high-risk')}
                    icon={<AlertTriangleIcon className="w-6 h-6 text-red-600" />}
                    label="High-Risk"
                    value={riskCount}
                    color="bg-red-100"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <ActionItems 
                        myApprovals={myApprovals}
                        myExpiringContracts={myExpiringContracts}
                    />
                </div>
                <div className="lg:col-span-1">
                    <ContractsByStatusChart contracts={contracts} />
                </div>
            </div>
        </div>
    );
}