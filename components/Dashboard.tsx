import React, { useMemo } from 'react';
import type { Contract } from '../types';
import { ContractStatus, RiskLevel } from '../types';
import { STATUS_COLORS } from '../constants';
import { FileTextIcon, UsersIcon, DollarSignIcon, AlertTriangleIcon, ClockIcon } from './icons';

// A utility to format currency
const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

// A utility to calculate days between dates
const daysUntil = (dateStr: string) => {
    const today = new Date();
    const endDate = new Date(dateStr);
    const diffTime = endDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const MetricCard = ({ icon, label, value, color, onClick }: { icon: React.ReactNode; label: string; value: string | number, color: string; onClick: () => void; }) => (
    <button 
        onClick={onClick}
        className="w-full text-left bg-white p-5 rounded-xl shadow-sm flex items-start space-x-4 hover:shadow-md hover:border-primary-300 transition-all duration-200 border border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
    >
        <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
    </button>
);

const ContractsByStatus = ({ contracts }: { contracts: Contract[] }) => {
    const statusCounts = useMemo(() => {
        const counts = contracts.reduce((acc, contract) => {
            acc[contract.status] = (acc[contract.status] || 0) + 1;
            return acc;
        }, {} as Record<ContractStatus, number>);
        return Object.entries(counts)
            .map(([status, count]) => ({ status: status as ContractStatus, count }))
            .sort((a, b) => b.count - a.count);
    }, [contracts]);
    
    const total = contracts.length;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full">
            <h3 className="text-lg font-bold text-gray-900">Contracts by Status</h3>
            <div className="mt-4 space-y-3">
                {statusCounts.map(({ status, count }) => (
                    <div key={status}>
                        <div className="flex justify-between text-sm font-medium text-gray-600 mb-1">
                            <span>{status}</span>
                            <span>{count}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                                className={`${STATUS_COLORS[status].split(' ')[0]} h-2.5 rounded-full`}
                                style={{ width: `${(count / total) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ExpiringContracts = ({ contracts }: { contracts: Contract[] }) => {
    const expiringSoon = useMemo(() => {
        return contracts
            .map(c => ({ ...c, daysLeft: daysUntil(c.endDate) }))
            .filter(c => c.daysLeft > 0 && c.daysLeft <= 90)
            .sort((a, b) => a.daysLeft - b.daysLeft);
    }, [contracts]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Expiring Soon (90 Days)</h3>
            {expiringSoon.length > 0 ? (
                <ul className="space-y-4">
                    {expiringSoon.map(c => (
                        <li key={c.id} className="flex items-center space-x-3">
                            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-yellow-100 text-yellow-700 rounded-full">
                                <ClockIcon className="w-5 h-5"/>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-800">{c.title}</p>
                                <p className="text-xs text-gray-500">
                                    Expires in <span className="font-bold">{c.daysLeft} days</span> on {c.endDate}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="text-center py-8">
                    <p className="text-sm text-gray-500">No contracts are expiring in the next 90 days.</p>
                </div>
            )}
        </div>
    );
};


export default function Dashboard({ contracts, onMetricClick }: { contracts: Contract[]; onMetricClick: (metric: 'active' | 'pending' | 'high-risk') => void; }) {

    const metrics = useMemo(() => {
        const activeContracts = contracts.filter(c => c.status === ContractStatus.ACTIVE);
        const pendingApproval = contracts.filter(c => c.status === ContractStatus.PENDING_APPROVAL);
        const highRisk = contracts.filter(c => c.riskLevel === RiskLevel.HIGH || c.riskLevel === RiskLevel.CRITICAL);
        const totalValue = activeContracts.reduce((sum, c) => sum + c.value, 0);

        return {
            activeCount: activeContracts.length,
            pendingCount: pendingApproval.length,
            riskCount: highRisk.length,
            totalValue: totalValue,
        };
    }, [contracts]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Contracts Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">An overview of your contract portfolio.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard 
                    onClick={() => onMetricClick('active')}
                    icon={<FileTextIcon className="w-6 h-6 text-blue-600" />}
                    label="Active Contracts"
                    value={metrics.activeCount}
                    color="bg-blue-100"
                />
                 <MetricCard 
                    onClick={() => onMetricClick('pending')}
                    icon={<UsersIcon className="w-6 h-6 text-yellow-600" />}
                    label="Pending Approval"
                    value={metrics.pendingCount}
                    color="bg-yellow-100"
                />
                 <MetricCard 
                    onClick={() => onMetricClick('active')}
                    icon={<DollarSignIcon className="w-6 h-6 text-green-600" />}
                    label="Total Active Value"
                    value={formatCurrency(metrics.totalValue)}
                    color="bg-green-100"
                />
                 <MetricCard 
                    onClick={() => onMetricClick('high-risk')}
                    icon={<AlertTriangleIcon className="w-6 h-6 text-red-600" />}
                    label="High-Risk Contracts"
                    value={metrics.riskCount}
                    color="bg-red-100"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                    <ContractsByStatus contracts={contracts} />
                </div>
                <div className="lg:col-span-2">
                    <ExpiringContracts contracts={contracts} />
                </div>
            </div>
        </div>
    );
}