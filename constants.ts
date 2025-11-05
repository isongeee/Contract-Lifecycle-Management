import { Contract, ContractStatus, ContractType, RiskLevel, ApprovalStatus, ContractTemplate, ContractFrequency, ContractVersion, Role, UserProfile as FullUserProfile, NotificationSetting, PermissionSet, UserNotificationSettings, CounterpartyType, AllocationType } from './types';
import type { UserProfile, Counterparty, Property } from './types';

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

export const USERS: Record<string, FullUserProfile> = {
    'alice': { id: 'user-1', firstName: 'Alice', lastName: 'Johnson', email: 'alice.j@example.com', phone: '111-222-3333', jobTitle: 'Senior Counsel', department: 'Legal', avatarUrl: 'https://i.pravatar.cc/150?u=user-1', role: 'Admin', status: 'active', lastLogin: '2024-07-30' },
    'bob': { id: 'user-2', firstName: 'Bob', lastName: 'Williams', email: 'bob.w@example.com', phone: '222-333-4444', jobTitle: 'Sales Director', department: 'Sales', avatarUrl: 'https://i.pravatar.cc/150?u=user-2', role: 'Sales Director', status: 'active', lastLogin: '2024-07-29' },
    'charlie': { id: 'user-3', firstName: 'Charlie', lastName: 'Brown', email: 'charlie.b@example.com', phone: '333-444-5555', jobTitle: 'Finance Manager', department: 'Finance', avatarUrl: 'https://i.pravatar.cc/150?u=user-3', role: 'Finance Manager', status: 'active', lastLogin: '2024-07-30' },
    'diana': { id: 'user-4', firstName: 'Diana', lastName: 'Prince', email: 'diana.p@example.com', phone: '444-555-6666', jobTitle: 'Procurement Specialist', department: 'Procurement', avatarUrl: 'https://i.pravatar.cc/150?u=user-4', role: 'Requestor', status: 'inactive', lastLogin: '2024-06-15' },
};

export const COUNTERPARTIES: Record<string, Counterparty> = {
    'acme': { id: 'cp-1', name: 'Acme Corporation', type: CounterpartyType.VENDOR, addressLine1: '123 Main St', city: 'Anytown', state: 'CA', zipCode: '91234', country: 'USA' },
    'globex': { id: 'cp-2', name: 'Globex Inc.', type: CounterpartyType.PARTNER, addressLine1: '456 Market St', city: 'Metropolis', state: 'NY', zipCode: '10001', country: 'USA' },
    'stark': { id: 'cp-3', name: 'Stark Industries', type: CounterpartyType.SUPPLIER, addressLine1: '1 Stark Tower', city: 'New York', state: 'NY', zipCode: '10001', country: 'USA' },
    'cyberdyne': { id: 'cp-5', name: 'Cyberdyne Systems', type: CounterpartyType.CUSTOMER, addressLine1: '18144 El Camino Real', city: 'Sunnyvale', state: 'CA', zipCode: '94087', country: 'USA' },
    'wayne': { id: 'cp-6', name: 'Wayne Enterprises', type: CounterpartyType.PARTNER, addressLine1: '1007 Mountain Drive', city: 'Gotham City', state: 'NJ', zipCode: '07001', country: 'USA' },
};

export const MOCK_PROPERTIES: Record<string, Property> = {
    'prop-1': { id: 'prop-1', name: 'Downtown SF Office', addressLine1: '123 Market St', city: 'San Francisco', state: 'CA', country: 'USA', zipCode: '94105' },
    'prop-2': { id: 'prop-2', name: 'Manhattan HQ', addressLine1: '555 5th Ave', addressLine2: 'Suite 2100', city: 'New York', state: 'NY', country: 'USA', zipCode: '10017' },
    'prop-3': { id: 'prop-3', name: 'London Bridge View', addressLine1: 'The Shard', addressLine2: '32 London Bridge St', city: 'London', state: 'N/A', country: 'UK', zipCode: 'SE1 9SG' },
};

const DUMMY_CONTRACT_CONTENT_V1 = `
This Master Services Agreement ("Agreement") is made and entered into as of the Effective Date by and between Client and Service Provider.
1. SERVICES. Service Provider shall perform the services described in each Statement of Work ("SOW").
2. TERM AND TERMINATION. This Agreement shall commence on the Effective Date and continue until terminated. Either party may terminate this Agreement for convenience upon thirty (30) days' written notice.
3. FEES AND PAYMENT. Client shall pay Service Provider the fees set forth in the applicable SOW. Invoices are due within thirty (30) days of receipt. Total value is $240,000.
4. CONFIDENTIALITY. Each party agrees to maintain the confidentiality of the other's proprietary information.
5. LIMITATION OF LIABILITY. IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES.
`;

const DUMMY_CONTRACT_CONTENT_V2 = DUMMY_CONTRACT_CONTENT_V1
    .replace('thirty (30)', 'sixty (60)')
    .replace('$240,000', '$250,000');


