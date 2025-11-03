
export enum ContractType {
  NDA = 'NDA',
  MSA = 'MSA',
  SOW = 'SOW',
  VENDOR = 'Vendor',
  EMPLOYMENT = 'Employment',
  LEASE = 'Lease',
  SAAS = 'SaaS',
  OTHER = 'Other',
}

export enum ContractStatus {
  DRAFT = 'Draft',
  IN_REVIEW = 'In Review',
  PENDING_APPROVAL = 'Pending Approval',
  APPROVED = 'Approved',
  SENT_FOR_SIGNATURE = 'Sent for Signature',
  FULLY_SIGNED = 'Fully Signed',
  ACTIVE = 'Active',
  EXPIRED = 'Expired',
  TERMINATED = 'Terminated',
  ARCHIVED = 'Archived',
}

export enum ApprovalStatus {
  PENDING = 'Pending',
  REQUESTED_CHANGES = 'Requested Changes',
  REJECTED = 'Rejected',
  APPROVED = 'Approved',
}

export enum RiskLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical',
}

export interface UserProfile {
  id: string;
  name: string;
  avatarUrl: string;
  role: string;
}

export interface Counterparty {
  id: string;
  name:string;
  address: string;
}

export interface ApprovalStep {
  id: string;
  approver: UserProfile;
  status: ApprovalStatus;
  comment?: string;
  approvedAt?: string;
}

export interface ContractVersion {
  id: string;
  versionNumber: number;
  createdAt: string;
  author: UserProfile;
  content: string;
}

export interface Clause {
  id: string;
  title: string;
  content: string;
  summary: string;
}

export interface Contract {
  id: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  riskLevel: RiskLevel;
  counterparty: Counterparty;
  owner: UserProfile;
  startDate: string;
  endDate: string;
  renewalDate: string;
  value: number;
  versions: ContractVersion[];
  approvalSteps: ApprovalStep[];
  extractedClauses?: Clause[];
  riskSummary?: string;
}

export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  type: ContractType;
  content: string;
}
