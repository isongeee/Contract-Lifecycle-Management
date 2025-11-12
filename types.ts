import { GoogleGenAI } from "@google/genai";
import React from 'react';

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
  FULLY_EXECUTED = 'Fully Executed',
  ACTIVE = 'Active',
  EXPIRED = 'Expired',
  TERMINATED = 'Terminated',
  ARCHIVED = 'Archived',
  SUPERSEDED = 'Superseded',
}

export enum SigningStatus {
  AWAITING_INTERNAL = 'Awaiting Internal Signature',
  SENT_TO_COUNTERPARTY = 'Sent to Counterparty',
  VIEWED_BY_COUNTERPARTY = 'Viewed by Counterparty',
  SIGNED_BY_COUNTERPARTY = 'Signed by Counterparty',
}


export enum RenewalStatus {
    DECISION_NEEDED = 'decision_needed',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'activated',
    CANCELLED = 'cancelled',
}

export enum AutoRenewType {
    NONE = 'none',
    EVERGREEN = 'evergreen',
    FIXED = 'fixed',
}

export enum RenewalMode {
    PENDING = 'pending',
    AUTO = 'auto',
    AMENDMENT = 'amendment',
    NEW_CONTRACT = 'new_contract',
    TERMINATE = 'terminate',
    RENEW_AS_IS = 'renew_as_is',
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

export enum ContractFrequency {
    MONTHLY = 'Monthly',
    QUARTERLY = 'Quarterly',
    ANNUALLY = 'Annually',
    SEASONAL = 'Seasonal',
}

export enum CounterpartyType {
  CUSTOMER = 'Customer',
  VENDOR = 'Vendor',
  PARTNER = 'Partner',
  SUPPLIER = 'Supplier',
  CONTRACTOR = 'Contractor',
}

export type AllocationType = 'single' | 'multi' | 'portfolio';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  avatarUrl: string;
  role: string; // e.g. 'Admin', 'Legal Counsel'
  roleId?: string;
  status: 'active' | 'inactive';
  lastLogin: string;
  companyId?: string;
  appId?: string;
}

export interface Counterparty {
  id: string;
  name:string;
  type: CounterpartyType;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface Property {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

export interface ApprovalStep {
  id: string;
  approver: UserProfile;
  status: ApprovalStatus;
  comment?: string;
  approvedAt?: string;
  versionId: string;
}

export interface Comment {
  id: string;
  createdAt: string;
  content: string;
  author: UserProfile;
  resolvedAt?: string;
  versionId: string;
}

export interface ContractVersion {
  id: string;
  versionNumber: number;
  createdAt: string;
  author: UserProfile;
  content: string;
  fileName?: string;
  // Snapshot of commercial terms for this version
  value: number;
  effectiveDate: string;
  endDate: string;
  renewalDate?: string;
  frequency: ContractFrequency;
  seasonalMonths?: string[];
  property?: Property;
  comments?: Comment[];
}

export interface Clause {
  id: string;
  title: string;
  content: string;
  summary: string;
}

export interface ContractPropertyAllocation {
    id: string;
    propertyId?: string;
    allocatedValue: number;
    monthlyValues?: { [month: string]: number };
    manualEdits?: { [month: string]: boolean };
}

export interface AuditLog {
    id: string;
    createdAt: string;
    user?: UserProfile;
    relatedEntityType: 'contract' | 'renewal_request';
    changeType: 'status' | 'renewal_status';
    oldValue?: string;
    newValue?: string;
}

export interface RenewalFeedback {
    id: string;
    renewalRequestId: string;
    user: UserProfile;
    feedback: string;
    createdAt: string;
}

export interface RenewalRequest {
    id: string;
    contractId: string;
    companyId: string;
    renewalOwner?: UserProfile;
    mode: RenewalMode;
    status: RenewalStatus;
    noticeDeadline?: string;
    internalDecisionDeadline?: string;
    upliftPercent?: number;
    notes?: string;
    feedback?: RenewalFeedback[];
    renewalTermMonths?: number;
    noticePeriodDays?: number;
    // Fields for new SQL function
    path?: 'as_is' | 'amend' | 'renegotiate';
    decision?: 'proceed' | 'non_renew';
    reasonCode?: string;
}

export interface Contract {
  id: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  riskLevel: RiskLevel;
  counterparty: Counterparty;
  property?: Property;
  owner: UserProfile;
  effectiveDate: string;
  endDate: string;
  value: number;
  frequency: ContractFrequency;
  seasonalMonths?: string[];
  versions: ContractVersion[];
  approvalSteps: ApprovalStep[];
  allocation: AllocationType;
  propertyAllocations?: ContractPropertyAllocation[];
  submittedAt?: string;
  reviewStartedAt?: string;
  approvalStartedAt?: string;
  approvalCompletedAt?: string;
  sentForSignatureAt?: string;
  executedAt?: string;
  activeAt?: string;
  expiredAt?: string;
  archivedAt?: string;
  updatedAt?: string;
  draftVersionId?: string;
  executedVersionId?: string;
  
  // Optional analysis fields
  extractedClauses?: Clause[];
  riskSummary?: string;

  // Renewal Fields from new migration
  startDate?: string;
  autoRenew?: AutoRenewType;
  noticePeriodDays?: number;
  renewalTermMonths?: number;
  upliftPercent?: number;
  parentContractId?: string;
  
  // E-Signature fields
  signingStatus?: SigningStatus;
  signingStatusUpdatedAt?: string;

  // Associated data
  renewalRequest?: RenewalRequest;
  auditLogs?: AuditLog[];
}

export interface Notification {
  id: string;
  created_at: string;
  user_id: string;
  type: 'APPROVAL_REQUEST' | 'APPROVAL_RESPONSE' | 'COMMENT_MENTION' | 'RENEWAL_REMINDER' | 'STATUS_CHANGE' | 'SIGNING_PROGRESS' | 'NEW_VERSION';
  message: string;
  is_read: boolean;
  related_entity_type?: 'contract';
  related_entity_id?: string;
}

export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  type: ContractType;
  content: string;
}

export interface PermissionSet {
  contracts: { view: boolean; edit: boolean; approve: boolean; delete: boolean; };
  counterparties: { view: boolean; edit: boolean; };
  properties: { view: boolean; edit: boolean; };
  notifications: { view: boolean; configure: boolean; };
  settings: { access: boolean; edit: boolean; };
}

export interface Role {
  id: string;
  name: string;
  description: string;
  userCount: number;
  permissions: PermissionSet;
}

export interface NotificationSetting {
  id: string;
  type: string;
  description: string;
  email: boolean;
  inApp: boolean;
  sms: boolean;
}

export interface UserNotificationSettings {
  id: string;
  userId: string;
  renewalDaysBefore: number[];
  preferences: {
    renewals: { email: boolean; inApp: boolean };
    approvals: { email: boolean; inApp: boolean };
    tasks: { email: boolean; inApp: boolean };
    system: { email: boolean; inApp: boolean };
  };
}

export interface ReviewChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface SearchResult {
  contractId: string;
  contractTitle: string;
  counterpartyName: string;
  versionId: string;
  versionNumber: number;
  snippet: string;
}

export interface ReportConfiguration {
  id: string;
  type: 'expiring_by_quarter' | 'value_by_counterparty' | 'lifecycle_duration' | 'clause_analysis';
  title: string;
  description: string;
}