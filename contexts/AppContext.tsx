import React, { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import type { Contract, ContractTemplate, Counterparty, Property, ContractStatus as ContractStatusType, ContractVersion, UserProfile, Role, NotificationSetting, UserNotificationSettings, AllocationType, PermissionSet, AuditLog, RenewalRequest, RenewalStatus, SigningStatus, Notification, Comment, RenewalFeedback, SearchResult } from '../types';
import { ContractStatus, RiskLevel, ApprovalStatus, RenewalStatus as RenewalStatusEnum, RenewalMode, SigningStatus as SigningStatusEnum } from '../types';
import { MOCK_NOTIFICATION_SETTINGS, MOCK_USER_NOTIFICATION_SETTINGS, requestorPermissions } from '../constants';
import { supabase } from '../lib/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { getUserProfile, signOut, adminCreateUser } from '../lib/auth';

type ContractAction = ContractStatus | 'APPROVE_STEP' | 'REJECT_STEP';

export interface AppContextType {
    // Auth State
    session: Session | null;
    currentUser: UserProfile | null;
    company: { id: string; name: string; slug: string; } | null;
    isAuthenticated: boolean;
    authView: 'login' | 'org-signup' | 'user-signup';
    setAuthView: React.Dispatch<React.SetStateAction<'login' | 'org-signup' | 'user-signup'>>;
    handleLogin: () => void;
    handleLogout: () => Promise<void>;

    // UI State
    isLoading: boolean;
    activeView: string;
    theme: 'light' | 'dark' | 'system';
    handleThemeChange: (newTheme: 'light' | 'dark' | 'system') => void;
    handleNavigate: (view: string) => void;
    handleMetricNavigation: (metric: 'active' | 'pending' | 'high-risk' | 'my-contracts') => void;

    // Data State
    contracts: Contract[];
    templates: ContractTemplate[];
    counterparties: Counterparty[];
    properties: Property[];
    users: UserProfile[];
    roles: Role[];
    notifications: Notification[];
    notificationSettings: NotificationSetting[];
    userNotificationSettings: UserNotificationSettings;
    unreadCount: number;

    // Page/Selection State
    selectedContract: Contract | null;
    selectedTemplate: ContractTemplate | null;
    selectedCounterparty: Counterparty | null;
    selectedProperty: Property | null;
    initialFilters: { status?: ContractStatusType; riskLevels?: RiskLevel[]; ownerId?: string };

    // Modal State & Handlers
    isCreatingContract: boolean;
    initialCreateData: Partial<Contract> & { content?: string } | null;
    isCreatingCounterparty: boolean;
    isCreatingProperty: boolean;
    editingCounterparty: Counterparty | null;
    editingProperty: Property | null;
    isAddingUser: boolean;
    setIsAddingUser: React.Dispatch<React.SetStateAction<boolean>>;
    handleStartCreate: (initialData?: Partial<Contract> & { content?: string } | null) => void;
    handleCancelCreate: () => void;
    handleStartCreateCounterparty: () => void;
    handleCancelCreateCounterparty: () => void;
    handleStartEditCounterparty: (counterparty: Counterparty) => void;
    handleCancelEditCounterparty: () => void;
    handleStartCreateProperty: () => void;
    handleCancelCreateProperty: () => void;
    handleStartEditProperty: (property: Property) => void;
    handleCancelEditProperty: () => void;
    handleUseTemplate: (template: ContractTemplate) => void;

    // Data Mutation Handlers
    handleFinalizeCreate: (newContractData: Partial<Contract> & { propertyAllocations?: any[] }) => Promise<void>;
    handleFinalizeCreateCounterparty: (newCounterpartyData: Omit<Counterparty, "id">) => Promise<void>;
    handleFinalizeEditCounterparty: (data: Partial<Counterparty>) => Promise<void>;
    handleFinalizeCreateProperty: (newPropertyData: Omit<Property, "id">) => Promise<void>;
    handleFinalizeEditProperty: (data: Partial<Property>) => Promise<void>;
    handleContractTransition: (contractId: string, action: ContractAction, payload?: any) => Promise<void>;
    handleSigningStatusUpdate: (contractId: string, newStatus: SigningStatus) => Promise<void>;
    handleMarkAsExecuted: (contractId: string) => void;
    handleRenewalDecision: (renewalRequestId: string, mode: RenewalMode, notes?: string) => Promise<void>;
    handleStartRenegotiation: (originalContract: Contract, notes?: string) => Promise<void>;
    handleCreateRenewalRequest: (contract: Contract) => Promise<void>;
    handleUpdateRenewalTerms: (renewalRequestId: string, updatedTerms: { renewalTermMonths: number; noticePeriodDays: number; upliftPercent: number; }) => Promise<void>;
    handleRenewAsIs: (contract: Contract, notes?: string) => Promise<void>;
    handleCreateNewVersion: (contractId: string, newVersionData: Omit<ContractVersion, "id" | "versionNumber" | "createdAt" | "author">) => Promise<void>;
    handleUpdateRolePermissions: (roleId: string, newPermissions: PermissionSet) => Promise<void>;
    handleCreateRole: (name: string, description: string) => Promise<void>;
    handleDeleteRole: (roleId: string) => Promise<void>;
    handleCreateComment: (versionId: string, content: string) => Promise<void>;
    handleResolveComment: (commentId: string, isResolved: boolean) => Promise<void>;
    handleCreateRenewalFeedback: (renewalRequestId: string, feedbackText: string) => Promise<void>;
    handleMarkAllAsRead: () => Promise<void>;
    handleMarkOneAsRead: (notificationId: string) => Promise<void>;
    handleNotificationClick: (notification: Notification) => void;
    handleCreateUser: (userData: any) => Promise<void>;
    
    // Selection Handlers
    handleSelectContract: (contract: Contract) => void;
    handleBackToList: () => void;
    handleSelectTemplate: (template: ContractTemplate) => void;
    handleBackToTemplatesList: () => void;
    handleSelectCounterparty: (counterparty: Counterparty) => void;
    handleBackToCounterpartiesList: () => void;
    handleSelectProperty: (property: Property) => void;
    handleBackToPropertiesList: () => void;

    // Global Search
    isPerformingGlobalSearch: boolean;
    globalSearchResults: SearchResult[];
    globalSearchTerm: string;
    handleGlobalSearch: (term: string) => Promise<void>;

    setNotificationSettings: React.Dispatch<React.SetStateAction<NotificationSetting[]>>;
    setUserNotificationSettings: React.Dispatch<React.SetStateAction<UserNotificationSettings>>;
    setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
}


const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>(MOCK_NOTIFICATION_SETTINGS);
  const [userNotificationSettings, setUserNotificationSettings] = useState<UserNotificationSettings>(MOCK_USER_NOTIFICATION_SETTINGS);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [selectedCounterparty, setSelectedCounterparty] = useState<Counterparty | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [isCreatingContract, setIsCreatingContract] = useState(false);
  const [initialCreateData, setInitialCreateData] = useState<Partial<Contract> & { content?: string } | null>(null);
  const [isCreatingCounterparty, setIsCreatingCounterparty] = useState(false);
  const [isCreatingProperty, setIsCreatingProperty] = useState(false);
  const [editingCounterparty, setEditingCounterparty] = useState<Counterparty | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [initialFilters, setInitialFilters] = useState<{ status?: ContractStatusType; riskLevels?: RiskLevel[]; ownerId?: string }>({});
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  
  // Auth State
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<{ id: string; name: string; slug: string; } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'org-signup' | 'user-signup'>('login');

  // Global Search State
  const [isPerformingGlobalSearch, setIsPerformingGlobalSearch] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState<SearchResult[]>([]);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

  const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setSession(session);
        setIsAuthenticated(!!session);
        if (session?.user) {
            const profile = await getUserProfile(session.user.id);
            setCurrentUser(profile);
            if (!profile) {
              await signOut();
            }
        } else {
            setCurrentUser(null);
            setCompany(null);
            setContracts([]);
            setCounterparties([]);
            setProperties([]);
            setUsers([]);
            setRoles([]);
            setNotifications([]);
            setTemplates([]);
        }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
        setSession(session);
        setIsAuthenticated(!!session);
        if (session?.user) {
            const profile = await getUserProfile(session.user.id);
            setCurrentUser(profile);
            if (!profile) {
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    });

    return () => subscription.unsubscribe();
  }, []);


  const fetchData = useCallback(async (user: UserProfile) => {
    if (!user || !user.companyId) {
        setContracts([]);
        setCounterparties([]);
        setProperties([]);
        setUsers([]);
        setRoles([]);
        setNotifications([]);
        setTemplates([]);
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    const companyId = user.companyId;

    const { data: companyData } = await supabase.from('companies').select('id, name, slug').eq('id', companyId).single();
    setCompany(companyData);

    const { data: usersData } = await supabase.from('users').select('*').eq('company_id', companyId);
    const userCountsByRole = (usersData || []).reduce((acc, user) => {
        if (user.role_id) acc[user.role_id] = (acc[user.role_id] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const { data: rolesData } = await supabase.from('roles').select('*').eq('company_id', companyId);
    setRoles((rolesData || []).map(r => ({ ...r, userCount: userCountsByRole[r.id] || 0, permissions: r.permissions as any })).sort((a, b) => a.name.localeCompare(b.name)));
    const rolesMap = new Map((rolesData || []).map(r => [r.id, r.name]));
    
    const mappedUsers: UserProfile[] = (usersData || []).map(u => ({
        id: u.id, firstName: u.first_name, lastName: u.last_name, email: u.email, phone: u.phone,
        jobTitle: u.job_title, department: u.department, avatarUrl: u.avatar_url,
        role: rolesMap.get(u.role_id) || 'Unknown', roleId: u.role_id, status: u.status as any,
        lastLogin: u.last_login, companyId: u.company_id, appId: u.app_id,
    }));
    const usersMap = new Map(mappedUsers.map(u => [u.id, u]));
    setUsers(mappedUsers);
    
    const { data: counterpartiesData } = await supabase.from('counterparties').select('*').eq('company_id', companyId);
    const mappedCounterparties: Counterparty[] = (counterpartiesData || []).map(c => ({
        id: c.id, name: c.name, type: c.type, addressLine1: c.address_line1, addressLine2: c.address_line2,
        city: c.city, state: c.state, zipCode: c.zip_code, country: c.country,
        contactName: c.contact_name, contactEmail: c.contact_email, contactPhone: c.contact_phone
    }));
    const counterpartiesMap = new Map(mappedCounterparties.map(c => [c.id, c]));
    setCounterparties(mappedCounterparties);

    const { data: propertiesData } = await supabase.from('properties').select('*').eq('company_id', companyId);
    const mappedProperties: Property[] = (propertiesData || []).map(p => ({
        id: p.id, name: p.name, addressLine1: p.address_line1, addressLine2: p.address_line2,
        city: p.city, state: p.state, country: p.country, zipCode: p.zip_code
    }));
    const propertiesMap = new Map(mappedProperties.map(p => [p.id, p]));
    setProperties(mappedProperties);
    
    const { data: notificationsData } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
    setNotifications(notificationsData as Notification[] || []);

    const { data: templatesData } = await supabase.from('contract_templates').select('*').eq('company_id', companyId);
    setTemplates(templatesData as ContractTemplate[] || []);

    const { data: contractsData } = await supabase.from('contracts').select('*').eq('company_id', companyId);
    const contractIds = (contractsData || []).map(c => c.id);
    
    const [versionsRes, approvalsRes, allocationsRes, renewalsRes, auditsRes] = await Promise.all([
        contractIds.length > 0 ? supabase.from('contract_versions').select('*').in('contract_id', contractIds) : Promise.resolve({ data: [] }),
        contractIds.length > 0 ? supabase.from('approval_steps').select('*').in('contract_id', contractIds) : Promise.resolve({ data: [] }),
        contractIds.length > 0 ? supabase.from('contract_property_allocations').select('*').in('contract_id', contractIds) : Promise.resolve({ data: [] }),
        contractIds.length > 0 ? supabase.from('renewal_requests').select('*').in('contract_id', contractIds).not('status', 'in', `("${RenewalStatusEnum.ACTIVATED}","${RenewalStatusEnum.CANCELLED}")`) : Promise.resolve({ data: [] }),
        contractIds.length > 0 ? supabase.from('audit_logs').select('*').in('related_entity_id', contractIds).eq('related_entity_type', 'renewal_request') : Promise.resolve({ data: [] })
    ]);

    const renewalRequestIds = (renewalsRes.data || []).map(r => r.id);
    const { data: feedbackData } = renewalRequestIds.length > 0 ? await supabase.from('renewal_feedback').select('*').in('renewal_request_id', renewalRequestIds) : { data: [] };
    const feedbackByRenewalId = (feedbackData || []).reduce((acc, feedback) => {
        const feedbacks = acc.get(feedback.renewal_request_id) || [];
        feedbacks.push({
            id: feedback.id,
            renewalRequestId: feedback.renewal_request_id,
            user: usersMap.get(feedback.user_id)!,
            feedback: feedback.feedback,
            createdAt: feedback.created_at,
        });
        acc.set(feedback.renewal_request_id, feedbacks);
        return acc;
    }, new Map<string, any[]>());

    const versionIds = (versionsRes.data || []).map(v => v.id);
    const { data: commentsData } = versionIds.length > 0 ? await supabase.from('comments').select('*').in('version_id', versionIds) : { data: [] };
    const commentsByVersionId = (commentsData || []).reduce((acc, comment) => {
        const versionComments = acc.get(comment.version_id) || [];
        versionComments.push({
            ...comment,
            resolvedAt: comment.resolved_at,
            versionId: comment.version_id,
            author: usersMap.get(comment.author_id)!,
            createdAt: comment.created_at
        });
        acc.set(comment.version_id, versionComments);
        return acc;
    }, new Map<string, any[]>());

    const contractsById = new Map<string, Contract>();
    for (const c of (contractsData || [])) {
      contractsById.set(c.id, {
        id: c.id, title: c.title, type: c.type, status: c.status,
        riskLevel: c.risk_level, effectiveDate: c.effective_date,
        endDate: c.end_date, value: c.value, frequency: c.frequency, allocation: c.allocation,
        seasonalMonths: c.seasonal_months, owner: usersMap.get(c.owner_id)!,
        counterparty: counterpartiesMap.get(c.counterparty_id)!,
        property: propertiesMap.get(c.property_id),
        submittedAt: c.submitted_at, reviewStartedAt: c.review_started_at,
        approvalStartedAt: c.approval_started_at, approvalCompletedAt: c.approval_completed_at,
        sentForSignatureAt: c.sent_for_signature_at, executedAt: c.executed_at,
        activeAt: c.active_at, expiredAt: c.expired_at, archivedAt: c.archived_at,
        updatedAt: c.updated_at, draftVersionId: c.draft_version_id,
        executedVersionId: c.executed_version_id,
        startDate: c.start_date, autoRenew: c.auto_renew, noticePeriodDays: c.notice_period_days,
        renewalTermMonths: c.renewal_term_months, upliftPercent: c.uplift_percent,
        parentContractId: c.parent_contract_id,
        signingStatus: c.signing_status,
        signingStatusUpdatedAt: c.signing_status_updated_at,
        versions: [], approvalSteps: [], propertyAllocations: [], auditLogs: [],
      });
    }

    for (const version of (versionsRes.data || [])) {
        const contract = contractsById.get(version.contract_id);
        const comments = commentsByVersionId.get(version.id) || [];
        if (contract) contract.versions.push({ ...version, versionNumber: version.version_number, createdAt: version.created_at, fileName: version.file_name, effectiveDate: version.effective_date, endDate: version.end_date, seasonalMonths: version.seasonal_months, author: usersMap.get(version.author_id)!, property: propertiesMap.get(version.property_id), comments });
    }
    for (const approval of (approvalsRes.data || [])) {
        const contract = contractsById.get(approval.contract_id);
        if (contract) contract.approvalSteps.push({ ...approval, approvedAt: approval.approved_at, approver: usersMap.get(approval.approver_id)! });
    }
    for (const allocation of (allocationsRes.data || [])) {
        const contract = contractsById.get(allocation.contract_id);
        if (contract) contract.propertyAllocations!.push({ ...allocation, propertyId: allocation.property_id, allocatedValue: allocation.allocated_value, monthlyValues: allocation.monthly_values, manualEdits: allocation.manual_edits });
    }
    for (const renewal of (renewalsRes.data || [])) {
        const contract = contractsById.get(renewal.contract_id);
        if (contract) {
            contract.renewalRequest = { 
                ...renewal, 
                contractId: renewal.contract_id, 
                companyId: renewal.company_id, 
                renewalOwner: usersMap.get(renewal.renewal_owner_id),
                feedback: feedbackByRenewalId.get(renewal.id) || [],
                renewalTermMonths: renewal.renewal_term_months,
                noticePeriodDays: renewal.notice_period_days,
            };
        }
    }
    for (const audit of (auditsRes.data || [])) {
        const contract = contractsById.get(audit.related_entity_id);
        if (contract) contract.auditLogs!.push({ ...audit, relatedEntityType: 'renewal_request', changeType: audit.change_type, oldValue: audit.old_value, newValue: audit.new_value, user: usersMap.get(audit.user_id) });
    }

    for (const contract of contractsById.values()) {
        contract.versions.sort((a: ContractVersion, b: ContractVersion) => a.versionNumber - b.versionNumber);
    }
    
    const allContracts = Array.from(contractsById.values());

    setContracts(allContracts);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if(currentUser) {
        fetchData(currentUser);
    }
  }, [currentUser, fetchData]);

  const usersMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
  const counterpartiesMap = useMemo(() => new Map(counterparties.map(c => [c.id, c])), [counterparties]);
  const propertiesMap = useMemo(() => new Map(properties.map(p => [p.id, p])), [properties]);

  const fetchAndMergeContract = useCallback(async (contractId: string): Promise<Contract | null> => {
    if (!currentUser || !usersMap.size || !counterpartiesMap.size || !propertiesMap.size) return null;

    const { data: contractData } = await supabase.from('contracts').select('*').eq('id', contractId).single();

    if (!contractData) {
        setContracts(prev => prev.filter(c => c.id !== contractId));
        return null;
    }

    const [versionsRes, approvalsRes, allocationsRes, renewalsRes, auditsRes] = await Promise.all([
        supabase.from('contract_versions').select('*').eq('contract_id', contractId),
        supabase.from('approval_steps').select('*').eq('contract_id', contractId),
        supabase.from('contract_property_allocations').select('*').eq('contract_id', contractId),
        supabase.from('renewal_requests').select('*').eq('contract_id', contractId).not('status', 'in', `("${RenewalStatusEnum.ACTIVATED}","${RenewalStatusEnum.CANCELLED}")`),
        supabase.from('audit_logs').select('*').eq('related_entity_id', contractId).eq('related_entity_type', 'renewal_request')
    ]);

    const versionIds = (versionsRes.data || []).map(v => v.id);
    const { data: commentsData } = versionIds.length > 0 ? await supabase.from('comments').select('*').in('version_id', versionIds) : { data: [] };
    const commentsByVersionId = (commentsData || []).reduce((acc, comment) => {
        const items = acc.get(comment.version_id) || [];
        items.push({ ...comment, author: usersMap.get(comment.author_id)!, resolvedAt: comment.resolved_at, versionId: comment.version_id, createdAt: comment.created_at });
        acc.set(comment.version_id, items);
        return acc;
    }, new Map<string, Comment[]>());

    const renewalRequestIds = (renewalsRes.data || []).map(r => r.id);
    const { data: feedbackData } = renewalRequestIds.length > 0 ? await supabase.from('renewal_feedback').select('*').in('renewal_request_id', renewalRequestIds) : { data: [] };
    const feedbackByRenewalId = (feedbackData || []).reduce((acc, feedback) => {
        const items = acc.get(feedback.renewal_request_id) || [];
        items.push({ ...feedback, user: usersMap.get(feedback.user_id)! });
        acc.set(feedback.renewal_request_id, items);
        return acc;
    }, new Map<string, RenewalFeedback[]>());
    
    const newContract: Contract = {
        id: contractData.id, title: contractData.title, type: contractData.type, status: contractData.status,
        riskLevel: contractData.risk_level, effectiveDate: contractData.effective_date,
        endDate: contractData.end_date, value: contractData.value, frequency: contractData.frequency, allocation: contractData.allocation,
        seasonalMonths: contractData.seasonal_months, owner: usersMap.get(contractData.owner_id)!,
        counterparty: counterpartiesMap.get(contractData.counterparty_id)!,
        property: propertiesMap.get(contractData.property_id),
        versions: (versionsRes.data || []).map(v => ({...v, versionNumber: v.version_number, createdAt: v.created_at, fileName: v.file_name, effectiveDate: v.effective_date, endDate: v.end_date, seasonalMonths: v.seasonal_months, author: usersMap.get(v.author_id)!, property: propertiesMap.get(v.property_id), comments: commentsByVersionId.get(v.id) || []})).sort((a,b) => a.versionNumber - b.versionNumber),
        approvalSteps: (approvalsRes.data || []).map(a => ({...a, approvedAt: a.approved_at, approver: usersMap.get(a.approver_id)!})),
        propertyAllocations: (allocationsRes.data || []).map(a => ({...a, propertyId: a.property_id, allocatedValue: a.allocated_value, monthlyValues: a.monthly_values, manualEdits: a.manual_edits})),
        renewalRequest: (renewalsRes.data && renewalsRes.data[0]) ? { ...renewalsRes.data[0], renewalOwner: usersMap.get(renewalsRes.data[0].renewal_owner_id), contractId: renewalsRes.data[0].contract_id, companyId: renewalsRes.data[0].company_id, feedback: feedbackByRenewalId.get(renewalsRes.data[0].id) || [] } : undefined,
        auditLogs: (auditsRes.data || []).map(a => ({...a, relatedEntityType: 'renewal_request', changeType: a.change_type, oldValue: a.old_value, newValue: a.new_value, user: usersMap.get(a.user_id)})),
        submittedAt: contractData.submitted_at, reviewStartedAt: contractData.review_started_at, approvalStartedAt: contractData.approval_started_at, approvalCompletedAt: contractData.approval_completed_at,
        sentForSignatureAt: contractData.sent_for_signature_at, executedAt: contractData.executed_at, activeAt: contractData.active_at, expiredAt: contractData.expired_at, archivedAt: contractData.archived_at,
        updatedAt: contractData.updated_at, draftVersionId: contractData.draft_version_id, executedVersionId: contractData.executed_version_id, startDate: contractData.start_date, autoRenew: contractData.auto_renew, noticePeriodDays: contractData.notice_period_days,
        renewalTermMonths: contractData.renewal_term_months, upliftPercent: contractData.uplift_percent, parentContractId: contractData.parent_contract_id, signingStatus: contractData.signing_status, signingStatusUpdatedAt: contractData.signing_status_updated_at,
    };
    
    setContracts(prev => {
        const index = prev.findIndex(c => c.id === contractId);
        if (index > -1) {
            const newContracts = [...prev];
            newContracts[index] = newContract;
            return newContracts;
        }
        return [...prev, newContract];
    });

    return newContract;
}, [currentUser, usersMap, counterpartiesMap, propertiesMap]);

  useEffect(() => {
      if (!currentUser?.companyId) return;

      const handleDbChange = async (payload: any) => {
          let contractId = payload.new?.contract_id || payload.old?.contract_id || payload.new?.id || payload.old?.id;

          if (payload.table === 'comments') {
              const versionId = payload.new?.version_id || payload.old?.version_id;
              if (versionId) {
                  const { data: version } = await supabase.from('contract_versions').select('contract_id').eq('id', versionId).single();
                  if (version) contractId = version.contract_id;
              }
          } else if (payload.table === 'renewal_feedback') {
              const renewalRequestId = payload.new?.renewal_request_id || payload.old?.renewal_request_id;
              if (renewalRequestId) {
                  const { data: request } = await supabase.from('renewal_requests').select('contract_id').eq('id', renewalRequestId).single();
                  if (request) contractId = request.contract_id;
              }
          }
          
          if (contractId) {
              if (payload.table === 'contracts' && payload.eventType === 'DELETE') {
                  setContracts(prev => prev.filter(c => c.id !== contractId));
              } else {
                  await fetchAndMergeContract(contractId);
              }
          }
      };

      const companyFilter = `company_id=eq.${currentUser.companyId}`;
      const subscriptions = [
          supabase.channel('contracts').on('postgres_changes', { event: '*', schema: 'public', table: 'contracts', filter: companyFilter }, handleDbChange).subscribe(),
          supabase.channel('contract_versions').on('postgres_changes', { event: '*', schema: 'public', table: 'contract_versions', filter: companyFilter }, handleDbChange).subscribe(),
          supabase.channel('approval_steps').on('postgres_changes', { event: '*', schema: 'public', table: 'approval_steps', filter: companyFilter }, handleDbChange).subscribe(),
          supabase.channel('renewal_requests').on('postgres_changes', { event: '*', schema: 'public', table: 'renewal_requests', filter: companyFilter }, handleDbChange).subscribe(),
          supabase.channel('comments').on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: companyFilter }, handleDbChange).subscribe(),
          supabase.channel('renewal_feedback').on('postgres_changes', { event: '*', schema: 'public', table: 'renewal_feedback', filter: companyFilter }, handleDbChange).subscribe(),
      ];

      return () => {
          subscriptions.forEach(sub => sub.unsubscribe());
      };
  }, [currentUser, fetchAndMergeContract]);

  useEffect(() => {
    if (selectedContract) {
      const updatedContractInList = contracts.find(c => c.id === selectedContract.id);
      if (updatedContractInList) {
        if (JSON.stringify(selectedContract) !== JSON.stringify(updatedContractInList)) {
          setSelectedContract(updatedContractInList);
        }
      } else {
        setSelectedContract(null);
      }
    }
  }, [contracts, selectedContract]);
  
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel(`notifications:${currentUser.id}`)
      .on<Notification>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          setNotifications((currentNotifications) =>
            [payload.new, ...currentNotifications].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);


  useEffect(() => {
    const root = window.document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    root.classList.toggle('dark', isDark);
  }, [theme]);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
  };

  const handleLogin = () => {
    setActiveView('dashboard');
  };

  const handleLogout = async () => {
    await signOut();
    setActiveView('dashboard'); 
    setAuthView('login');
  };

  const handleSelectContract = (contract: Contract) => {
    setSelectedContract(contract);
    setActiveView('contracts');
  };

  const handleBackToList = () => {
    setSelectedContract(null);
  };
  
  const handleSelectTemplate = (template: ContractTemplate) => {
    setSelectedTemplate(template);
  };
  
  const handleBackToTemplatesList = () => {
    setSelectedTemplate(null);
  };
  
  const handleSelectCounterparty = (counterparty: Counterparty) => {
    setSelectedCounterparty(counterparty);
  };
  
  const handleBackToCounterpartiesList = () => {
    setSelectedCounterparty(null);
  };
  
  const handleSelectProperty = (property: Property) => {
    setSelectedProperty(property);
  };

  const handleBackToPropertiesList = () => {
    setSelectedProperty(null);
  };

  const handleNavigate = (view: string) => {
    setActiveView(view);
    setSelectedContract(null);
    setSelectedTemplate(null);
    setSelectedCounterparty(null);
    setSelectedProperty(null);
    setInitialFilters({});
  };
  
  const handleMetricNavigation = (metric: 'active' | 'pending' | 'high-risk' | 'my-contracts') => {
    if (!currentUser) return;
    let filters: { status?: ContractStatusType; riskLevels?: RiskLevel[]; ownerId?: string } = {};
    if (metric === 'active') {
        filters = { status: ContractStatus.ACTIVE };
    } else if (metric === 'pending') {
        filters = { status: ContractStatus.PENDING_APPROVAL };
    } else if (metric === 'high-risk') {
        filters = { riskLevels: [RiskLevel.HIGH, RiskLevel.CRITICAL] };
    } else if (metric === 'my-contracts') {
        filters = { ownerId: currentUser.id };
    }
    setInitialFilters(filters);
    setActiveView('contracts');
    setSelectedContract(null);
    setSelectedTemplate(null);
    setSelectedCounterparty(null);
    setSelectedProperty(null);
  };

  const handleStartCreate = (initialData: Partial<Contract> & { content?: string } | null = null) => {
    setInitialCreateData(initialData);
    setIsCreatingContract(true);
  };
  const handleCancelCreate = () => {
    setIsCreatingContract(false);
    setInitialCreateData(null);
  };

  const handleUseTemplate = (template: ContractTemplate) => {
    handleStartCreate({
        type: template.type,
        content: template.content,
        title: `New - ${template.name}`,
    });
  };

  const handleFinalizeCreate = async (newContractData: Partial<Contract> & { propertyAllocations?: any[] }) => {
    if (!currentUser?.companyId || !currentUser?.appId) return;

    const contractRecord = {
      title: newContractData.title, type: newContractData.type, status: ContractStatus.DRAFT,
      risk_level: newContractData.riskLevel, counterparty_id: newContractData.counterparty?.id,
      property_id: newContractData.property?.id, owner_id: newContractData.owner?.id,
      effective_date: newContractData.effectiveDate, end_date: newContractData.endDate,
      value: newContractData.value, frequency: newContractData.frequency,
      seasonal_months: newContractData.seasonalMonths, allocation: newContractData.allocation,
      company_id: currentUser.companyId, app_id: currentUser.appId,
    };
    
    const { data: insertedContract, error: contractError } = await supabase.from('contracts').insert([contractRecord]).select().single();
    if (contractError || !insertedContract) { console.error("Error creating contract:", contractError); return; }

    const versionData = newContractData.versions![0];
    const versionRecord = {
      contract_id: insertedContract.id, version_number: 1, author_id: versionData.author.id,
      content: versionData.content, file_name: versionData.fileName, value: versionData.value,
      effective_date: versionData.effectiveDate, end_date: versionData.endDate,
      frequency: versionData.frequency, seasonal_months: versionData.seasonalMonths,
      property_id: versionData.property?.id, company_id: currentUser.companyId, app_id: currentUser.appId,
    };
    const { data: insertedVersion, error: versionError } = await supabase.from('contract_versions').insert([versionRecord]).select().single();
    if (versionError || !insertedVersion) { console.error("Error creating version:", versionError); return; }

    const { error: updateError } = await supabase.from('contracts').update({ draft_version_id: insertedVersion.id }).eq('id', insertedContract.id);
    if (updateError) { console.error("Error linking draft version:", updateError); return; }
    
    if (newContractData.propertyAllocations && newContractData.propertyAllocations.length > 0) {
      const allocationRecords = newContractData.propertyAllocations.map(alloc => ({
        contract_id: insertedContract.id, property_id: alloc.propertyId === 'portfolio' ? null : alloc.propertyId,
        monthly_values: alloc.monthlyValues, manual_edits: alloc.manualEdits,
        allocated_value: alloc.allocatedValue, company_id: currentUser.companyId, app_id: currentUser.appId,
      }));
      const { error: allocationError } = await supabase.from('contract_property_allocations').insert(allocationRecords);
      if (allocationError) { console.error("Error creating allocations:", allocationError); return; }
    }
    
    await fetchAndMergeContract(insertedContract.id);
    setIsCreatingContract(false);
  };

  const handleStartCreateCounterparty = () => setIsCreatingCounterparty(true);
  const handleCancelCreateCounterparty = () => setIsCreatingCounterparty(false);
  const handleFinalizeCreateCounterparty = async (newCounterpartyData: Omit<Counterparty, 'id'>) => {
     if (!currentUser?.companyId || !currentUser?.appId) return;
    const { data: insertedCounterparty, error } = await supabase.from('counterparties').insert([{
        name: newCounterpartyData.name, type: newCounterpartyData.type, address_line1: newCounterpartyData.addressLine1,
        address_line2: newCounterpartyData.addressLine2, city: newCounterpartyData.city, state: newCounterpartyData.state,
        zip_code: newCounterpartyData.zipCode, country: newCounterpartyData.country, contact_name: newCounterpartyData.contactName,
        contact_email: newCounterpartyData.contactEmail, contact_phone: newCounterpartyData.contactPhone,
        company_id: currentUser.companyId, app_id: currentUser.appId,
    }]).select().single();
    
    if (error) { console.error("Error creating counterparty:", error); } 
    else if (insertedCounterparty) { setCounterparties(prev => [...prev, { ...insertedCounterparty, addressLine1: insertedCounterparty.address_line1, addressLine2: insertedCounterparty.address_line2, zipCode: insertedCounterparty.zip_code, contactName: insertedCounterparty.contact_name, contactEmail: insertedCounterparty.contact_email, contactPhone: insertedCounterparty.contact_phone }]); }
    setIsCreatingCounterparty(false);
  };
  
  const handleStartCreateProperty = () => setIsCreatingProperty(true);
  const handleCancelCreateProperty = () => setIsCreatingProperty(false);
  const handleFinalizeCreateProperty = async (newPropertyData: Omit<Property, 'id'>) => {
    if (!currentUser?.companyId || !currentUser?.appId) return;
    const { data: insertedProperty, error } = await supabase.from('properties').insert([{
        name: newPropertyData.name, address_line1: newPropertyData.addressLine1, address_line2: newPropertyData.addressLine2,
        city: newPropertyData.city, state: newPropertyData.state, zip_code: newPropertyData.zipCode,
        country: newPropertyData.country, company_id: currentUser.companyId, app_id: currentUser.appId,
    }]).select().single();

     if (error) { console.error("Error creating property:", error); } 
     else if (insertedProperty) { setProperties(prev => [...prev, { ...insertedProperty, addressLine1: insertedProperty.address_line1, addressLine2: insertedProperty.address_line2, zipCode: insertedProperty.zip_code, }]);}
    setIsCreatingProperty(false);
  };

  const handleStartEditCounterparty = (counterparty: Counterparty) => setEditingCounterparty(counterparty);
  const handleCancelEditCounterparty = () => setEditingCounterparty(null);
  const handleFinalizeEditCounterparty = async (data: Partial<Counterparty>) => {
    if (!data.id) return;
    const { data: updated, error } = await supabase.from('counterparties').update({
        name: data.name, type: data.type, address_line1: data.addressLine1, address_line2: data.addressLine2,
        city: data.city, state: data.state, zip_code: data.zipCode, country: data.country,
        contact_name: data.contactName, contact_email: data.contactEmail, contact_phone: data.contactPhone,
    }).eq('id', data.id).select().single();
    
    if (error) { console.error("Error updating counterparty:", error); }
    else if (updated) {
        const updatedMapped: Counterparty = { id: updated.id, name: updated.name, type: updated.type, addressLine1: updated.address_line1, addressLine2: updated.address_line2, city: updated.city, state: updated.state, zipCode: updated.zip_code, country: updated.country, contactName: updated.contact_name, contactEmail: updated.contact_email, contactPhone: updated.contact_phone };
        setCounterparties(prev => prev.map(c => c.id === updatedMapped.id ? updatedMapped : c));
        setContracts(prev => prev.map(c => c.counterparty.id === updatedMapped.id ? { ...c, counterparty: updatedMapped } : c));
        if (selectedCounterparty?.id === updatedMapped.id) {
            setSelectedCounterparty(updatedMapped);
        }
    }
    setEditingCounterparty(null);
  };

  const handleStartEditProperty = (property: Property) => setEditingProperty(property);
  const handleCancelEditProperty = () => setEditingProperty(null);
  const handleFinalizeEditProperty = async (data: Partial<Property>) => {
    if (!data.id) return;
    const { data: updated, error } = await supabase.from('properties').update({
        name: data.name, address_line1: data.addressLine1, address_line2: data.addressLine2,
        city: data.city, state: data.state, zip_code: data.zipCode, country: data.country
    }).eq('id', data.id).select().single();

    if (error) { console.error("Error updating property:", error); }
    else if (updated) {
        const updatedMapped: Property = { id: updated.id, name: updated.name, addressLine1: updated.address_line1, addressLine2: updated.address_line2, city: updated.city, state: updated.state, zipCode: updated.zip_code, country: updated.country };
        setProperties(prev => prev.map(p => p.id === updatedMapped.id ? updatedMapped : p));
        setContracts(prev => prev.map(c => c.property?.id === updatedMapped.id ? { ...c, property: updatedMapped } : c));
        if (selectedProperty?.id === updatedMapped.id) {
            setSelectedProperty(updatedMapped);
        }
    }
    setEditingProperty(null);
  };


  const handleContractTransition = async (contractId: string, action: ContractAction, payload?: any) => {
    if (!currentUser) return;

    const rpcPayload: any = payload ? { ...payload } : {};

    if (action === ContractStatus.PENDING_APPROVAL && rpcPayload.approvers) {
      rpcPayload.approvers = rpcPayload.approvers.map((a: UserProfile) => a.id);
    }

    if (action === ContractStatus.SENT_FOR_SIGNATURE) {
      rpcPayload.signing_status = SigningStatusEnum.AWAITING_INTERNAL;
    }
    
    const { error } = await supabase.rpc('contract_transition', { 
      p_contract_id: contractId, 
      p_action: action, 
      p_payload: rpcPayload, 
    });

    if (error) { 
      console.error("Error transitioning contract state:", error); 
      alert(`Failed to update contract: ${error.message}`); 
    } else { 
        await fetchAndMergeContract(contractId);
    }
  };

  const handleSigningStatusUpdate = async (contractId: string, newStatus: SigningStatus) => {
    if (!currentUser) return;
    const { error } = await supabase
        .from('contracts')
        .update({ signing_status: newStatus, signing_status_updated_at: new Date().toISOString() })
        .eq('id', contractId);

    if (error) {
        console.error("Error updating signing status:", error);
        alert(`Failed to update signing status: ${error.message}`);
    } else {
        await fetchAndMergeContract(contractId);
    }
  };

  const handleMarkAsExecuted = (contractId: string) => {
      handleContractTransition(contractId, ContractStatus.FULLY_EXECUTED);
  };

  const handleRenewalDecision = async (renewalRequestId: string, mode: RenewalMode, notes?: string) => {
      if (!currentUser) return;

      if (mode === RenewalMode.NEW_CONTRACT || mode === RenewalMode.RENEW_AS_IS) {
          console.error("handleRenewalDecision should not be called for 'new_contract' or 'renew_as_is'.");
          return;
      }
      
      const contractToUpdate = contracts.find(c => c.renewalRequest?.id === renewalRequestId);
      if (!contractToUpdate) return;
      
      const { error } = await supabase.from('renewal_requests').update({ 
          mode, 
          status: mode === RenewalMode.TERMINATE ? RenewalStatusEnum.CANCELLED : RenewalStatusEnum.IN_PROGRESS,
          notes 
      }).eq('id', renewalRequestId);
      
      if (error) {
          console.error("Error updating renewal decision:", error);
          alert(`Failed to update renewal decision: ${error.message}`);
          return;
      }
      
      if (mode === RenewalMode.AMENDMENT) {
          await handleContractTransition(contractToUpdate.id, ContractStatus.IN_REVIEW);
      } else if (mode === RenewalMode.TERMINATE) {
          await handleContractTransition(contractToUpdate.id, ContractStatus.TERMINATED);
      } else {
          await fetchAndMergeContract(contractToUpdate.id);
      }
  };
  
  const handleStartRenegotiation = async (originalContract: Contract, notes?: string) => {
    if (!currentUser?.companyId || !currentUser?.appId) return;

    const newStartDate = new Date(originalContract.endDate);
    newStartDate.setDate(newStartDate.getDate() + 1);
    
    const newEndDate = new Date(newStartDate);
    const renewalTerm = originalContract.renewalRequest?.renewalTermMonths ?? originalContract.renewalTermMonths ?? 12;
    newEndDate.setMonth(newEndDate.getMonth() + renewalTerm);
    
    const upliftPercent = originalContract.renewalRequest?.upliftPercent ?? originalContract.upliftPercent ?? 0;
    const newValue = originalContract.value * (1 + (upliftPercent / 100));

    const noticePeriod = originalContract.renewalRequest?.noticePeriodDays ?? originalContract.noticePeriodDays ?? 30;

    const newContractRecord = {
      type: originalContract.type,
      risk_level: originalContract.riskLevel,
      counterparty_id: originalContract.counterparty.id,
      property_id: originalContract.property?.id,
      owner_id: originalContract.owner.id,
      frequency: originalContract.frequency,
      seasonal_months: originalContract.seasonalMonths,
      allocation: originalContract.allocation,
      title: `[RENEWAL] ${originalContract.title}`,
      status: ContractStatus.DRAFT,
      value: newValue,
      effective_date: newStartDate.toISOString().split('T')[0],
      end_date: newEndDate.toISOString().split('T')[0],
      start_date: newStartDate.toISOString().split('T')[0],
      parent_contract_id: originalContract.id,
      company_id: currentUser.companyId,
      app_id: currentUser.appId,
      auto_renew: originalContract.autoRenew,
      notice_period_days: noticePeriod,
      renewal_term_months: renewalTerm,
      uplift_percent: upliftPercent,
    };

    const { data: insertedContract, error: contractError } = await supabase.from('contracts').insert([newContractRecord]).select().single();
    if (contractError) {
      console.error("Error creating renewal contract:", contractError);
      alert(`Failed to create renewal contract: ${contractError.message}`);
      return;
    }

    const latestOldVersion = originalContract.versions.sort((a, b) => b.versionNumber - a.versionNumber)[0];
    if (latestOldVersion) {
        const newVersionRecord = {
          contract_id: insertedContract.id,
          version_number: 1,
          author_id: currentUser.id,
          content: latestOldVersion.content,
          value: newValue,
          effective_date: newContractRecord.effective_date,
          end_date: newContractRecord.end_date,
          frequency: newContractRecord.frequency,
          seasonal_months: newContractRecord.seasonal_months,
          property_id: newContractRecord.property_id,
          company_id: currentUser.companyId,
          app_id: currentUser.appId,
        };
        const { error: versionError } = await supabase.from('contract_versions').insert([newVersionRecord]);
        if (versionError) {
          console.error("Error creating initial version for renewal contract:", versionError);
        }
    }

    if (originalContract.propertyAllocations && originalContract.propertyAllocations.length > 0) {
        const newAllocationRecords = originalContract.propertyAllocations.map(alloc => ({
            contract_id: insertedContract.id,
            property_id: alloc.propertyId,
            allocated_value: alloc.allocatedValue,
            monthly_values: alloc.monthlyValues,
            manual_edits: alloc.manualEdits,
            company_id: currentUser.companyId,
            app_id: currentUser.appId,
        }));
        const { error: allocationError } = await supabase.from('contract_property_allocations').insert(newAllocationRecords);
        if (allocationError) {
          console.error("Error copying property allocations:", allocationError);
        }
    }

    if (originalContract.renewalRequest) {
        const { error: renewalUpdateError } = await supabase
            .from('renewal_requests')
            .update({
                status: RenewalStatusEnum.IN_PROGRESS,
                mode: RenewalMode.NEW_CONTRACT,
                notes: notes,
            })
            .eq('id', originalContract.renewalRequest.id);
        if (renewalUpdateError) {
            console.error("Error updating original renewal request:", renewalUpdateError);
        }
    }

    const newContract = await fetchAndMergeContract(insertedContract.id);
    alert('New renewal contract draft created successfully. You will now be taken to the new draft.');
    if (newContract) {
        handleSelectContract(newContract);
    }
  };

  const handleCreateRenewalRequest = async (contract: Contract) => {
    if (!currentUser || !contract) return;
    
    const endDate = new Date(contract.endDate);
    const noticePeriod = contract.noticePeriodDays || 30;
    
    const noticeDeadline = new Date(endDate);
    noticeDeadline.setDate(endDate.getDate() - noticePeriod);

    const internalDecisionDeadline = new Date(noticeDeadline);
    internalDecisionDeadline.setDate(noticeDeadline.getDate() - 30);

    const { error } = await supabase.from('renewal_requests').insert([{
        contract_id: contract.id,
        company_id: currentUser.companyId,
        app_id: currentUser.appId,
        renewal_owner_id: contract.owner.id,
        mode: null,
        status: RenewalStatusEnum.QUEUED,
        uplift_percent: contract.upliftPercent || 0,
        renewal_term_months: contract.renewalTermMonths,
        notice_period_days: contract.noticePeriodDays,
        notice_deadline: noticeDeadline.toISOString().split('T')[0],
        internal_decision_deadline: internalDecisionDeadline.toISOString().split('T')[0],
    }]);

    if (error) {
        console.error("Error creating renewal request:", error);
        alert(`Failed to create renewal request: ${error.message}`);
    } else {
        await fetchAndMergeContract(contract.id);
    }
  };

  const handleUpdateRenewalTerms = async (renewalRequestId: string, updatedTerms: { renewalTermMonths: number; noticePeriodDays: number; upliftPercent: number; }) => {
    if (!currentUser) return;

    const renewalRequest = contracts.find(c => c.renewalRequest?.id === renewalRequestId)?.renewalRequest;
    if (!renewalRequest) return;
    
    const { error } = await supabase.from('renewal_requests').update({
        renewal_term_months: updatedTerms.renewalTermMonths,
        notice_period_days: updatedTerms.noticePeriodDays,
        uplift_percent: updatedTerms.upliftPercent
    }).eq('id', renewalRequestId);

    if (error) {
        console.error("Error updating renewal terms:", error);
        alert(`Failed to update renewal terms: ${error.message}`);
    } else {
        await fetchAndMergeContract(renewalRequest.contractId);
    }
  };

  const handleRenewAsIs = async (contract: Contract, notes?: string) => {
    if (!currentUser || !contract.renewalRequest) return;
    
    const termMonths = contract.renewalRequest.renewalTermMonths ?? contract.renewalTermMonths ?? 12;
    const uplift = contract.renewalRequest.upliftPercent ?? contract.upliftPercent ?? 0;
    
    const newEndDate = new Date(contract.endDate);
    newEndDate.setMonth(newEndDate.getMonth() + termMonths);
    const newValue = contract.value * (1 + (uplift / 100));

    const [contractUpdate, renewalUpdate] = await Promise.all([
        supabase.from('contracts').update({
            end_date: newEndDate.toISOString().split('T')[0],
            value: newValue,
        }).eq('id', contract.id),
        supabase.from('renewal_requests').update({ 
            status: RenewalStatusEnum.ACTIVATED,
            mode: RenewalMode.RENEW_AS_IS,
            notes: notes
        }).eq('id', contract.renewalRequest.id)
    ]);
    
    if (contractUpdate.error || renewalUpdate.error) {
        console.error("Error finalizing 'Renew As-Is':", contractUpdate.error, renewalUpdate.error);
        alert("Failed to finalize renewal.");
    } else {
        alert("Contract renewed as-is successfully!");
        await fetchAndMergeContract(contract.id);
    }
  };

  const handleCreateNewVersion = async (contractId: string, newVersionData: Omit<ContractVersion, 'id' | 'versionNumber' | 'createdAt' | 'author'>) => {
      if (!currentUser?.companyId || !currentUser?.appId) return;
      let contractToUpdate = contracts.find(c => c.id === contractId);
      if (!contractToUpdate) return;
      
      const latestVersionNumber = contractToUpdate.versions.length > 0 ? Math.max(...contractToUpdate.versions.map(v => v.versionNumber)) : 0;
      
      const { data: insertedVersion, error: versionError } = await supabase.from('contract_versions').insert([{
          contract_id: contractId, version_number: latestVersionNumber + 1, author_id: currentUser.id,
          content: newVersionData.content, file_name: newVersionData.fileName, value: newVersionData.value,
          effective_date: newVersionData.effectiveDate, end_date: newVersionData.endDate,
          frequency: newVersionData.frequency, seasonal_months: newVersionData.seasonalMonths,
          property_id: newVersionData.property?.id, company_id: currentUser.companyId, app_id: currentUser.appId,
      }]).select().single();
      if (versionError || !insertedVersion) { console.error("Error creating new version:", versionError); return; }

      const { error: contractUpdateError } = await supabase.from('contracts').update({
          value: newVersionData.value, effective_date: newVersionData.effectiveDate,
          end_date: newVersionData.endDate, frequency: newVersionData.frequency,
          seasonal_months: newVersionData.seasonalMonths, property_id: newVersionData.property?.id,
          status: ContractStatus.IN_REVIEW, approval_completed_at: null, approval_started_at: null,
          draft_version_id: insertedVersion.id,
      }).eq('id', contractId);
      if (contractUpdateError) { console.error("Error updating contract:", contractUpdateError); return; }

      const { error: approvalError } = await supabase.from('approval_steps').delete().eq('contract_id', contractId);
      if (approvalError) { console.error("Error clearing old approvals:", approvalError); }

      await fetchAndMergeContract(contractId);
  };

  const handleUpdateRolePermissions = async (roleId: string, newPermissions: PermissionSet) => {
    const { error } = await supabase.from('roles').update({ permissions: newPermissions }).eq('id', roleId);
    if (error) { console.error("Error updating role permissions:", error); alert("Failed to update role permissions."); return; }
    setRoles(prevRoles => prevRoles.map(role => role.id === roleId ? { ...role, permissions: newPermissions } : role ));
  };

  const handleCreateRole = async (name: string, description: string) => {
    if (!currentUser?.companyId || !currentUser?.appId) return;
    const { data, error } = await supabase.from('roles').insert([{ name, description, permissions: requestorPermissions, company_id: currentUser.companyId, app_id: currentUser.appId, }]).select().single();
    if (error) { console.error("Error creating role:", error); alert("Failed to create role."); return; }
    if (data) { setRoles(prev => [...prev, { ...data, userCount: 0, permissions: data.permissions as any }].sort((a,b) => a.name.localeCompare(b.name))); }
  };

  const handleDeleteRole = async (roleId: string) => {
    const roleToDelete = roles.find(r => r.id === roleId);
    if (!roleToDelete) return;
    if (roleToDelete.name === 'Admin') { alert("The default Admin role cannot be deleted."); return; }
    if (roleToDelete.userCount > 0) { alert("Cannot delete a role that has users assigned to it. Please reassign users first."); return; }
    if (!window.confirm(`Are you sure you want to delete the "${roleToDelete.name}" role? This action cannot be undone.`)) { return; }
    const { error } = await supabase.from('roles').delete().eq('id', roleId);
    if (error) { console.error("Error deleting role:", error); alert("Failed to delete role."); return; }
    setRoles(prev => prev.filter(r => r.id !== roleId));
  };

  const handleCreateComment = async (versionId: string, content: string) => {
    if (!currentUser?.companyId || !currentUser?.appId) return;

    const { error } = await supabase.from('comments').insert([
        { version_id: versionId, content: content, author_id: currentUser.id, company_id: currentUser.companyId, app_id: currentUser.appId }
    ]);
    if (error) { 
        console.error("Error creating comment:", error); 
        alert(`Failed to post comment: ${error.message}`); 
        return; 
    }
    const { data: version } = await supabase.from('contract_versions').select('contract_id').eq('id', versionId).single();
    if (version?.contract_id) {
        await fetchAndMergeContract(version.contract_id);
    }
  };
  
  const handleResolveComment = async (commentId: string, isResolved: boolean) => {
    const { data: comment, error: commentFetchError } = await supabase.from('comments').select('version_id').eq('id', commentId).single();
    if (commentFetchError || !comment) {
        console.error("Error fetching comment details:", commentFetchError);
        return;
    }

    const { error } = await supabase
      .from('comments')
      .update({ resolved_at: isResolved ? new Date().toISOString() : null })
      .eq('id', commentId);

    if (error) {
      console.error("Error updating comment status:", error);
    } else {
        const { data: version } = await supabase.from('contract_versions').select('contract_id').eq('id', comment.version_id).single();
        if (version?.contract_id) {
            await fetchAndMergeContract(version.contract_id);
        }
    }
  };

  const handleCreateRenewalFeedback = async (renewalRequestId: string, feedbackText: string) => {
    if (!currentUser) return;
    const { error } = await supabase.from('renewal_feedback').insert([{
        renewal_request_id: renewalRequestId,
        user_id: currentUser.id,
        feedback: feedbackText,
        company_id: currentUser.companyId,
        app_id: currentUser.appId
    }]);
    if (error) {
        console.error("Error submitting feedback:", error);
        alert("Failed to submit feedback.");
    } else {
        const { data: request } = await supabase.from('renewal_requests').select('contract_id').eq('id', renewalRequestId).single();
        if (request?.contract_id) {
            await fetchAndMergeContract(request.contract_id);
        }
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    const { error } = await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    if (error) { console.error("Error marking all as read:", error); } 
    else { setNotifications(prev => prev.map(n => ({...n, is_read: true}))); }
  };

  const handleMarkOneAsRead = async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification || notification.is_read) return;
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
    if (error) { console.error("Error marking as read:", error); }
    else { setNotifications(prev => prev.map(n => n.id === notificationId ? {...n, is_read: true} : n)); }
  };

  const handleNotificationClick = (notification: Notification) => {
    handleMarkOneAsRead(notification.id);
    if (notification.related_entity_type === 'contract' && notification.related_entity_id) {
        const contract = contracts.find(c => c.id === notification.related_entity_id);
        if (contract) {
            handleSelectContract(contract);
        }
    }
  };

  const handleCreateUser = async (userData: any) => {
    if (!currentUser || !company) {
        alert("Cannot create user: missing current user or company context.");
        return;
    }
    const { error } = await adminCreateUser({
        ...userData,
        companyId: company.id,
        appId: currentUser.appId,
    });
    if (error) {
        alert(`Failed to create user: ${error.message}`);
    } else {
        alert("User created successfully! They will receive an email to verify their account.");
        setIsAddingUser(false);
        const { data: usersData } = await supabase.from('users').select('*').eq('company_id', currentUser.companyId);
        const rolesMap = new Map((roles).map(r => [r.id, r.name]));
        const mappedUsers: UserProfile[] = (usersData || []).map(u => ({ id: u.id, firstName: u.first_name, lastName: u.last_name, email: u.email, phone: u.phone, jobTitle: u.job_title, department: u.department, avatarUrl: u.avatar_url, role: rolesMap.get(u.role_id) || 'Unknown', roleId: u.role_id, status: u.status as any, lastLogin: u.last_login, companyId: u.company_id, appId: u.app_id }));
        setUsers(mappedUsers);
    }
  };

  const handleGlobalSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
        setGlobalSearchResults([]);
        setGlobalSearchTerm('');
        return;
    }
    setActiveView('search');
    setSelectedContract(null);
    setSelectedTemplate(null);
    setSelectedCounterparty(null);
    setSelectedProperty(null);
    setIsPerformingGlobalSearch(true);
    setGlobalSearchTerm(term);

    // Mock search logic. In a real app, this would be an API call.
    await new Promise(resolve => setTimeout(resolve, 1500));

    const results: SearchResult[] = [];
    const lowerCaseTerm = term.toLowerCase();

    contracts.forEach(contract => {
      contract.versions.forEach(version => {
        const content = version.content.toLowerCase();
        let matchIndex = -1;
        let lastIndex = 0;
        // Find all matches to make snippet more relevant
        while((matchIndex = content.indexOf(lowerCaseTerm, lastIndex)) !== -1) {
          const snippetStart = Math.max(0, matchIndex - 80);
          const snippetEnd = Math.min(version.content.length, matchIndex + lowerCaseTerm.length + 80);
          const snippet = `${snippetStart > 0 ? '...' : ''}${version.content.substring(snippetStart, snippetEnd)}${snippetEnd < version.content.length ? '...' : ''}`;
          
          if (!results.some(r => r.versionId === version.id)) {
            results.push({
              contractId: contract.id,
              contractTitle: contract.title,
              counterpartyName: contract.counterparty.name,
              versionId: version.id,
              versionNumber: version.versionNumber,
              snippet: snippet,
            });
          }
          lastIndex = matchIndex + 1;
        }
      });
    });

    setGlobalSearchResults(results);
    setIsPerformingGlobalSearch(false);
  }, [contracts]);

    const contextValue: AppContextType = {
        session, currentUser, company, isAuthenticated, authView, setAuthView, handleLogin, handleLogout,
        isLoading, activeView, theme, handleThemeChange, handleNavigate, handleMetricNavigation,
        contracts, templates, counterparties, properties, users, roles, notifications, notificationSettings, userNotificationSettings, unreadCount,
        selectedContract, selectedTemplate, selectedCounterparty, selectedProperty, initialFilters,
        isCreatingContract, initialCreateData, isCreatingCounterparty, isCreatingProperty, editingCounterparty, editingProperty, isAddingUser, setIsAddingUser,
        handleStartCreate, handleCancelCreate, handleStartCreateCounterparty, handleCancelCreateCounterparty, handleStartEditCounterparty, handleCancelEditCounterparty,
        handleStartCreateProperty, handleCancelCreateProperty, handleStartEditProperty, handleCancelEditProperty, handleUseTemplate,
        handleFinalizeCreate, handleFinalizeCreateCounterparty, handleFinalizeEditCounterparty, handleFinalizeCreateProperty, handleFinalizeEditProperty,
        handleContractTransition, handleSigningStatusUpdate, handleMarkAsExecuted, handleRenewalDecision, handleStartRenegotiation, handleCreateRenewalRequest,
        handleUpdateRenewalTerms, handleRenewAsIs, handleCreateNewVersion, handleUpdateRolePermissions, handleCreateRole, handleDeleteRole,
        handleCreateComment, handleResolveComment, handleCreateRenewalFeedback, handleMarkAllAsRead, handleMarkOneAsRead, handleNotificationClick, handleCreateUser,
        handleSelectContract, handleBackToList, handleSelectTemplate, handleBackToTemplatesList, handleSelectCounterparty, handleBackToCounterpartiesList,
        handleSelectProperty, handleBackToPropertiesList,
        isPerformingGlobalSearch, globalSearchResults, globalSearchTerm, handleGlobalSearch,
        setNotificationSettings, setUserNotificationSettings, setUsers
    };

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
