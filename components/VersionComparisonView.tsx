import React from 'react';
import type { ContractVersion } from '../types';
import { diffLines, DiffResult } from '../lib/diff';

interface VersionComparisonViewProps {
    v1: ContractVersion;
    v2: ContractVersion;
}

// FIX: Changed component to be of type React.FC to correctly handle system props like 'key'.
const DiffLine: React.FC<{ result: DiffResult }> = ({ result }) => {
    let bgColor = 'bg-transparent';
    let sign = ' ';
    let lineNumber = result.lineNumber || ' ';

    if (result.type === 'added') {
        bgColor = 'bg-green-100 dark:bg-green-900/20';
        sign = '+';
    } else if (result.type === 'removed') {
        bgColor = 'bg-red-100 dark:bg-red-900/20';
        sign = '-';
        lineNumber = ' ';
    }
    
    return (
         <tr className={bgColor}>
            <td className="px-2 py-0.5 text-right text-gray-400 select-none w-10">{lineNumber}</td>
            <td className="px-2 py-0.5 text-center text-gray-500 select-none w-6">{sign}</td>
            <td className="px-2 py-0.5 whitespace-pre-wrap text-gray-800 dark:text-gray-200">{result.value}</td>
        </tr>
    );
};

export default function VersionComparisonView({ v1, v2 }: VersionComparisonViewProps) {
    const diffResults = diffLines(v1.content, v2.content);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Comparing Version {v1.versionNumber} with Version {v2.versionNumber}
            </h3>
            <div className="font-mono text-sm border dark:border-gray-700 rounded-md overflow-hidden">
                <table className="w-full">
                    <tbody>
                        {diffResults.map((result, index) => (
                            <DiffLine key={index} result={result} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}