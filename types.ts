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
  startDate: string;
  endDate: string;
  renewalDate: string;
  frequency: ContractFrequency;
  seasonalMonths?: string[];
  property?: Property;
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

export interface Contract {
  id: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  riskLevel: RiskLevel;
  counterparty: Counterparty;
  property?: Property;
  owner: UserProfile;
  startDate: string;
  endDate: string;
  renewalDate: string;
  value: number;
  frequency: ContractFrequency;
  seasonalMonths?: string[];
  versions: ContractVersion[];
  approvalSteps: ApprovalStep[];
  extractedClauses?: Clause[];
  riskSummary?: string;
  allocation: AllocationType;
  propertyAllocations?: ContractPropertyAllocation[];
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
  renewals: { email: boolean; inApp: boolean };
  approvals: { email: boolean; inApp: boolean };
  tasks: { email: boolean; inApp: boolean };
  system: { email: boolean; inApp: boolean };
}