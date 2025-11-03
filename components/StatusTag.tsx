
import React from 'react';
import { ContractStatus, RiskLevel } from '../types';
import { STATUS_COLORS, RISK_COLORS } from '../constants';

type StatusTagProps = 
  | { type: 'contract'; status: ContractStatus }
  | { type: 'risk'; status: RiskLevel };


export default function StatusTag(props: StatusTagProps) {
  const { type, status } = props;

  const colorClasses = type === 'contract' 
    ? STATUS_COLORS[status as ContractStatus] 
    : RISK_COLORS[status as RiskLevel];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClasses}`}
    >
      <svg className="-ml-0.5 mr-1.5 h-2 w-2" fill="currentColor" viewBox="0 0 8 8">
        <circle cx="4" cy="4" r="3" />
      </svg>
      {status}
    </span>
  );
}
