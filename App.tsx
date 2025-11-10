import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Contract, ContractTemplate, Counterparty, Property, ContractStatus as ContractStatusType, ContractVersion, UserProfile, Role, NotificationSetting, UserNotificationSettings, AllocationType, PermissionSet, AuditLog, RenewalRequest, RenewalStatus, SigningStatus, Notification } from './types';
import { ContractStatus, RiskLevel, ApprovalStatus, RenewalStatus as RenewalStatusEnum, RenewalMode, SigningStatus as SigningStatusEnum } from './types';
import { MOCK_TEMPLATES, MOCK_ROLES, MOCK_NOTIFICATION_SETTINGS, MOCK_USER_NOTIFICATION_SETTINGS, requestorPermissions } from './constants';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ContractsList from './components/ContractsList';
import ContractDetail from './components/ContractDetail';
import Dashboard from './components/Dashboard';
import ApprovalsPage from './components/ApprovalsPage';
import TemplatesList from './components/TemplatesList';
import TemplateDetail from './components/TemplateDetail';
import CounterpartiesList from './components/CounterpartiesList';
import CounterpartyDetail from './components/CounterpartyDetail';
import CreateContractWorkflow from './components/CreateContractWorkflow';
import CreateCounterpartyWorkflow from './components/CreateCounterpartyWorkflow';
import PropertiesList from './components/PropertiesList';
import CreatePropertyWorkflow from './components/CreatePropertyWorkflow';
import PropertyDetail from './components/PropertyDetail';
import ProfilePage from './components/ProfilePage';
import LoginPage from './components/LoginPage';
import OrgSignUpPage from './components/OrgSignUpPage';
import UserSignUpPage from './components/UserSignUpPage';
import CompanySettingsPage from './components/CompanySettingsPage';
import RenewalsPage from './components/RenewalsPage';
import SigningPage from './components/SigningPage';
import { supabase } from './lib/supabaseClient';
import { LoaderIcon, AlertTriangleIcon } from './components/icons';
import { Session } from '@supabase/supabase-js';
import { getUserProfile, signOut } from './lib/auth';


type ContractAction = ContractStatus | 'APPROVE_STEP' | 'REJECT_STEP';

