import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { PREBUILT_REPORTS } from '../constants';
import { ContractStatus, CounterpartyType } from '../types';
import { BarChartIcon, DownloadIcon } from './icons';
import type { ReportConfiguration, Contract, UserProfile } from '../types';

const ReportCard = ({ report, onSelect, isActive }: { report: ReportConfiguration; onSelect: () => void; isActive: boolean; }) => (
    <button
        onClick={onSelect}
        className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 ${
            isActive 
                ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-400 dark:border-primary-600 shadow-lg'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md'
        }`}
    >
        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-md">{report.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{report.description}</p>
    </button>
);

const exportToCsv = (filename: string, rows: any[]) => {
    if (rows.length === 0) return;
    const processRow = (row: any[]) => row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',');
    const headers = Object.keys(rows[0]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows.map(Object.values)].map(e => processRow(e)).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const ReportWrapper = ({ title, onExport, children, dataExists }: { title: string; onExport: () => void; children: React.ReactNode; dataExists: boolean }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mt-8">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
            <button
                onClick={onExport}
                disabled={!dataExists}
                className="flex items-center px-3 py-1.5 text-sm font-semibold text-primary-800 dark:text-primary-200 bg-primary-100 dark:bg-primary-900/40 rounded-md hover:bg-primary-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <DownloadIcon className="w-4 h-4 mr-2" />
                Export to CSV
            </button>
        </div>
        <div className="p-4">
            {children}
        </div>
    </div>
);

const getQuarter = (date: Date) => {
    const month = date.getMonth();
    if (month < 3) return 'Q1';
    if (month < 6) return 'Q2';
    if (month < 9) return 'Q3';
    return 'Q4';
};

const ExpiringByQuarterReport = () => {
    const { contracts } = useAppContext();
    const data = useMemo(() => {
        const reportData: { Owner: string; Quarter: string; Contract: string; 'End Date': string; }[] = [];
        const activeContracts = contracts.filter(c => c.status === ContractStatus.ACTIVE);

        activeContracts.forEach(c => {
            const endDate = new Date(c.endDate);
            const quarter = `${endDate.getFullYear()} ${getQuarter(endDate)}`;
            reportData.push({
                'Owner': `${c.owner.firstName} ${c.owner.lastName}`,
                'Quarter': quarter,
                'Contract': c.title,
                'End Date': c.endDate,
            });
        });
        
        return reportData.sort((a,b) => a.Quarter.localeCompare(b.Quarter) || a.Owner.localeCompare(b.Owner));
    }, [contracts]);
    
    return (
        <ReportWrapper title="Contracts Expiring by Quarter" onExport={() => exportToCsv('expiring_by_quarter', data)} dataExists={data.length > 0}>
            <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Owner</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Quarter</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Contract</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">End Date</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                       {data.map((row, index) => (
                           <tr key={index}>
                               <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{row.Owner}</td>
                               <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{row.Quarter}</td>
                               <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{row.Contract}</td>
                               <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{row['End Date']}</td>
                           </tr>
                       ))}
                    </tbody>
                </table>
            </div>
        </ReportWrapper>
    );
};

const ValueByCounterpartyReport = () => {
    const { contracts } = useAppContext();
    const data = useMemo(() => {
        const grouped = contracts.reduce((acc, contract) => {
            const type = contract.counterparty.type;
            if (!acc[type]) {
                acc[type] = { totalValue: 0, count: 0 };
            }
            acc[type].totalValue += contract.value;
            acc[type].count += 1;
            return acc;
        }, {} as Record<CounterpartyType, { totalValue: number; count: number }>);

        return Object.entries(grouped).map(([type, { totalValue, count }]) => ({
            'Counterparty Type': type,
            'Total Value': totalValue,
            'Number of Contracts': count,
        })).sort((a,b) => b['Total Value'] - a['Total Value']);
    }, [contracts]);
    
    return (
        <ReportWrapper title="Total Value by Counterparty Type" onExport={() => exportToCsv('value_by_counterparty', data)} dataExists={data.length > 0}>
             <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Counterparty Type</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Total Value</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Number of Contracts</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                       {data.map((row, index) => (
                           <tr key={index}>
                               <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{row['Counterparty Type']}</td>
                               <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row['Total Value'])}</td>
                               <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{row['Number of Contracts']}</td>
                           </tr>
                       ))}
                    </tbody>
                </table>
            </div>
        </ReportWrapper>
    );
};

const calculateDuration = (start: string | undefined, end: string | undefined) => {
    if (!start || !end) return null;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) return null;
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 0 ? 1 : diffDays; // Minimum 1 day
};

const LifecycleDurationReport = () => {
    const { contracts } = useAppContext();

    const data = useMemo(() => {
        const stageData: { [key: string]: { totalDays: number; count: number } } = {
            'Draft': { totalDays: 0, count: 0 },
            'In Review': { totalDays: 0, count: 0 },
            'Pending Approval': { totalDays: 0, count: 0 },
            'Signing': { totalDays: 0, count: 0 },
            'Activation': { totalDays: 0, count: 0 },
        };
        
        contracts.forEach(contract => {
            const firstVersion = contract.versions[0];
            if (!firstVersion) return;
            const createdAt = firstVersion.createdAt;
            let duration;

            duration = calculateDuration(createdAt, contract.submittedAt);
            if (duration !== null) {
                stageData['Draft'].totalDays += duration;
                stageData['Draft'].count++;
            }

            duration = calculateDuration(contract.reviewStartedAt, contract.approvalStartedAt);
            if (duration !== null) {
                stageData['In Review'].totalDays += duration;
                stageData['In Review'].count++;
            }
            
            duration = calculateDuration(contract.approvalStartedAt, contract.approvalCompletedAt);
            if (duration !== null) {
                stageData['Pending Approval'].totalDays += duration;
                stageData['Pending Approval'].count++;
            }

            duration = calculateDuration(contract.sentForSignatureAt, contract.executedAt);
            if (duration !== null) {
                stageData['Signing'].totalDays += duration;
                stageData['Signing'].count++;
            }

            duration = calculateDuration(contract.executedAt, contract.activeAt);
            if (duration !== null) {
                stageData['Activation'].totalDays += duration;
                stageData['Activation'].count++;
            }
        });

        return Object.entries(stageData).map(([stage, { totalDays, count }]) => ({
            'Stage': stage,
            'Average Duration (Days)': count > 0 ? (totalDays / count).toFixed(1) : 'N/A',
            'Number of Contracts': count,
        }));

    }, [contracts]);
    
    return (
        <ReportWrapper title="Average Lifecycle Stage Duration" onExport={() => exportToCsv('lifecycle_duration', data)} dataExists={data.some(d => d['Number of Contracts'] > 0)}>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Stage</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Average Duration (Days)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Contracts Analyzed</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                       {data.map((row) => (
                           <tr key={row.Stage}>
                               <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{row.Stage}</td>
                               <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{row['Average Duration (Days)']}</td>
                               <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{row['Number of Contracts']}</td>
                           </tr>
                       ))}
                    </tbody>
                </table>
            </div>
        </ReportWrapper>
    );
};


const PlaceholderReport = ({ title }: { title: string }) => (
    <ReportWrapper title={title} onExport={() => {}} dataExists={false}>
        <div className="text-center py-12">
            <BarChartIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">Report in Development</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">This report is coming soon and will provide deeper insights into your contract data.</p>
        </div>
    </ReportWrapper>
);

export default function ReportingPage() {
    const [activeReport, setActiveReport] = useState<ReportConfiguration | null>(null);
    
    const renderActiveReport = () => {
        if (!activeReport) return null;
        switch(activeReport.type) {
            case 'expiring_by_quarter':
                return <ExpiringByQuarterReport />;
            case 'value_by_counterparty':
                return <ValueByCounterpartyReport />;
            case 'lifecycle_duration':
                return <LifecycleDurationReport />;
            case 'clause_analysis':
                return <PlaceholderReport title={activeReport.title} />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reporting & Analytics</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Generate reports to gain insights into your contract portfolio.
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PREBUILT_REPORTS.map(report => (
                    <ReportCard 
                        key={report.id} 
                        report={report} 
                        isActive={activeReport?.id === report.id} 
                        onSelect={() => setActiveReport(report)}
                    />
                ))}
            </div>

            {activeReport && (
                <div className="mt-6">
                    {renderActiveReport()}
                </div>
            )}
        </div>
    );
}