export const MOCK_CONTRACTS: Contract[] = [
  {
    id: 'contract-001',
    title: 'Master Services Agreement - Acme Corp',
    type: ContractType.MSA,
    status: ContractStatus.ACTIVE,
    riskLevel: RiskLevel.MEDIUM,
    counterparty: COUNTERPARTIES['acme'],
    property: MOCK_PROPERTIES['prop-1'],
    owner: USERS['alice'],
    // Terms from latest version (v2)
    startDate: '2023-01-15',
    endDate: '2025-01-14',
    renewalDate: '2025-01-14',
    value: 250000,
    frequency: ContractFrequency.ANNUALLY,
    // FIX: Add missing 'allocation' property
    allocation: 'single',
    versions: [
      { 
        id: 'v1-1', versionNumber: 1, createdAt: '2023-01-05', author: USERS['alice'], content: DUMMY_CONTRACT_CONTENT_V1, fileName: 'ACME_MSA_v1.pdf',
        value: 240000, startDate: '2023-01-15', endDate: '2025-01-14', renewalDate: '2025-01-14', frequency: ContractFrequency.ANNUALLY, property: MOCK_PROPERTIES['prop-1']
      },
      { 
        id: 'v1-2', versionNumber: 2, createdAt: '2023-01-10', author: USERS['bob'], content: DUMMY_CONTRACT_CONTENT_V2, fileName: 'ACME_MSA_v2_redline.pdf',
        value: 250000, startDate: '2023-01-15', endDate: '2025-01-14', renewalDate: '2025-01-14', frequency: ContractFrequency.ANNUALLY, property: MOCK_PROPERTIES['prop-1']
      },
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
    property: MOCK_PROPERTIES['prop-2'],
    owner: USERS['bob'],
    startDate: '2024-08-01',
    endDate: '2025-02-01',
    renewalDate: '2025-02-01',
    value: 75000,
    frequency: ContractFrequency.MONTHLY,
    // FIX: Add missing 'allocation' property
    allocation: 'single',
    versions: [
        { 
            id: 'v2-1', versionNumber: 1, createdAt: '2024-07-20', author: USERS['diana'], content: DUMMY_CONTRACT_CONTENT_V1, fileName: 'Globex_SOW_v1.pdf',
            value: 75000, startDate: '2024-08-01', endDate: '2025-02-01', renewalDate: '2025-02-01', frequency: ContractFrequency.MONTHLY, property: MOCK_PROPERTIES['prop-2']
        }
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
    property: MOCK_PROPERTIES['prop-1'],
    owner: USERS['diana'],
    startDate: '2024-09-01',
    endDate: '2025-08-31',
    renewalDate: '2025-08-31',
    value: 120000,
    frequency: ContractFrequency.ANNUALLY,
    // FIX: Add missing 'allocation' property
    allocation: 'single',
    versions: [
        { 
            id: 'v5-1', versionNumber: 1, createdAt: '2024-07-28', author: USERS['diana'], content: DUMMY_CONTRACT_CONTENT_V1, fileName: 'Cyberdyne_Vendor_Initial_Draft.pdf',
            value: 120000, startDate: '2024-09-01', endDate: '2025-08-31', renewalDate: '2025-08-31', frequency: ContractFrequency.ANNUALLY, property: MOCK_PROPERTIES['prop-1']
        }
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
    frequency: ContractFrequency.ANNUALLY,
    // FIX: Add missing 'allocation' property
    allocation: 'portfolio',
    versions: [
        { 
            id: 'v3-1', versionNumber: 1, createdAt: '2024-07-25', author: USERS['diana'], content: 'This is a standard Non-Disclosure Agreement...',
            value: 0, startDate: '2024-07-25', endDate: '2026-07-24', renewalDate: '2026-07-24', frequency: ContractFrequency.ANNUALLY
        }
    ],
    approvalSteps: [],
  },
  {
    id: 'contract-004',
    title: 'SaaS Subscription - CloudService Pro',
    type: ContractType.SAAS,
    status: ContractStatus.FULLY_SIGNED,
    riskLevel: RiskLevel.LOW,
    counterparty: { id: 'cp-4', name: 'CloudService Pro', type: CounterpartyType.VENDOR, addressLine1: '789 Cloud Ave', city: 'Tech City', state: 'CA', zipCode: '94000', country: 'USA' },
    owner: USERS['alice'],
    startDate: '2024-06-01',
    endDate: '2025-05-31',
    renewalDate: '2025-05-31',
    value: 12000,
    frequency: ContractFrequency.ANNUALLY,
    // FIX: Add missing 'allocation' property
    allocation: 'portfolio',
    versions: [
      { 
        id: 'v4-1', versionNumber: 1, createdAt: '2024-05-20', author: USERS['alice'], content: DUMMY_CONTRACT_CONTENT_V1, fileName: 'CloudService_SaaS_Agreement.pdf',
        value: 12000, startDate: '2024-06-01', endDate: '2025-05-31', renewalDate: '2025-05-31', frequency: ContractFrequency.ANNUALLY
      },
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
    property: MOCK_PROPERTIES['prop-3'],
    owner: USERS['charlie'],
    startDate: '2024-10-01',
    endDate: '2029-09-30',
    renewalDate: '2029-09-30',
    value: 5000000,
    frequency: ContractFrequency.MONTHLY,
    // FIX: Add missing 'allocation' property
    allocation: 'single',
    versions: [
        { 
            id: 'v6-1', versionNumber: 1, createdAt: '2024-07-29', author: USERS['charlie'], content: DUMMY_CONTRACT_CONTENT_V1,
            value: 5000000, startDate: '2024-10-01', endDate: '2029-09-30', renewalDate: '2029-09-30', frequency: ContractFrequency.MONTHLY, property: MOCK_PROPERTIES['prop-3']
        }
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
    content: DUMMY_CONTRACT_CONTENT_V1,
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
    content: DUMMY_CONTRACT_CONTENT_V1.replace('Master Services Agreement', 'Vendor Agreement'),
  }
];

const adminPermissions: PermissionSet = {
    contracts: { view: true, edit: true, approve: true, delete: true },
    counterparties: { view: true, edit: true },
    properties: { view: true, edit: true },
    notifications: { view: true, configure: true },
    settings: { access: true, edit: true },
};

const legalPermissions: PermissionSet = {
    ...adminPermissions,
    settings: { access: true, edit: false },
};

const financePermissions: PermissionSet = {
    contracts: { view: true, edit: false, approve: true, delete: false },
    counterparties: { view: true, edit: false },
    properties: { view: true, edit: false },
    notifications: { view: true, configure: false },
    settings: { access: false, edit: false },
};

const requestorPermissions: PermissionSet = {
    contracts: { view: true, edit: false, approve: false, delete: false },
    counterparties: { view: false, edit: false },
    properties: { view: false, edit: false },
    notifications: { view: false, configure: false },
    settings: { access: false, edit: false },
};


export const MOCK_ROLES: Role[] = [
    { id: 'role-1', name: 'Admin', description: 'Has full access to all system features.', userCount: 1, permissions: adminPermissions },
    { id: 'role-2', name: 'Legal Counsel', description: 'Can manage contracts and approvals.', userCount: 1, permissions: legalPermissions },
    { id: 'role-3', name: 'Finance Manager', description: 'Can view contracts and approve financial aspects.', userCount: 4, permissions: financePermissions },
    { id: 'role-4', name: 'Sales Director', description: 'Can initiate and view sales-related contracts.', userCount: 8, permissions: requestorPermissions },
    { id: 'role-5', name: 'Requestor', description: 'Can view contracts they own or are involved in.', userCount: 12, permissions: requestorPermissions },
];

export const MOCK_FULL_USER_LIST: FullUserProfile[] = [
    ...Object.values(USERS),
    { id: 'user-5', firstName: 'Eve', lastName: 'Adams', email: 'eve.a@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=user-5', role: 'Finance Manager', status: 'active', lastLogin: '2024-07-30' },
    { id: 'user-6', firstName: 'Frank', lastName: 'Miller', email: 'frank.m@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=user-6', role: 'Sales Director', status: 'active', lastLogin: '2024-07-28' },
    { id: 'user-7', firstName: 'Grace', lastName: 'Lee', email: 'grace.l@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=user-7', role: 'Requestor', status: 'active', lastLogin: '2024-07-29' },
    { id: 'user-8', firstName: 'Henry', lastName: 'Wilson', email: 'henry.w@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=user-8', role: 'Finance Manager', status: 'inactive', lastLogin: '2024-05-20' },
    { id: 'user-9', firstName: 'Ivy', lastName: 'Chen', email: 'ivy.c@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=user-9', role: 'Sales Director', status: 'active', lastLogin: '2024-07-25' },
    { id: 'user-10', firstName: 'Jack', lastName: 'Taylor', email: 'jack.t@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=user-10', role: 'Requestor', status: 'active', lastLogin: '2024-07-30' },
    { id: 'user-11', firstName: 'Karen', lastName: 'Rodriguez', email: 'karen.r@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=user-11', role: 'Finance Manager', status: 'active', lastLogin: '2024-07-29' },
    { id: 'user-12', firstName: 'Leo', lastName: 'Martinez', email: 'leo.m@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=user-12', role: 'Admin', status: 'active', lastLogin: '2024-07-30' },
];

export const MOCK_NOTIFICATION_SETTINGS: NotificationSetting[] = [
    { id: 'notif-1', type: 'Contract Renewal Reminders', description: 'Get notified 90, 60, and 30 days before a contract expires.', email: true, inApp: true, sms: false },
    { id: 'notif-2', type: 'Approval Requests', description: 'Receive an alert when your approval is required on a contract.', email: true, inApp: true, sms: true },
    { id: 'notif-3', type: 'New User Signups', description: 'Admin-only notification for when a new user joins the organization.', email: true, inApp: false, sms: false },
    { id: 'notif-4', type: 'System Alerts', description: 'Receive important updates about system maintenance or new features.', email: false, inApp: true, sms: false },
];

export const MOCK_USER_NOTIFICATION_SETTINGS: UserNotificationSettings = {
    id: 'user-notif-1',
    userId: 'user-1',
    renewals: { email: true, inApp: true },
    approvals: { email: true, inApp: true },
    tasks: { email: false, inApp: true },
    system: { email: false, inApp: true },
};