import React, { useMemo } from 'react';
import type { Contract } from '../types';
import { ContractStatus } from '../types';
import { STATUS_COLORS } from '../constants';

interface ContractsByStatusChartProps {
  contracts: Contract[];
}

export default function ContractsByStatusChart({ contracts }: ContractsByStatusChartProps) {
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

    const conicGradient = useMemo(() => {
        if (total === 0) return 'background: #e5e7eb';
        let gradient = 'conic-gradient(';
        let currentPercentage = 0;
        
        const colorMap: Record<ContractStatus, string> = {
            [ContractStatus.DRAFT]: '#E5E7EB',
            [ContractStatus.IN_REVIEW]: '#93C5FD',
            [ContractStatus.PENDING_APPROVAL]: '#FBBF24',
            [ContractStatus.APPROVED]: '#6EE7B7',
            [ContractStatus.SENT_FOR_SIGNATURE]: '#A5B4FC',
            [ContractStatus.FULLY_EXECUTED]: '#FDE047', // Primary color substitute
            [ContractStatus.ACTIVE]: '#4ADE80',
            [ContractStatus.EXPIRED]: '#9CA3AF',
            [ContractStatus.TERMINATED]: '#FCA5A5',
            [ContractStatus.ARCHIVED]: '#6B7280',
            [ContractStatus.SUPERSEDED]: '#C4B5FD',
        };

        statusCounts.forEach(({ status, count }) => {
            const percentage = (count / total) * 100;
            gradient += `${colorMap[status]} ${currentPercentage}% ${currentPercentage + percentage}%, `;
            currentPercentage += percentage;
        });
        return gradient.slice(0, -2) + ')';
    }, [statusCounts, total]);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm h-full flex flex-col">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Portfolio Status</h3>
            {total > 0 ? (
                <div className="flex-grow flex items-center justify-center mt-4">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="relative w-40 h-40">
                            <div className="absolute inset-0 rounded-full" style={{ background: conicGradient }}></div>
                            <div className="absolute inset-2 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center">
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{total}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {statusCounts.map(({ status, count }) => (
                                <div key={status} className="flex items-center">
                                    <span className={`w-3 h-3 rounded-full mr-2 ${STATUS_COLORS[status].split(' ')[0]}`}></span>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">{status}</span>
                                    <span className="ml-auto text-sm font-semibold text-gray-800 dark:text-gray-200">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                 <div className="flex-grow flex items-center justify-center text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No contracts to display.</p>
                </div>
            )}
        </div>
    );
}
