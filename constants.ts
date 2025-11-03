import { Contract, ContractStatus, ContractType, RiskLevel, ApprovalStatus, ContractTemplate } from './types';
import type { UserProfile, Counterparty } from './types';

export const STATUS_COLORS: Record<ContractStatus, string> = {
  [ContractStatus.DRAFT]: 'bg-gray-200 text-gray-800',
  [ContractStatus.IN_REVIEW]: 'bg-blue-100 text-blue-800',
  [ContractStatus.PENDING_APPROVAL]: 'bg-yellow-100 text-yellow-800',
  [ContractStatus.APPROVED]: 'bg-teal-100 text-teal-800',
  [ContractStatus.SENT_FOR_SIGNATURE]: 'bg-indigo-100 text-indigo-800',
  [ContractStatus.FULLY_SIGNED]: 'bg-primary-200 text-primary-800',
  [ContractStatus.ACTIVE]: 'bg-green-100 text-green-800',
  [ContractStatus.EXPIRED]: 'bg-gray-400 text-white',
  [ContractStatus.TERMINATED]: 'bg-red-200 text-red-800',
  [ContractStatus.ARCHIVED]: 'bg-gray-500 text-white',
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  [RiskLevel.LOW]: 'bg-green-100 text-green-800',
  [RiskLevel.MEDIUM]: 'bg-yellow-100 text-yellow-800',
  [RiskLevel.HIGH]: 'bg-orange-200 text-orange-800',
  [RiskLevel.CRITICAL]: 'bg-red-200 text-red-800',
};

