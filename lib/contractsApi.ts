import { supabase } from '../lib/supabaseClient';
import type { Contract, ContractVersion, Comment, UserProfile, Counterparty, Property, ApprovalStep, ContractPropertyAllocation, RenewalRequest, AuditLog, RenewalFeedback } from '../types';
import { RenewalMode } from '../types';

export interface ContractsPage {
  items: (Partial<Contract> & { id: string, counterparty: Counterparty })[];
  total: number;
}

// Mappers from DB snake_case to JS camelCase types
const mapUserFromDb = (u: any): UserProfile | undefined => u ? ({
    id: u.id, firstName: u.first_name, lastName: u.last_name, email: u.email, phone: u.phone,
    jobTitle: u.job_title, department: u.department, avatarUrl: u.avatar_url,
    role: u.role?.name || u.roles?.name || 'Unknown', roleId: u.role_id, status: u.status,
    lastLogin: u.last_login, companyId: u.company_id, appId: u.app_id,
}) : undefined;

const mapCounterpartyFromDb = (c: any): Counterparty | undefined => c ? ({
    id: c.id, name: c.name, type: c.type, addressLine1: c.address_line1, addressLine2: c.address_line2,
    city: c.city, state: c.state, zipCode: c.zip_code, country: c.country,
    contactName: c.contact_name, contactEmail: c.contact_email, contactPhone: c.contact_phone
}) : undefined;

const mapPropertyFromDb = (p: any): Property | undefined => p ? ({
    id: p.id, name: p.name, addressLine1: p.address_line1, addressLine2: p.address_line2,
    city: p.city, state: p.state, country: p.country, zipCode: p.zip_code
}) : undefined;

export async function fetchContractsPage(
  companyId: string,
  page: number,
  pageSize: number,
  filters: { status?: Set<string>; search?: string; type?: string; risk?: string; frequency?: string; ownerId?: string; },
  sort: { key: string; direction: 'asc' | 'desc' }
): Promise<ContractsPage> {
  let query = supabase
    .from('contracts')
    .select('*, counterparty:counterparties!inner(*)', { count: 'exact' })
    .eq('company_id', companyId);

  if (filters.status && filters.status.size > 0) {
    query = query.in('status', Array.from(filters.status));
  }
  if (filters.search) {
    // Using actual table name 'counterparties' for safer filtering on joined tables, rather than alias
    query = query.or(`title.ilike.%${filters.search}%,counterparties.name.ilike.%${filters.search}%`);
  }
  if (filters.type) {
    query = query.eq('type', filters.type);
  }
  if (filters.risk) {
    if (filters.risk === 'HighAndCritical') {
        query = query.in('risk_level', ['High', 'Critical']);
    } else {
        query = query.eq('risk_level', filters.risk);
    }
  }
  if (filters.frequency) {
    query = query.eq('frequency', filters.frequency);
  }
  if (filters.ownerId) {
    query = query.eq('owner_id', filters.ownerId);
  }

  const sortKey = sort.key === 'counterparty' ? 'name' : sort.key === 'endDate' ? 'end_date' : sort.key === 'updatedAt' ? 'updated_at' : sort.key;
  
  query = query.order(sortKey, { ascending: sort.direction === 'asc', foreignTable: sort.key === 'counterparty' ? 'counterparty' : undefined });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.range(from, to);
  if (error) {
    console.error("Error fetching contracts page:", error);
    throw error;
  }
  
  return {
    items: (data || []).map(row => ({
      id: row.id,
      title: row.title,
      type: row.type,
      status: row.status,
      value: row.value,
      endDate: row.end_date,
      counterparty: mapCounterpartyFromDb(row.counterparty)!,
    })),
    total: count ?? 0,
  };
}

