import React, { useMemo } from 'react';
import type { Contract } from '../types';
import { RENEWAL_STATUS_COLORS } from '../constants';
import { RenewalStatus } from '../types';
import { ClockIcon, AlertTriangleIcon } from './icons';

interface RenewalsOverviewProps {
  contracts: Contract[];
}

const daysUntil = (dateStr: string) => {
    if (!dateStr) return Infinity;
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const targetDate = new Date(dateStr + 'T00:00:00Z');
    if (isNaN(targetDate.getTime())) return Infinity;
    const diffTime = targetDate.getTime() - todayUTC.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const MetricCard = ({ label, value }: { label: string; value: string | number }) => (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
    </div>
);

const StatusPieChart = ({ data }: { data: { status: RenewalStatus, count: number }[]}) => {
    const total = data.reduce((sum, item) => sum + item.count, 0);
    if (total === 0) return null;

    const conicGradient = useMemo(() => {
        let gradient = 'conic-gradient(';
        let currentPercentage = 0;
        
        // FIX: Corrected the colorMap to use valid RenewalStatus enum members and align with theme colors.
        // This resolves missing properties 'decision_needed' and 'completed', and removes invalid properties 'QUEUED' and 'ACTIVATED'.
        const colorMap: Record<RenewalStatus, string> = {
            [RenewalStatus.DECISION_NEEDED]: '#FBBF24',
            [RenewalStatus.IN_PROGRESS]: '#93C5FD',
            [RenewalStatus.COMPLETED]: '#4ADE80',
            [RenewalStatus.CANCELLED]: '#FCA5A5',
        };

        data.forEach(({ status, count }) => {
            const percentage = (count / total) * 100;
            gradient += `${colorMap[status]} ${currentPercentage}% ${currentPercentage + percentage}%, `;
            currentPercentage += percentage;
        });
        return gradient.slice(0, -2) + ')';
    }, [data, total]);
    
    return (
        <div className="flex items-center gap-6">
            <div className="relative w-32 h-32">
                <div className="absolute inset-0 rounded-full" style={{ background: conicGradient }}></div>
                <div className="absolute inset-2 bg-white dark:bg-gray-800 rounded-full"></div>
            </div>
            <div className="space-y-2">
                {data.map(({ status, count }) => (
                    <div key={status} className="flex items-center">
                        <span className={`w-3 h-3 rounded-full mr-2 ${RENEWAL_STATUS_COLORS[status].split(' ')[0]}`}></span>
                        <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">{status.replace('_', ' ')}</span>
                        <span className="ml-auto text-sm font-semibold text-gray-800 dark:text-gray-200">{count}</span>
                    </div>
                ))}
            </div>
        </div>
    )
};

const ValueByMonthChart = ({ data }: { data: { month: string, value: number }[] }) => {
    const maxValue = Math.max(...data.map(d => d.value), 0);
    if (maxValue === 0) return <p className="text-sm text-center text-gray-500 py-8">No upcoming renewal values to display.</p>;
    
    return (
        <div className="flex justify-between items-end space-x-4 h-48">
            {data.map(({ month, value }) => (
                <div key={month} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-t-md flex-grow flex items-end">
                        <div 
                            className="w-full bg-primary rounded-t-md" 
                            style={{ height: `${(value / maxValue) * 100}%` }}
                            title={`${month}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)}`}
                        ></div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{month}</p>
                </div>
            ))}
        </div>
    );
};


export default function RenewalsOverview({ contracts }: RenewalsOverviewProps) {
    const { metrics, pieChartData, barChartData } = useMemo(() => {
        const next30 = contracts.filter(c => { const days = daysUntil(c.endDate); return days >= 0 && days <= 30; }).length;
        const next60 = contracts.filter(c => { const days = daysUntil(c.endDate); return days > 30 && days <= 60; }).length;
        const next90 = contracts.filter(c => { const days = daysUntil(c.endDate); return days > 60 && days <= 90; }).length;
        const atRisk = contracts.filter(c => { const days = c.renewalRequest?.noticeDeadline ? daysUntil(c.renewalRequest.noticeDeadline) : Infinity; return days >= 0 && days <= 7; });
        
        const statusCounts = contracts.reduce((acc, c) => {
            if (c.renewalRequest) {
                acc[c.renewalRequest.status] = (acc[c.renewalRequest.status] || 0) + 1;
            }
            return acc;
        }, {} as Record<RenewalStatus, number>);
        
        const pieChartData = Object.entries(statusCounts).map(([status, count]) => ({ status: status as RenewalStatus, count }));

        const valueByMonth: { [key: string]: number } = {};
        const today = new Date();
        for (let i = 0; i < 6; i++) {
            const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const monthKey = date.toLocaleString('default', { month: 'short' });
            valueByMonth[monthKey] = 0;
        }

        contracts.forEach(c => {
            const endDate = new Date(c.endDate + 'T00:00:00Z');
            const monthKey = endDate.toLocaleString('default', { month: 'short' });
            if (monthKey in valueByMonth) {
                valueByMonth[monthKey] += c.value;
            }
        });

        const barChartData = Object.entries(valueByMonth).map(([month, value]) => ({ month, value }));
        
        return { metrics: { next30, next60, next90, atRisk }, pieChartData, barChartData };
    }, [contracts]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard label="Renewals in Next 30 Days" value={metrics.next30} />
                <MetricCard label="Renewals in 31-60 Days" value={metrics.next60} />
                <MetricCard label="Renewals in 61-90 Days" value={metrics.next90} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Renewals by Status</h3>
                    <StatusPieChart data={pieChartData} />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Total Value Renewing by Month</h3>
                    <ValueByMonthChart data={barChartData} />
                </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center">
                        <AlertTriangleIcon className="w-5 h-5 mr-2 text-red-500" />
                        At-Risk Renewals
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Notice deadline is within the next 7 days.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Contract</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Notice Deadline</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Days Left</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Owner</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {metrics.atRisk.map(contract => (
                                <tr key={contract.id}>
                                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900 dark:text-gray-100">{contract.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600 dark:text-red-400">{contract.renewalRequest?.noticeDeadline}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{daysUntil(contract.renewalRequest?.noticeDeadline || '')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{contract.renewalRequest?.renewalOwner?.firstName} {contract.renewalRequest?.renewalOwner?.lastName}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {metrics.atRisk.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-sm text-gray-500 dark:text-gray-400">No contracts are currently at risk.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
