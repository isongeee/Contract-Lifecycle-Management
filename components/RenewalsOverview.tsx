
import React, { useMemo } from 'react';
import type { Contract } from '../types';
import { ClockIcon, AlertTriangleIcon } from './icons';

interface RenewalsOverviewProps {
  contracts: Contract[];
}

const daysUntil = (dateStr: string) => {
    if (!dateStr) return Infinity;
    // Get today's date at midnight UTC to ensure consistent comparison
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    
    // Parse the YYYY-MM-DD string as midnight UTC
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

export default function RenewalsOverview({ contracts }: RenewalsOverviewProps) {
    const metrics = useMemo(() => {
        const next30 = contracts.filter(c => {
            const days = daysUntil(c.endDate);
            return days >= 0 && days <= 30;
        }).length;
        const next60 = contracts.filter(c => {
            const days = daysUntil(c.endDate);
            return days > 30 && days <= 60;
        }).length;
        const next90 = contracts.filter(c => {
            const days = daysUntil(c.endDate);
            return days > 60 && days <= 90;
        }).length;

        const atRisk = contracts.filter(c => {
            const days = c.renewalRequest?.noticeDeadline ? daysUntil(c.renewalRequest.noticeDeadline) : Infinity;
            return days >= 0 && days <= 7;
        });

        return { next30, next60, next90, atRisk };
    }, [contracts]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard label="Renewals in Next 30 Days" value={metrics.next30} />
                <MetricCard label="Renewals in 31-60 Days" value={metrics.next60} />
                <MetricCard label="Renewals in 61-90 Days" value={metrics.next90} />
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