export async function fetchContractDetail(contractId: string): Promise<Contract | null> {
  const { data: contractData, error: contractError } = await supabase
    .from('contracts')
    .select('*, counterparty:counterparties(*), property:properties(*), owner:users(*, role:roles(name))')
    .eq('id', contractId)
    .single();

  if (contractError) {
    console.error(`Error fetching contract ${contractId}:`, contractError);
    return null;
  }
  if (!contractData) return null;

  const [versionsRes, approvalsRes, allocationsRes, renewalsRes, auditsRes] = await Promise.all([
    supabase.from('contract_versions').select('*, author:users(*, role:roles(name)), property:properties(*)').eq('contract_id', contractId),
    supabase.from('approval_steps').select('*, approver:users(*, role:roles(name))').eq('contract_id', contractId),
    supabase.from('contract_property_allocations').select('*').eq('contract_id', contractId),
    supabase.from('renewal_requests').select('*, renewalOwner:users(*, role:roles(name))').eq('contract_id', contractId),
    supabase.from('audit_logs').select('*, user:users(*)').eq('related_entity_id', contractId).eq('related_entity_type', 'contract'),
  ]);

  if (versionsRes.error || approvalsRes.error || allocationsRes.error || renewalsRes.error || auditsRes.error) {
    console.error("Error fetching related contract data", {
      versionsError: versionsRes.error,
      approvalsError: approvalsRes.error,
      allocationsError: allocationsRes.error,
      renewalsError: renewalsRes.error,
      auditsError: auditsRes.error,
    });
    return null; // or handle partial data
  }

  const versionIds = (versionsRes.data || []).map(v => v.id);
  const { data: commentsData } = versionIds.length > 0 ? await supabase.from('comments').select('*, author:users(*, role:roles(name))').in('version_id', versionIds) : { data: [] };
  
  const renewalRequestIds = (renewalsRes.data || []).map(r => r.id);
  const { data: feedbackData } = renewalRequestIds.length > 0 ? await supabase.from('renewal_feedback').select('*, user:users(*, role:roles(name))').in('renewal_request_id', renewalRequestIds) : { data: [] };

  const commentsByVersionId = (commentsData || []).reduce((acc, c) => {
    (acc[c.version_id] = acc[c.version_id] || []).push({ ...c, author: mapUserFromDb(c.author)!, resolvedAt: c.resolved_at, versionId: c.version_id, createdAt: c.created_at } as Comment);
    return acc;
  }, {} as { [key: string]: Comment[] });
  
  const feedbackByRenewalId = (feedbackData || []).reduce((acc, f) => {
    (acc[f.renewal_request_id] = acc[f.renewal_request_id] || []).push({ ...f, user: mapUserFromDb(f.user)! } as RenewalFeedback);
    return acc;
  }, {} as { [key: string]: RenewalFeedback[] });

  const renewalRequest = renewalsRes.data?.[0];

  const fullContract: Contract = {
    id: contractData.id,
    title: contractData.title,
    type: contractData.type,
    status: contractData.status,
    riskLevel: contractData.risk_level,
    counterparty: mapCounterpartyFromDb(contractData.counterparty)!,
    property: mapPropertyFromDb(contractData.property),
    owner: mapUserFromDb(contractData.owner)!,
    effectiveDate: contractData.effective_date,
    endDate: contractData.end_date,
    value: contractData.value,
    frequency: contractData.frequency,
    seasonalMonths: contractData.seasonal_months,
    allocation: contractData.allocation,
    propertyAllocations: (allocationsRes.data || []).map(a => ({ ...a, propertyId: a.property_id, allocatedValue: a.allocated_value, monthlyValues: a.monthly_values, manualEdits: a.manual_edits })),
    versions: (versionsRes.data || []).map(v => ({...v, versionNumber: v.version_number, createdAt: v.created_at, author: mapUserFromDb(v.author)!, comments: commentsByVersionId[v.id] || [], property: mapPropertyFromDb(v.property), fileName: v.file_name, storagePath: v.storage_path, effectiveDate: v.effective_date, endDate: v.end_date, seasonalMonths: v.seasonal_months})).sort((a,b) => a.versionNumber - b.versionNumber),
    approvalSteps: (approvalsRes.data || []).map(a => ({ ...a, approver: mapUserFromDb(a.approver)!, approvedAt: a.approved_at })),
    submittedAt: contractData.submitted_at,
    reviewStartedAt: contractData.review_started_at,
    approvalStartedAt: contractData.approval_started_at,
    approvalCompletedAt: contractData.approval_completed_at,
    sentForSignatureAt: contractData.sent_for_signature_at,
    executedAt: contractData.executed_at,
    activeAt: contractData.active_at,
    expiredAt: contractData.expired_at,
    archivedAt: contractData.archived_at,
    updatedAt: contractData.updated_at,
    draftVersionId: contractData.draft_version_id,
    executedVersionId: contractData.executed_version_id,
    startDate: contractData.start_date,
    autoRenew: contractData.auto_renew,
    noticePeriodDays: contractData.notice_period_days,
    renewalTermMonths: contractData.renewal_term_months,
    upliftPercent: contractData.uplift_percent,
    parentContractId: contractData.parent_contract_id,
    signingStatus: contractData.signing_status,
    signingStatusUpdatedAt: contractData.signing_status_updated_at,
    renewalRequest: renewalRequest ? { ...renewalRequest, renewalOwner: mapUserFromDb(renewalRequest.renewalOwner), feedback: feedbackByRenewalId[renewalRequest.id] || [], contractId: renewalRequest.contract_id, companyId: renewalRequest.company_id } as RenewalRequest : undefined,
    auditLogs: (auditsRes.data || []).map(a => ({...a, user: mapUserFromDb(a.user)}) as AuditLog[])
  };

  return fullContract;
}