export const APPROVAL_STATUS_COLORS: Record<ApprovalStatus, string> = {
    [ApprovalStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
    [ApprovalStatus.REQUESTED_CHANGES]: 'bg-blue-100 text-blue-800',
    [ApprovalStatus.REJECTED]: 'bg-red-200 text-red-800',
    [ApprovalStatus.APPROVED]: 'bg-green-100 text-green-800',
};


export const USERS: Record<string, UserProfile> = {
    'alice': { id: 'user-1', name: 'Alice Johnson', avatarUrl: 'https://i.pravatar.cc/150?u=user-1', role: 'Legal Counsel' },
    'bob': { id: 'user-2', name: 'Bob Williams', avatarUrl: 'https://i.pravatar.cc/150?u=user-2', role: 'Sales Director' },
    'charlie': { id: 'user-3', name: 'Charlie Brown', avatarUrl: 'https://i.pravatar.cc/150?u=user-3', role: 'Finance Manager' },
    'diana': { id: 'user-4', name: 'Diana Prince', avatarUrl: 'https://i.pravatar.cc/150?u=user-4', role: 'Requestor' },
};

export const COUNTERPARTIES: Record<string, Counterparty> = {
    'acme': { id: 'cp-1', name: 'Acme Corporation', address: '123 Main St, Anytown, USA' },
    'globex': { id: 'cp-2', name: 'Globex Inc.', address: '456 Market St, Metropolis, USA' },
    'stark': { id: 'cp-3', name: 'Stark Industries', address: '1 Stark Tower, New York, USA' },
    'cyberdyne': { id: 'cp-5', name: 'Cyberdyne Systems', address: '18144 El Camino Real, Sunnyvale, CA' },
    'wayne': { id: 'cp-6', name: 'Wayne Enterprises', address: '1007 Mountain Drive, Gotham City' },
};

const DUMMY_CONTRACT_CONTENT = `
This Master Services Agreement ("Agreement") is made and entered into as of the Effective Date by and between Client and Service Provider.
1. SERVICES. Service Provider shall perform the services described in each Statement of Work ("SOW").
2. TERM AND TERMINATION. This Agreement shall commence on the Effective Date and continue until terminated. Either party may terminate this Agreement for convenience upon thirty (30) days' written notice.
3. FEES AND PAYMENT. Client shall pay Service Provider the fees set forth in the applicable SOW. Invoices are due within thirty (30) days of receipt.
4. CONFIDENTIALITY. Each party agrees to maintain the confidentiality of the other's proprietary information.
5. LIMITATION OF LIABILITY. IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES.
`;


export const MOCK_CONTRACTS: Contract[] = [
  {
    id: 'contract-001',
    title: 'Master Services Agreement - Acme Corp',
    type: ContractType.MSA,
    status: ContractStatus.ACTIVE,
    riskLevel: RiskLevel.MEDIUM,
    counterparty: COUNTERPARTIES['acme'],
    owner: USERS['alice'],
    startDate: '2023-01-15',
    endDate: '2025-01-14',
    renewalDate: '2025-01-14',
    value: 250000,
    versions: [
      { id: 'v1-1', versionNumber: 1, createdAt: '2023-01-05', author: USERS['alice'], content: DUMMY_CONTRACT_CONTENT },
      { id: 'v1-2', versionNumber: 2, createdAt: '2023-01-10', author: USERS['bob'], content: DUMMY_CONTRACT_CONTENT.replace('thirty (30)', 'sixty (60)') },
    ],
    approvalSteps: [
      { id: 'app-1-1', approver: USERS['bob'], status: ApprovalStatus.APPROVED, approvedAt: '2023-01-12' },
      { id: 'app-1-2', approver: USERS['charlie'], status: ApprovalStatus.APPROVED, approvedAt: '2023-01-13' },
    ],
  },
  {
    id: 'contract-002',
    title: 'SOW #1 - Globex Inc. Project Phoenix',
    type: ContractType.SOW,
    status: ContractStatus.PENDING_APPROVAL,
    riskLevel: RiskLevel.HIGH,
    counterparty: COUNTERPARTIES['globex'],
    owner: USERS['bob'],
    startDate: '2024-08-01',
    endDate: '2025-02-01',
    renewalDate: '2025-02-01',
    value: 75000,
    versions: [
        { id: 'v2-1', versionNumber: 1, createdAt: '2024-07-20', author: USERS['diana'], content: DUMMY_CONTRACT_CONTENT }
    ],
    approvalSteps: [
      { id: 'app-2-1', approver: USERS['alice'], status: ApprovalStatus.PENDING },
      { id: 'app-2-2', approver: USERS['charlie'], status: ApprovalStatus.PENDING },
    ],
  },
   {
    id: 'contract-005',
    title: 'Vendor Agreement - Cyberdyne Systems',
    type: ContractType.VENDOR,
    status: ContractStatus.PENDING_APPROVAL,
    riskLevel: RiskLevel.MEDIUM,
    counterparty: COUNTERPARTIES['cyberdyne'],
    owner: USERS['diana'],
    startDate: '2024-09-01',
    endDate: '2025-08-31',
    renewalDate: '2025-08-31',
    value: 120000,
    versions: [
        { id: 'v5-1', versionNumber: 1, createdAt: '2024-07-28', author: USERS['diana'], content: DUMMY_CONTRACT_CONTENT }
    ],
    approvalSteps: [
      { id: 'app-5-1', approver: USERS['alice'], status: ApprovalStatus.PENDING },
      { id: 'app-5-2', approver: USERS['charlie'], status: ApprovalStatus.PENDING },
    ],
  },
  {
    id: 'contract-003',
    title: 'Mutual NDA - Stark Industries',
    type: ContractType.NDA,
    status: ContractStatus.DRAFT,
    riskLevel: RiskLevel.LOW,
    counterparty: COUNTERPARTIES['stark'],
    owner: USERS['diana'],
    startDate: '2024-07-25',
    endDate: '2026-07-24',
    renewalDate: '2026-07-24',
    value: 0,
    versions: [
        { id: 'v3-1', versionNumber: 1, createdAt: '2024-07-25', author: USERS['diana'], content: 'This is a standard Non-Disclosure Agreement...' }
    ],
    approvalSteps: [],
  },
  {
    id: 'contract-004',
    title: 'SaaS Subscription - CloudService Pro',
    type: ContractType.SAAS,
    status: ContractStatus.FULLY_SIGNED,
    riskLevel: RiskLevel.LOW,
    counterparty: { id: 'cp-4', name: 'CloudService Pro', address: '789 Cloud Ave, Tech City, USA' },
    owner: USERS['alice'],
    startDate: '2024-06-01',
    endDate: '2025-05-31',
    renewalDate: '2025-05-31',
    value: 12000,
    versions: [
      { id: 'v4-1', versionNumber: 1, createdAt: '2024-05-20', author: USERS['alice'], content: DUMMY_CONTRACT_CONTENT },
    ],
    approvalSteps: [
       { id: 'app-4-1', approver: USERS['charlie'], status: ApprovalStatus.APPROVED, approvedAt: '2024-05-25' },
    ]
  },
  {
    id: 'contract-006',
    title: 'Lease Agreement - Wayne Enterprises Tower',
    type: ContractType.LEASE,
    status: ContractStatus.PENDING_APPROVAL,
    riskLevel: RiskLevel.HIGH,
    counterparty: COUNTERPARTIES['wayne'],
    owner: USERS['charlie'],
    startDate: '2024-10-01',
    endDate: '2029-09-30',
    renewalDate: '2029-09-30',
    value: 5000000,
    versions: [
        { id: 'v6-1', versionNumber: 1, createdAt: '2024-07-29', author: USERS['charlie'], content: DUMMY_CONTRACT_CONTENT }
    ],
    approvalSteps: [
      { id: 'app-6-1', approver: USERS['bob'], status: ApprovalStatus.PENDING },
    ],
  },
];

const DUMMY_NDA_CONTENT = `
This Mutual Non-Disclosure Agreement ("Agreement") is entered into between [Party A] and [Party B] for the purpose of preventing the unauthorized disclosure of Confidential Information as defined below.

1. Definition of Confidential Information. "Confidential Information" means any data or information that is proprietary to the Disclosing Party and not generally known to the public, whether in tangible or intangible form.

2. Obligations of Receiving Party. The Receiving Party shall hold and maintain the Confidential Information in strictest confidence for the sole and exclusive benefit of the Disclosing Party.

3. Term. The non-disclosure provisions of this Agreement shall survive the termination of this Agreement and the Receiving Party's duty to hold Confidential Information in confidence shall remain in effect until the Confidential Information no longer qualifies as a trade secret.
`;

const DUMMY_SOW_CONTENT = `
This Statement of Work ("SOW") is entered into under the terms of the Master Services Agreement ("MSA") between [Client Name] ("Client") and [Service Provider Name] ("Provider").

1. Project Scope. Provider will perform the following services: [Detailed description of services, deliverables, and milestones].

2. Timeline. The project will commence on [Start Date] and is expected to be completed by [End Date].

3. Fees. Client will pay Provider a fixed fee of [Amount] for the services rendered under this SOW. Payment will be made according to the following schedule: [Payment schedule].
`;


export const MOCK_TEMPLATES: ContractTemplate[] = [
  {
    id: 'template-001',
    name: 'Mutual Non-Disclosure Agreement (NDA)',
    description: 'A standard, legally-vetted template for establishing a confidential relationship between two parties.',
    type: ContractType.NDA,
    content: DUMMY_NDA_CONTENT,
  },
  {
    id: 'template-002',
    name: 'Master Services Agreement (MSA)',
    description: 'A comprehensive agreement that sets out the terms and conditions for one party to provide services to another.',
    type: ContractType.MSA,
    content: DUMMY_CONTRACT_CONTENT,
  },
  {
    id: 'template-003',
    name: 'Statement of Work (SOW)',
    description: 'A document that outlines the specific work to be performed, including deliverables, timelines, and costs.',
    type: ContractType.SOW,
    content: DUMMY_SOW_CONTENT,
  },
  {
    id: 'template-004',
    name: 'Standard Vendor Agreement',
    description: 'A general-purpose template for onboarding new vendors, covering payment terms, deliverables, and liabilities.',
    type: ContractType.VENDOR,
    content: DUMMY_CONTRACT_CONTENT.replace('Master Services Agreement', 'Vendor Agreement'),
  }
];