export default function App() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [templates] = useState<ContractTemplate[]>(MOCK_TEMPLATES);
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
  const [isCreatingCounterparty, setIsCreatingCounterparty] = useState(false);
  const [isCreatingProperty, setIsCreatingProperty] = useState(false);
  const [initialFilters, setInitialFilters] = useState<{ status?: ContractStatus; riskLevels?: RiskLevel[]; ownerId?: string }>({});
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  
  // Auth State
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<{ id: string; name: string; slug: string; } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'org-signup' | 'user-signup'>('login');

  const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);

  useEffect(() => {
    // This handles real-time changes, like login/logout in another tab.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setSession(session);
        setIsAuthenticated(!!session);
        if (session?.user) {
            const profile = await getUserProfile(session.user.id);
            setCurrentUser(profile);
            if (!profile) {
              await signOut(); // If profile is gone, force a logout.
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
        }
    });

    // This handles the initial page load check.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
        setSession(session);
        setIsAuthenticated(!!session);
        if (session?.user) {
            const profile = await getUserProfile(session.user.id);
            setCurrentUser(profile);
            // This is the critical fix: if the profile load fails, we must
            // stop the main loading indicator, otherwise it hangs forever.
            if (!profile) {
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    });

    return () => subscription.unsubscribe();
  }, []);


  const fetchData = useCallback(async (user: UserProfile): Promise<Contract[]> => {
    if (!user || !user.companyId) {
        setContracts([]);
        setCounterparties([]);
        setProperties([]);
        setUsers([]);
        setRoles([]);
        setNotifications([]);
        setIsLoading(false);
        return [];
    }
    setIsLoading(true);
    const companyId = user.companyId;

    // Fetch Company Info
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

    const { data: contractsData } = await supabase.from('contracts').select('*').eq('company_id', companyId);
    const contractIds = (contractsData || []).map(c => c.id);
    
    // Fetch related data in parallel
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
    
    let allContracts = Array.from(contractsById.values());

    // Automatically transition expired active contracts
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const contractsToExpire = allContracts.filter(c => {
        if (c.status !== ContractStatus.ACTIVE) return false;
        try {
            const endDate = new Date(c.endDate);
            endDate.setHours(0, 0, 0, 0);
            return endDate < today;
        } catch (e) {
            return false;
        }
    });

    if (contractsToExpire.length > 0) {
        console.log(`Found ${contractsToExpire.length} active contracts that have expired. Updating status...`);
        const updatePromises = contractsToExpire.map(c => 
            supabase.rpc('contract_transition', { 
                p_contract_id: c.id, 
                p_action: ContractStatus.EXPIRED, 
                p_payload: {} 
            })
        );
        
        const results = await Promise.allSettled(updatePromises);
        const successfullyUpdatedIds = new Set<string>();

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                successfullyUpdatedIds.add(contractsToExpire[index].id);
            } else {
                console.error(`Failed to expire contract ${contractsToExpire[index].id}:`, result.reason);
            }
        });

        if (successfullyUpdatedIds.size > 0) {
            // Update local state to reflect the change immediately without a full refetch
            allContracts = allContracts.map(c => 
                successfullyUpdatedIds.has(c.id) 
                ? { ...c, status: ContractStatus.EXPIRED, expiredAt: new Date().toISOString() } 
                : c
            );
        }
    }

    setContracts(allContracts);
    setIsLoading(false);
    return allContracts;
  }, []);

  useEffect(() => {
    if(currentUser) {
        fetchData(currentUser);
    }
  }, [currentUser, fetchData]);
  
  // Real-time notifications
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
    let filters: { status?: ContractStatus; riskLevels?: RiskLevel[]; ownerId?: string } = {};
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

  const handleStartCreate = () => setIsCreatingContract(true);
  const handleCancelCreate = () => setIsCreatingContract(false);

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
    if (contractError) { console.error("Error creating contract:", contractError); return; }

    const versionData = newContractData.versions![0];
    const versionRecord = {
      contract_id: insertedContract.id, version_number: 1, author_id: versionData.author.id,
      content: versionData.content, file_name: versionData.fileName, value: versionData.value,
      effective_date: versionData.effectiveDate, end_date: versionData.endDate,
      frequency: versionData.frequency, seasonal_months: versionData.seasonalMonths,
      property_id: versionData.property?.id, company_id: currentUser.companyId, app_id: currentUser.appId,
    };
    const { error: versionError } = await supabase.from('contract_versions').insert([versionRecord]);
     if (versionError) { console.error("Error creating version:", versionError); return; }
    
    if (newContractData.propertyAllocations && newContractData.propertyAllocations.length > 0) {
      const allocationRecords = newContractData.propertyAllocations.map(alloc => ({
        contract_id: insertedContract.id, property_id: alloc.propertyId === 'portfolio' ? null : alloc.propertyId,
        monthly_values: alloc.monthlyValues, manual_edits: alloc.manualEdits,
        allocated_value: alloc.allocatedValue, company_id: currentUser.companyId, app_id: currentUser.appId,
      }));
      const { error: allocationError } = await supabase.from('contract_property_allocations').insert(allocationRecords);
      if (allocationError) { console.error("Error creating allocations:", allocationError); return; }
    }
    
    await fetchData(currentUser);
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
        const contract = contracts.find(c => c.id === contractId);
        if (contract) {
             if (action === ContractStatus.PENDING_APPROVAL && rpcPayload.approvers) {
                const notificationsToInsert = rpcPayload.approvers.map((approverId: string) => ({
                    user_id: approverId,
                    company_id: currentUser.companyId,
                    app_id: currentUser.appId,
                    type: 'APPROVAL_REQUEST',
                    message: `${currentUser.firstName} ${currentUser.lastName} has requested your approval on "${contract.title}".`,
                    related_entity_type: 'contract',
                    related_entity_id: contract.id
                }));
                await supabase.from('notifications').insert(notificationsToInsert);
            } else if (action === 'APPROVE_STEP' || action === 'REJECT_STEP') {
                const actionText = action === 'APPROVE_STEP' ? 'approved' : 'rejected';
                await supabase.from('notifications').insert([{
                    user_id: contract.owner.id,
                    company_id: currentUser.companyId,
                    app_id: currentUser.appId,
                    type: 'APPROVAL_RESPONSE',
                    message: `${currentUser.firstName} ${currentUser.lastName} ${actionText} the contract "${contract.title}".`,
                    related_entity_type: 'contract',
                    related_entity_id: contract.id
                }]);
            }

            const statusChangeActions: ContractStatusType[] = [
                ContractStatus.FULLY_EXECUTED,
                ContractStatus.ACTIVE,
                ContractStatus.EXPIRED,
                ContractStatus.TERMINATED,
            ];

            if (statusChangeActions.includes(action as ContractStatusType)) {
                let message = `The contract "${contract.title}" is now ${action}.`;
                 if (action === ContractStatus.TERMINATED) {
                    message = `Your contract "${contract.title}" has been Terminated.`;
                }

                await supabase.from('notifications').insert([{
                    user_id: contract.owner.id,
                    company_id: currentUser.companyId,
                    app_id: currentUser.appId,
                    type: 'STATUS_CHANGE',
                    message: message,
                    related_entity_type: 'contract',
                    related_entity_id: contract.id,
                }]);
            }
        }
        
        if (action === ContractStatus.ACTIVE) {
            if (contract?.parentContractId) {
                const parent = contracts.find(c => c.id === contract.parentContractId);
                if (parent) {
                    await supabase.from('contracts').update({ status: ContractStatus.SUPERSEDED }).eq('id', parent.id);
                    if (parent.renewalRequest) {
                        await supabase.from('renewal_requests').update({ status: RenewalStatusEnum.ACTIVATED }).eq('id', parent.renewalRequest.id);
                    }
                }
            }
        }
        const updatedContracts = await fetchData(currentUser); 
        if (selectedContract?.id === contractId) { 
          setSelectedContract(updatedContracts.find(c => c.id === contractId) || null); 
        } 
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
        const updatedContracts = await fetchData(currentUser);
        const updatedContract = updatedContracts.find(c => c.id === contractId);
        
        if (updatedContract) {
            let message = '';
            switch(newStatus) {
                case SigningStatusEnum.SENT_TO_COUNTERPARTY:
                    message = `The contract "${updatedContract.title}" has been sent to ${updatedContract.counterparty.name} for signature.`;
                    break;
                case SigningStatusEnum.VIEWED_BY_COUNTERPARTY:
                    message = `${updatedContract.counterparty.name} has viewed the contract "${updatedContract.title}".`;
                    break;
                case SigningStatusEnum.SIGNED_BY_COUNTERPARTY:
                    message = `${updatedContract.counterparty.name} has signed the contract "${updatedContract.title}".`;
                    break;
            }
            if (message) {
                await supabase.from('notifications').insert([{
                    user_id: updatedContract.owner.id,
                    company_id: currentUser.companyId,
                    app_id: currentUser.appId,
                    type: 'SIGNING_PROGRESS',
                    message: message,
                    related_entity_type: 'contract',
                    related_entity_id: updatedContract.id
                }]);
            }
        }

        if (selectedContract?.id === contractId) {
            setSelectedContract(updatedContracts.find(c => c.id === contractId) || null);
        }
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
      }

      const updatedContracts = await fetchData(currentUser);
      if (selectedContract?.id === contractToUpdate.id) {
          setSelectedContract(updatedContracts.find(c => c.id === selectedContract.id) || null);
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

    alert('New renewal contract draft created successfully. You will now be taken to the new draft.');
    const updatedContracts = await fetchData(currentUser);
    const newContract = updatedContracts.find(c => c.id === insertedContract.id);
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

    // Set internal deadline 30 days before notice deadline
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
        const updatedContracts = await fetchData(currentUser);
        if (selectedContract?.id === contract.id) {
            setSelectedContract(updatedContracts.find(c => c.id === contract.id) || null);
        }
    }
  };

  const handleUpdateRenewalTerms = async (renewalRequestId: string, updatedTerms: { renewalTermMonths: number; noticePeriodDays: number; upliftPercent: number; }) => {
    if (!currentUser) return;
    
    const { error } = await supabase.from('renewal_requests').update({
        renewal_term_months: updatedTerms.renewalTermMonths,
        notice_period_days: updatedTerms.noticePeriodDays,
        uplift_percent: updatedTerms.upliftPercent
    }).eq('id', renewalRequestId);

    if (error) {
        console.error("Error updating renewal terms:", error);
        alert(`Failed to update renewal terms: ${error.message}`);
    } else {
        const updatedContracts = await fetchData(currentUser);
        if (selectedContract?.renewalRequest?.id === renewalRequestId) {
            setSelectedContract(updatedContracts.find(c => c.id === selectedContract.id) || null);
        }
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
        const updatedContracts = await fetchData(currentUser);
        if (selectedContract?.id === contract.id) {
            setSelectedContract(updatedContracts.find(c => c.id === selectedContract.id) || null);
        }
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

       if (contractToUpdate && currentUser.id !== contractToUpdate.owner.id) {
            const newVersionNumber = latestVersionNumber + 1;
            await supabase.from('notifications').insert([{
                user_id: contractToUpdate.owner.id,
                company_id: currentUser.companyId,
                app_id: currentUser.appId,
                type: 'NEW_VERSION',
                message: `A new version (v${newVersionNumber}) of "${contractToUpdate.title}" has been uploaded by ${currentUser.firstName} ${currentUser.lastName}.`,
                related_entity_type: 'contract',
                related_entity_id: contractId
            }]);
        }

      const updatedContracts = await fetchData(currentUser);
      if (selectedContract?.id === contractId) { setSelectedContract(updatedContracts.find(c => c.id === contractId) || null); }
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
    if (error) { console.error("Error creating comment:", error); alert(`Failed to post comment: ${error.message}`); return; }

    const contract = contracts.find(c => c.versions.some(v => v.id === versionId));
    if (contract) {
        const mentionRegex = /@([\w\s]+)\b/g;
        let match;
        const mentionedNames = new Set<string>();
        while ((match = mentionRegex.exec(content)) !== null) {
            mentionedNames.add(match[1].trim());
        }

        if (mentionedNames.size > 0) {
            const mentionedUsers = users.filter(u => u.id !== currentUser.id && mentionedNames.has(`${u.firstName} ${u.lastName}`));
            const notificationsToInsert = mentionedUsers.map(user => ({
                user_id: user.id,
                company_id: currentUser.companyId,
                app_id: currentUser.appId,
                type: 'COMMENT_MENTION',
                message: `${currentUser.firstName} ${currentUser.lastName} mentioned you in a comment on "${contract.title}".`,
                related_entity_type: 'contract',
                related_entity_id: contract.id
            }));
            if (notificationsToInsert.length > 0) {
                await supabase.from('notifications').insert(notificationsToInsert);
            }
        }
    }

    const updatedContracts = await fetchData(currentUser);
    if (selectedContract) { setSelectedContract(updatedContracts.find(c => c.id === selectedContract.id) || null); }
  };
  
  const handleResolveComment = async (commentId: string, isResolved: boolean) => {
    const { error } = await supabase
      .from('comments')
      .update({ resolved_at: isResolved ? new Date().toISOString() : null })
      .eq('id', commentId);

    if (error) {
      console.error("Error updating comment status:", error);
    } else {
      const updatedContracts = await fetchData(currentUser);
       if (selectedContract) {
        setSelectedContract(updatedContracts.find(c => c.id === selectedContract.id) || null);
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
        const updatedContracts = await fetchData(currentUser);
        if (selectedContract) {
            setSelectedContract(updatedContracts.find(c => c.id === selectedContract.id) || null);
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

  const renderContent = () => {
    if (isLoading) {
        return ( <div className="flex items-center justify-center h-full"> <LoaderIcon className="w-12 h-12 text-primary" /> <span className="ml-4 text-lg font-semibold text-gray-700 dark:text-gray-200">Loading Data...</span> </div> )
    }
    // After loading, if we're authenticated but the profile failed to load, show an error.
    if (isAuthenticated && !currentUser) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <AlertTriangleIcon className="w-12 h-12 text-red-500" />
                <h2 className="mt-4 text-xl font-bold text-gray-800 dark:text-gray-100">Error Loading Profile</h2>
                <p className="mt-2 text-md text-gray-600 dark:text-gray-400">We couldn't load your user data. Please try logging out and signing in again.</p>
                 <button 
                    onClick={handleLogout}
                    className="mt-6 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700">
                    Logout
                </button>
            </div>
        )
    }
    switch(activeView) {
      case 'dashboard': return <Dashboard contracts={contracts} onMetricClick={handleMetricNavigation} currentUser={currentUser!} onSelectContract={handleSelectContract} />;
      case 'contracts': return selectedContract ? ( <ContractDetail contract={selectedContract} contracts={contracts} onSelectContract={handleSelectContract} users={users} properties={properties} currentUser={currentUser!} onBack={handleBackToList} onTransition={handleContractTransition} onCreateNewVersion={handleCreateNewVersion} onRenewalDecision={handleRenewalDecision} onCreateRenewalRequest={handleCreateRenewalRequest} onRenewAsIs={(contract, notes) => handleRenewAsIs(contract, notes)} onStartRenegotiation={handleStartRenegotiation} onUpdateSigningStatus={handleSigningStatusUpdate} onCreateComment={handleCreateComment} onResolveComment={handleResolveComment} onCreateRenewalFeedback={handleCreateRenewalFeedback} onUpdateRenewalTerms={handleUpdateRenewalTerms} /> ) : ( <ContractsList contracts={contracts} onSelectContract={handleSelectContract} onStartCreate={handleStartCreate} initialFilters={initialFilters} currentUser={currentUser!} /> );
      case 'renewals': return <RenewalsPage contracts={contracts} onSelectContract={handleSelectContract} users={users} notificationSettings={userNotificationSettings} onUpdateNotificationSettings={setUserNotificationSettings} />;
      case 'approvals': return <ApprovalsPage contracts={contracts} onTransition={handleContractTransition} currentUser={currentUser!} />;
      case 'signing': return <SigningPage contracts={contracts} onSelectContract={handleSelectContract} onUpdateSigningStatus={handleSigningStatusUpdate} onMarkAsExecuted={handleMarkAsExecuted} />;
      case 'templates': return selectedTemplate ? ( <TemplateDetail template={selectedTemplate} onBack={handleBackToTemplatesList} /> ) : ( <TemplatesList templates={templates} onSelectTemplate={handleSelectTemplate} /> );
      case 'counterparties': return selectedCounterparty ? ( <CounterpartyDetail counterparty={selectedCounterparty} contracts={contracts.filter(c => c.counterparty.id === selectedCounterparty.id)} onBack={handleBackToCounterpartiesList} onSelectContract={handleSelectContract} /> ) : ( <CounterpartiesList counterparties={counterparties} contracts={contracts} onSelectCounterparty={handleSelectCounterparty} onStartCreate={handleStartCreateCounterparty} currentUser={currentUser!} /> );
      case 'properties': return selectedProperty ? ( <PropertyDetail property={selectedProperty} contracts={contracts.filter(c => c.property?.id === selectedProperty.id)} onBack={handleBackToPropertiesList} onSelectContract={handleSelectContract} /> ) : ( <PropertiesList properties={properties} contracts={contracts} onSelectProperty={handleSelectProperty} onStartCreate={handleStartCreateProperty} currentUser={currentUser!} /> );
      case 'profile': return <ProfilePage currentUser={currentUser!} theme={theme} onThemeChange={handleThemeChange} notificationSettings={userNotificationSettings} setNotificationSettings={setUserNotificationSettings} />;
      case 'company-settings': return <CompanySettingsPage users={users} roles={roles} notificationSettings={notificationSettings} company={company} currentUser={currentUser!} setUsers={setUsers} onUpdateRolePermissions={handleUpdateRolePermissions} onCreateRole={handleCreateRole} onDeleteRole={handleDeleteRole} setNotificationSettings={setNotificationSettings} />;
      default: return <div className="p-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm"><h2 className="text-xl font-bold">{activeView.charAt(0).toUpperCase() + activeView.slice(1)}</h2><p className="mt-2 text-gray-500 dark:text-gray-400">This section is not yet implemented.</p></div>;
    }
  };

  if (!isAuthenticated && !isLoading) { // Only show login pages after initial auth check is complete
    const renderAuthContent = () => {
        switch (authView) {
            case 'login': return <LoginPage onLogin={handleLogin} onNavigate={setAuthView} />;
            case 'org-signup': return <OrgSignUpPage onSignUp={() => setAuthView('login')} onNavigate={setAuthView} />;
            case 'user-signup': return <UserSignUpPage onSignUp={() => setAuthView('login')} onNavigate={setAuthView} />;
            default: return <LoginPage onLogin={handleLogin} onNavigate={setAuthView} />;
        }
    }
    return ( <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans text-gray-900 dark:text-gray-100 flex items-center justify-center p-4"> {renderAuthContent()} </div> );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans text-gray-900 dark:text-gray-100 flex">
      <Sidebar activeView={activeView} onNavigate={handleNavigate} currentUser={currentUser} />
      <div className="flex-1 flex flex-col">
        <Header 
          onLogout={handleLogout} 
          onNavigate={handleNavigate} 
          currentUser={currentUser}
          unreadCount={unreadCount}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onMarkAllAsRead={handleMarkAllAsRead}
        />
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
      {isCreatingContract && currentUser && ( <CreateContractWorkflow properties={properties} counterparties={counterparties} users={users} onCancel={handleCancelCreate} onFinish={handleFinalizeCreate} currentUser={currentUser} /> )}
      {isCreatingCounterparty && ( <CreateCounterpartyWorkflow onCancel={handleCancelCreateCounterparty} onFinish={handleFinalizeCreateCounterparty} /> )}
      {isCreatingProperty && ( <CreatePropertyWorkflow onCancel={handleCancelCreateProperty} onFinish={handleFinalizeCreateProperty} /> )}
    </div>
  );
}