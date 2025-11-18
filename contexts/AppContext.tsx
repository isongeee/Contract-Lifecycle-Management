import React, { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import type { Contract, ContractTemplate, Counterparty, Property, ContractStatus as ContractStatusType, ContractVersion, UserProfile, Role, NotificationSetting, UserNotificationSettings, AllocationType, PermissionSet, AuditLog, RenewalRequest, RenewalStatus, SigningStatus, Notification, Comment, RenewalFeedback, SearchResult } from '../types';
import { ContractStatus, RiskLevel, ApprovalStatus, RenewalStatus as RenewalStatusEnum, RenewalMode, SigningStatus as SigningStatusEnum } from '../types';
import { MOCK_NOTIFICATION_SETTINGS, MOCK_USER_NOTIFICATION_SETTINGS, requestorPermissions } from '../constants';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { fetchContractDetail } from '../lib/contractsApi';

type ContractAction = ContractStatus | 'APPROVE_STEP' | 'REJECT_STEP';

export interface AppContextType {
    // Derived from AuthContext (Re-exported for convenience in data components)
    currentUser: UserProfile | null;
    company: { id: string; name: string; slug: string; } | null;

    // UI State
    isLoading: boolean;
    activeView: string;
    theme: 'light' | 'dark' | 'system';
    handleThemeChange: (newTheme: 'light' | 'dark' | 'system') => void;
    handleNavigate: (view: string) => void;
    handleNavigateToRenewalWorkspace: (contract: Contract) => void;
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
    lastUpdated: number;

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
    handleFinalizeCreate: (newContractData: Partial<Contract> & { propertyAllocations?: any[], file?: File | null, fileName?: string, content?: string; }) => Promise<void>;
    handleFinalizeCreateCounterparty: (newCounterpartyData: Omit<Counterparty, "id">) => Promise<void>;
    handleFinalizeEditCounterparty: (data: Partial<Counterparty>) => Promise<void>;
    handleFinalizeCreateProperty: (newPropertyData: Omit<Property, "id">) => Promise<void>;
    handleFinalizeEditProperty: (data: Partial<Property>) => Promise<void>;
    handleContractTransition: (contractId: string, action: ContractAction, payload?: any) => Promise<void>;
    handleSigningStatusUpdate: (contractId: string, newStatus: SigningStatus) => Promise<void>;
    handleMarkAsExecuted: (contractId: string) => void;
    handleRenewalDecision: (renewalRequestId: string, mode: RenewalMode, notes?: string) => Promise<void>;
    handleStartRenegotiation: (contractId: string, notes?: string) => Promise<void>;
    handleCreateRenewalRequest: (contractId: string) => Promise<void>;
    handleUpdateRenewalTerms: (renewalRequestId: string, updatedTerms: { renewalTermMonths: number; noticePeriodDays: number; upliftPercent: number; }) => Promise<void>;
    handleRenewAsIs: (contractId: string, notes?: string) => Promise<void>;
    handleCreateNewVersion: (contractId: string,newVersionData: Omit<ContractVersion, "id" | "versionNumber" | "createdAt" | "author"> & {file?: File | null;fileName?: string;}) => Promise<void>;
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
    handleDownloadFile: (storagePath: string, fileName: string) => Promise<void>;

    setNotificationSettings: React.Dispatch<React.SetStateAction<NotificationSetting[]>>;
    setUserNotificationSettings: (newSettingsOrUpdater: React.SetStateAction<UserNotificationSettings>) => Promise<void>;
    setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
}


const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children?: React.ReactNode }) => {
  const { currentUser, company, handleCreateUser: authHandleCreateUser } = useAuth();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>(MOCK_NOTIFICATION_SETTINGS);
  const [userNotificationSettings, setUserNotificationSettingsState] = useState<UserNotificationSettings>(MOCK_USER_NOTIFICATION_SETTINGS);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastUpdated, setLastUpdated] = useState(Date.now());

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
  
  // Global Search State
  const [isPerformingGlobalSearch, setIsPerformingGlobalSearch] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState<SearchResult[]>([]);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

  const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);

  const setUserNotificationSettings = useCallback(async (newSettingsOrUpdater: React.SetStateAction<UserNotificationSettings>) => {
    const newSettings = typeof newSettingsOrUpdater === 'function' 
        ? newSettingsOrUpdater(userNotificationSettings) 
        : newSettingsOrUpdater;

    // Optimistically update UI
    setUserNotificationSettingsState(newSettings);

    const { error } = await supabase
        .from('user_notification_settings')
        .update({
            renewal_days_before: newSettings.renewalDaysBefore,
            preferences: newSettings.preferences,
        })
        .eq('id', newSettings.id);

    if (error) {
        console.error("Error updating user notification settings:", error);
        alert('Could not save your notification settings.');
        // Revert on error
        setUserNotificationSettingsState(userNotificationSettings);
    }
  }, [userNotificationSettings]);

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

    // Fetch user notification settings, creating them if they don't exist
    const { data: userSettingsData, error: settingsError } = await supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(); 

    if (userSettingsData) {
        setUserNotificationSettingsState({
            id: userSettingsData.id,
            userId: userSettingsData.user_id,
            renewalDaysBefore: userSettingsData.renewal_days_before,
            preferences: userSettingsData.preferences as any,
        });
    } else if (settingsError) {
        console.error("Error fetching user settings:", settingsError);
    } else {
        console.warn(`No notification settings found for user ${user.id}. Using default settings as a fallback.`);
    }

    const { data: contractsData } = await supabase.from('contracts').select('*').eq('company_id', companyId);
    const contractIds = (contractsData || []).map(c => c.id);
    
    const [versionsRes, approvalsRes, allocationsRes, renewalsRes, auditsRes] = await Promise.all([
        contractIds.length > 0 ? supabase.from('contract_versions').select('*').in('contract_id', contractIds) : Promise.resolve({ data: [] }),
        contractIds.length > 0 ? supabase.from('approval_steps').select('*').in('contract_id', contractIds) : Promise.resolve({ data: [] }),
        contractIds.length > 0 ? supabase.from('contract_property_allocations').select('*').in('contract_id', contractIds) : Promise.resolve({ data: [] }),
        contractIds.length > 0 ? supabase.from('renewal_requests').select('*').in('contract_id', contractIds).not('status', 'in', `("${RenewalStatusEnum.COMPLETED}","${RenewalStatusEnum.CANCELLED}")`) : Promise.resolve({ data: [] }),
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
        if (contract) contract.versions.push({ ...version, versionNumber: version.version_number, createdAt: version.created_at, fileName: version.file_name, storagePath: version.storage_path, effectiveDate: version.effective_date, endDate: version.end_date, seasonalMonths: version.seasonal_months, author: usersMap.get(version.author_id)!, property: propertiesMap.get(version.property_id), comments });
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
            let mode: RenewalMode;
            if (renewal.decision === 'non_renew') {
                mode = RenewalMode.TERMINATE;
            } else {
                switch(renewal.path) {
                    case 'as_is': mode = RenewalMode.RENEW_AS_IS; break;
                    case 'amend': mode = RenewalMode.AMENDMENT; break;
                    case 'renegotiate': mode = RenewalMode.NEW_CONTRACT; break;
                    default: 
                        mode = renewal.mode ? renewal.mode as RenewalMode : RenewalMode.PENDING;
                        break;
                }
            }

            contract.renewalRequest = { 
                ...renewal, 
                mode: mode,
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
    } else {
        setContracts([]);
        setCounterparties([]);
        setProperties([]);
        setUsers([]);
        setRoles([]);
        setNotifications([]);
        setTemplates([]);
        setIsLoading(false);
    }
  }, [currentUser, fetchData]);

  const usersMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
  const counterpartiesMap = useMemo(() => new Map(counterparties.map(c => [c.id, c])), [counterparties]);
  const propertiesMap = useMemo(() => new Map(properties.map(p => [p.id, p])), [properties]);

  const fetchAndMergeContract = useCallback(async (contractId: string): Promise<Contract | null> => {
    if (!currentUser || !usersMap.size || !counterpartiesMap.size || !propertiesMap.size) return null;

    const fullContract = await fetchContractDetail(contractId);
    if (!fullContract) {
        setContracts(prev => prev.filter(c => c.id !== contractId));
        return null;
    }
    
    setContracts(prev => {
        const index = prev.findIndex(c => c.id === contractId);
        if (index > -1) {
            const newContracts = [...prev];
            newContracts[index] = fullContract;
            return newContracts;
        }
        return [...prev, fullContract];
    });

    return fullContract;
}, [currentUser, usersMap, counterpartiesMap, propertiesMap]);

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
    if (!currentUser || !currentUser.companyId) return;

    const fetchNotifications = async () => {
      const { data: notificationsData, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error re-syncing notifications:", error);
      } else {
        setNotifications((notificationsData as Notification[]) || []);
      }
    };

    const notificationsChannel = supabase
      .channel(`notifications:${currentUser.id}`)
      .on<Notification>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` },
        (payload) => {
          setNotifications((currentNotifications) => [payload.new as Notification, ...currentNotifications]);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          fetchNotifications();
        }
      });
      
    const handleDbChange = async (payload: any) => {
      setLastUpdated(Date.now());
      let contractId: string | null = payload.new?.contract_id || payload.old?.contract_id || null;

      if (!contractId) {
         if (['contracts', 'renewal_requests', 'audit_logs'].includes(payload.table)) {
            contractId = payload.new?.id || payload.old?.id || payload.new?.related_entity_id || payload.old?.related_entity_id;
         }
      }
      
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
    const companyDbChannel = supabase.channel(`company-db-changes:${currentUser.companyId}`);
    
    companyDbChannel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts', filter: companyFilter }, handleDbChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contract_versions', filter: companyFilter }, handleDbChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_steps', filter: companyFilter }, handleDbChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'renewal_requests', filter: companyFilter }, handleDbChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: companyFilter }, handleDbChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'renewal_feedback', filter: companyFilter }, handleDbChange)
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(companyDbChannel);
    };
  }, [currentUser, fetchAndMergeContract, usersMap]);

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

  const handleNavigateToRenewalWorkspace = (contract: Contract) => {
    setSelectedContract(contract);
    setActiveView('renewal-workspace');
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

  const handleFinalizeCreate = useCallback(
  async (
    newContractData: Partial<Contract> & {
      propertyAllocations?: any[];
      file?: File | null;
      fileName?: string;
      content?: string;
    }
  ) => {
    if (!currentUser?.companyId || !currentUser?.appId) return;

    const contractRecord = {
      title: newContractData.title, type: newContractData.type, status: newContractData.status || ContractStatus.DRAFT,
      risk_level: newContractData.riskLevel, counterparty_id: newContractData.counterparty?.id,
      property_id: newContractData.property?.id ?? null, owner_id: newContractData.owner?.id ?? currentUser.id,
      effective_date: newContractData.effectiveDate, end_date: newContractData.endDate,
      renewal_date: newContractData.endDate, value: newContractData.value, frequency: newContractData.frequency,
      seasonal_months: newContractData.seasonalMonths || [], allocation: newContractData.allocation || 'single',
      company_id: currentUser.companyId, app_id: currentUser.appId,
      notice_period_days: newContractData.noticePeriodDays ?? null,
    };

    const { data: insertedContract, error: contractError } = await supabase
      .from('contracts').insert(contractRecord).select().single();

    if (contractError || !insertedContract) {
      console.error('Error creating contract:', contractError);
      alert('Failed to create contract.');
      return;
    }

    const file = newContractData.file ?? null;
    let storagePath: string | null = null;
    let fileNameToStore: string | null = null;

    if (file) {
      const originalFileName = newContractData.fileName || file.name || 'contract_document';
      const safeFileName = originalFileName.replace(/[^\w.\-]/g, '_');
      storagePath = `${currentUser.companyId}/${insertedContract.id}/${safeFileName}`;
      fileNameToStore = originalFileName;

      const { error: uploadError } = await supabase.storage.from('contract_documents').upload(storagePath, file, { upsert: true });

      if (uploadError) {
        console.error('Error uploading contract file:', uploadError);
        alert(`Failed to upload file: ${uploadError.message}`);
        return;
      }
    }

    const firstVersion = (newContractData as any).versions?.[0] || {};
    const versionRecord = {
      contract_id: insertedContract.id, version_number: 1, author_id: currentUser.id,
      content: firstVersion.content ?? newContractData.content ?? '',
      file_name: fileNameToStore ?? firstVersion.fileName ?? null,
      storage_path: storagePath,
      value: firstVersion.value ?? newContractData.value ?? 0,
      effective_date: firstVersion.effectiveDate ?? newContractData.effectiveDate,
      end_date: firstVersion.endDate ?? newContractData.endDate,
      frequency: firstVersion.frequency ?? newContractData.frequency,
      seasonal_months: firstVersion.seasonalMonths ?? newContractData.seasonalMonths ?? [],
      property_id: firstVersion.property?.id ?? newContractData.property?.id,
      company_id: currentUser.companyId, app_id: currentUser.appId,
    };

    const { data: insertedVersion, error: versionError } = await supabase.from('contract_versions').insert(versionRecord).select().single();

    if (versionError || !insertedVersion) {
      console.error('Error creating contract version:', versionError);
      alert('Failed to create initial contract version.');
      return;
    }

    const { error: updateContractError } = await supabase.from('contracts').update({ draft_version_id: insertedVersion.id }).eq('id', insertedContract.id);

    if (updateContractError) {
      console.error('Error updating contract with draft_version_id:', updateContractError);
    }

    if (newContractData.propertyAllocations && newContractData.propertyAllocations.length > 0) {
      const allocationRecords = newContractData.propertyAllocations.map((alloc: any) => ({
        contract_id: insertedContract.id,
        property_id: alloc.propertyId === 'portfolio' ? null : alloc.propertyId,
        allocated_value: alloc.allocatedValue,
        monthly_values: alloc.monthlyValues,
        manual_edits: alloc.manualEdits,
        company_id: currentUser.companyId,
        app_id: currentUser.appId,
      }));
      
      const { error: allocationError } = await supabase.from('contract_property_allocations').insert(allocationRecords);
      
      if (allocationError) {
        console.error('Error creating property allocations:', allocationError);
        alert('Contract was created, but failed to save property allocation details.');
      }
    }

    await fetchData(currentUser);
    alert('Contract created successfully!');
    setIsCreatingContract(false);
    setInitialCreateData(null);
  },
  [currentUser, fetchData, setIsCreatingContract, setInitialCreateData]
);


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
    if (!currentUser || !currentUser.companyId || !currentUser.appId) return;

    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;
    const oldStatus = contract.status;

    const rpcPayload: any = payload ? { ...payload } : {};

    // Handle notifications that should be sent *before* the state change
    if (action === ContractStatus.PENDING_APPROVAL && rpcPayload.approvers) {
      const approverProfiles: UserProfile[] = rpcPayload.approvers;
      const approverIds = approverProfiles.map((a: UserProfile) => a.id);
      
      const notificationRecords = approverIds.map((userId: string) => ({
          user_id: userId,
          type: 'APPROVAL_REQUEST' as const,
          message: `${currentUser.firstName} ${currentUser.lastName} has requested your approval on "${contract.title}".`,
          related_entity_type: 'contract' as const,
          related_entity_id: contractId,
          company_id: currentUser.companyId,
          app_id: currentUser.appId,
      }));
      
      if (notificationRecords.length > 0) {
        const { error: notificationError } = await supabase.from('notifications').insert(notificationRecords);
        if (notificationError) console.error("Error creating approval request notifications:", notificationError);
      }
      
      rpcPayload.approvers = approverIds; // Send IDs to RPC
    }

    if ((action === 'APPROVE_STEP' || action === 'REJECT_STEP') && contract.owner.id !== currentUser.id) {
        const approverName = `${currentUser.firstName} ${currentUser.lastName}`;
        const actionText = action === 'APPROVE_STEP' ? 'approved' : 'rejected changes on';
        const notificationRecord = {
            user_id: contract.owner.id,
            type: 'APPROVAL_RESPONSE' as const,
            message: `${approverName} has ${actionText} the contract "${contract.title}".`,
            related_entity_type: 'contract' as const,
            related_entity_id: contractId,
            company_id: currentUser.companyId,
            app_id: currentUser.appId,
        };
        const { error: notificationError } = await supabase.from('notifications').insert([notificationRecord]);
        if (notificationError) console.error("Error creating approval response notification:", notificationError);
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
        const updatedContract = await fetchAndMergeContract(contractId);
        // Handle notifications that should be sent *after* the state change
        if (updatedContract && updatedContract.status !== oldStatus) {
          const isSelfAction = updatedContract.owner.id === currentUser.id;
          const message = isSelfAction
            ? `You updated the status of "${contract.title}" to ${updatedContract.status}.`
            : `The status of "${contract.title}" was updated to ${updatedContract.status} by ${currentUser.firstName}.`;

          const notificationRecord = {
            user_id: contract.owner.id,
            type: 'STATUS_CHANGE' as const,
            message: message,
            related_entity_type: 'contract' as const,
            related_entity_id: contractId,
            company_id: currentUser.companyId,
            app_id: currentUser.appId,
          };
          const { error: notificationError } = await supabase.from('notifications').insert([notificationRecord]);
          if (notificationError) console.error("Error creating status change notification:", notificationError);
        }
    }
  };

  const handleSigningStatusUpdate = async (contractId: string, newStatus: SigningStatus) => {
    if (!currentUser || !currentUser.companyId || !currentUser.appId) return;
    const { error } = await supabase
        .from('contracts')
        .update({ signing_status: newStatus, signing_status_updated_at: new Date().toISOString() })
        .eq('id', contractId);

    if (error) {
        console.error("Error updating signing status:", error);
        alert(`Failed to update signing status: ${error.message}`);
    } else {
        const contract = contracts.find(c => c.id === contractId);
        if (contract && contract.owner.id !== currentUser.id) {
            const notificationRecord = {
                user_id: contract.owner.id,
                type: 'SIGNING_PROGRESS' as const,
                message: `The signing status for "${contract.title}" is now: ${newStatus}.`,
                related_entity_type: 'contract' as const,
                related_entity_id: contractId,
                company_id: currentUser.companyId,
                app_id: currentUser.appId,
            };
            const { error: notificationError } = await supabase.from('notifications').insert([notificationRecord]);
            if (notificationError) {
                console.error("Error creating signing progress notification:", notificationError);
            }
        }
        await fetchAndMergeContract(contractId);
    }
  };

  const handleMarkAsExecuted = (contractId: string) => {
      handleContractTransition(contractId, ContractStatus.FULLY_EXECUTED);
  };

  const handleRenewalDecision = async (renewalRequestId: string, mode: RenewalMode, notes?: string) => {
    const contractToUpdate = contracts.find(c => c.renewalRequest?.id === renewalRequestId);
    if (!contractToUpdate) return;
  
    let action = '';
    let payload = { reason_code: notes };
  
    if (mode === RenewalMode.AMENDMENT) {
      action = 'RENEW_AMEND_START';
    } else if (mode === RenewalMode.TERMINATE) {
      action = 'RENEW_DECIDE_TERMINATE';
    } else {
      console.error(`handleRenewalDecision called with invalid mode: ${mode}`);
      return;
    }
  
    const { error } = await supabase.rpc('contract_transition', {
      p_contract_id: contractToUpdate.id,
      p_action: action,
      p_payload: payload,
    });
  
    if (error) {
      console.error(`Error processing renewal decision (${mode}):`, error);
      alert(`Failed to process renewal decision: ${error.message}`);
    } else {
      if (mode === RenewalMode.AMENDMENT) {
        alert("Amendment process started. A new contract version has been created for your changes. The contract is now in 'In Review' status.");
      }
      await fetchAndMergeContract(contractToUpdate.id);
    }
  };
  
  const handleStartRenegotiation = async (contractId: string, notes?: string) => {
    const { error } = await supabase.rpc('contract_transition', {
        p_contract_id: contractId,
        p_action: 'RENEW_RENEGOTIATE_START',
        p_payload: { notes: notes },
    });

    if (error) {
        console.error("Error starting renegotiation:", error);
        alert(`Failed to start renegotiation: ${error.message}`);
    } else {
        alert('New renewal contract draft created successfully. You will now be taken to the new draft.');
        // The subscription will handle the UI update, but we can optimistically fetch
        await fetchAndMergeContract(contractId);
        const { data: newContract } = await supabase.from('contracts').select('id').eq('parent_contract_id', contractId).order('created_at', { ascending: false }).limit(1).single();
        if (newContract) {
            const fullNewContract = await fetchAndMergeContract(newContract.id);
            if(fullNewContract) handleSelectContract(fullNewContract);
        }
    }
  };

  const handleCreateRenewalRequest = async (contractId: string) => {
    const { error } = await supabase.rpc('contract_transition', { 
        p_contract_id: contractId, 
        p_action: 'START_RENEWAL',
        p_payload: {} // Explicitly pass empty payload to avoid PGRST202 errors with some PostgREST versions/configs
    });

    if (error) {
        console.error("Error creating renewal request:", error);
        alert(`Failed to create renewal request: ${error.message}`);
    } else {
        await fetchAndMergeContract(contractId);
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

  const handleRenewAsIs = async (contractId: string, notes?: string) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract || !currentUser || !contract.renewalRequest) return;

    const termMonths = contract.renewalRequest.renewalTermMonths ?? contract.renewalTermMonths ?? 12;
    const originalEndDate = new Date(contract.endDate + 'T00:00:00Z');
    const newStartDate = new Date(originalEndDate);
    newStartDate.setUTCDate(newStartDate.getUTCDate() + 1);
    
    const newEndDate = new Date(newStartDate);
    newEndDate.setUTCMonth(newEndDate.getUTCMonth() + termMonths);
    newEndDate.setUTCDate(newEndDate.getUTCDate() - 1);
    
    const upliftPercent = contract.renewalRequest?.upliftPercent ?? contract.upliftPercent ?? 0;
    const newValue = contract.value * (1 + (upliftPercent / 100));

    const { error } = await supabase.rpc('contract_transition', {
      p_contract_id: contract.id,
      p_action: 'RENEW_AS_IS',
      p_payload: {
        new_start_date: newStartDate.toISOString().split('T')[0],
        new_end_date: newEndDate.toISOString().split('T')[0],
        new_value: newValue,
        require_reexecution: false,
        notes: notes,
      },
    });

    if (error) {
      console.error("Error creating 'Renew As-Is' contract:", error);
      alert(`Failed to renew contract: ${error.message}`);
    } else {
       alert("Contract renewed as-is successfully! The original contract has been superseded, and a new active contract has been created.");
       // Fetch both the original (now superseded) and the new contract
       await fetchAndMergeContract(contract.id);
       const { data: newContract } = await supabase.from('contracts').select('id').eq('parent_contract_id', contract.id).order('created_at', { ascending: false }).limit(1).single();
       if (newContract?.id) {
           await fetchAndMergeContract(newContract.id);
       }
    }
  };

  const handleCreateNewVersion = useCallback(
  async (
    contractId: string,
    newVersionData: Omit<ContractVersion, 'id' | 'versionNumber' | 'createdAt' | 'author'> & {
      file?: File | null;
      fileName?: string;
    }
  ) => {
    if (!currentUser?.companyId || !currentUser?.appId) return;

    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;

    const latestVersionNumber =
      contract.versions.length > 0
        ? Math.max(...contract.versions.map(v => v.versionNumber))
        : 0;

    const file = newVersionData.file ?? null;
    let storagePath: string | null = null;
    let fileNameToStore: string | null = null;

    if (file) {
      const originalFileName =
        newVersionData.fileName || file.name || 'contract_document';
      const safeFileName = originalFileName.replace(/[^\w.\-]/g, '_');

      storagePath = `${currentUser.companyId}/${contractId}/v${
        latestVersionNumber + 1
      }_${safeFileName}`;
      fileNameToStore = originalFileName;

      const { error: uploadError } = await supabase.storage
        .from('contract_documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'application/octet-stream',
        });

      if (uploadError) {
        console.error('Error uploading new version file:', uploadError);
        alert(`Failed to upload file for new version: ${uploadError.message}`);
        return;
      }
    }

    const { data: insertedVersion, error: versionError } = await supabase
      .from('contract_versions')
      .insert({
        contract_id: contractId,
        version_number: latestVersionNumber + 1,
        author_id: currentUser.id,
        content: newVersionData.content,
        file_name: fileNameToStore ?? newVersionData.fileName ?? null,
        storage_path: storagePath,
        value: newVersionData.value,
        effective_date: newVersionData.effectiveDate,
        end_date: newVersionData.endDate,
        frequency: newVersionData.frequency,
        seasonal_months: newVersionData.seasonalMonths,
        property_id: newVersionData.property?.id ?? null,
        company_id: currentUser.companyId,
        app_id: currentUser.appId,
      })
      .select()
      .single();

    if (versionError || !insertedVersion) {
      console.error('Error creating new version:', versionError);
      alert('Failed to create new contract version.');
      return;
    }

    await fetchData(currentUser);
  },
  [contracts, currentUser, fetchData]
);


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

    const contract = contracts.find(c => c.versions.some(v => v.id === versionId));
    const mentionRegex = /@([\w\s]+)/g;
    const mentionedNames = new Set(Array.from(content.matchAll(mentionRegex), m => m[1].trim()));

    if (mentionedNames.size > 0 && contract) {
      const mentionedUsers = users.filter(u =>
        mentionedNames.has(`${u.firstName} ${u.lastName}`) && u.id !== currentUser.id
      );

      if (mentionedUsers.length > 0) {
        const notificationRecords = mentionedUsers.map(user => ({
          user_id: user.id,
          type: 'COMMENT_MENTION' as const,
          message: `${currentUser.firstName} ${currentUser.lastName} mentioned you in a comment on "${contract.title}".`,
          related_entity_type: 'contract' as const,
          related_entity_id: contract.id,
          company_id: currentUser.companyId,
          app_id: currentUser.appId,
        }));

        const { error: notificationError } = await supabase.from('notifications').insert(notificationRecords);
        if (notificationError) {
          console.error("Error creating mention notifications:", notificationError);
        }
      }
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
    await authHandleCreateUser(userData);
    if (currentUser) {
       await fetchData(currentUser);
    }
  };
  
  const handleGlobalSearch = useCallback(async (term: string) => {
    if (!term.trim() || !currentUser?.companyId) {
        setGlobalSearchResults([]);
        setGlobalSearchTerm('');
        return;
    }

    setIsPerformingGlobalSearch(true);
    setGlobalSearchTerm(term);
    
    setActiveView('search');
    setSelectedContract(null);
    setSelectedTemplate(null);
    setSelectedCounterparty(null);
    setSelectedProperty(null);
    setInitialFilters({});

    try {
        const { data, error } = await supabase.functions.invoke('global-search', {
            body: { term, companyId: currentUser.companyId },
        });

        if (error) {
            throw error;
        }

        setGlobalSearchResults(data as SearchResult[]);
    } catch (error) {
        console.error("Error performing global search:", error);
        alert(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setGlobalSearchResults([]);
    } finally {
        setIsPerformingGlobalSearch(false);
    }
  }, [currentUser]);

  const handleDownloadFile = useCallback(async (storagePath: string, fileName: string) => {
    const { data, error } = await supabase.storage.from('contract_documents').download(storagePath);

    if (error) {
      console.error('Error downloading file:', error);
      alert(`Failed to download file: ${error.message}`);
      return;
    }
    
    const blob = new Blob([data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }, []);

  const contextValue: AppContextType = {
    currentUser,
    company,
    isLoading,
    activeView,
    theme,
    handleThemeChange,
    handleNavigate,
    handleNavigateToRenewalWorkspace,
    handleMetricNavigation,
    contracts,
    templates,
    counterparties,
    properties,
    users,
    roles,
    notifications,
    notificationSettings,
    userNotificationSettings,
    unreadCount,
    lastUpdated,
    selectedContract,
    selectedTemplate,
    selectedCounterparty,
    selectedProperty,
    initialFilters,
    isCreatingContract,
    initialCreateData,
    isCreatingCounterparty,
    isCreatingProperty,
    editingCounterparty,
    editingProperty,
    isAddingUser,
    setIsAddingUser,
    handleStartCreate,
    handleCancelCreate,
    handleStartCreateCounterparty,
    handleCancelCreateCounterparty,
    handleStartEditCounterparty,
    handleCancelEditCounterparty,
    handleStartCreateProperty,
    handleCancelCreateProperty,
    handleStartEditProperty,
    handleCancelEditProperty,
    handleUseTemplate,
    handleFinalizeCreate,
    handleFinalizeCreateCounterparty,
    handleFinalizeEditCounterparty,
    handleFinalizeCreateProperty,
    handleFinalizeEditProperty,
    handleContractTransition,
    handleSigningStatusUpdate,
    handleMarkAsExecuted,
    handleRenewalDecision,
    handleStartRenegotiation,
    handleCreateRenewalRequest,
    handleUpdateRenewalTerms,
    handleRenewAsIs,
    handleCreateNewVersion,
    handleUpdateRolePermissions,
    handleCreateRole,
    handleDeleteRole,
    handleCreateComment,
    handleResolveComment,
    handleCreateRenewalFeedback,
    handleMarkAllAsRead,
    handleMarkOneAsRead,
    handleNotificationClick,
    handleCreateUser,
    handleSelectContract,
    handleBackToList,
    handleSelectTemplate,
    handleBackToTemplatesList,
    handleSelectCounterparty,
    handleBackToCounterpartiesList,
    handleSelectProperty,
    handleBackToPropertiesList,
    isPerformingGlobalSearch,
    globalSearchResults,
    globalSearchTerm,
    handleGlobalSearch,
    handleDownloadFile,
    setNotificationSettings,
    setUserNotificationSettings,
    setUsers,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};