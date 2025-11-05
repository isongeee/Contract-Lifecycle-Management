
import React, { useState, useEffect, useCallback } from 'react';
import type { Contract, ContractTemplate, Counterparty, Property, ContractStatus as ContractStatusType, ContractVersion, UserProfile, Role, NotificationSetting, UserNotificationSettings, AllocationType, PermissionSet } from './types';
import { ContractStatus, RiskLevel, ApprovalStatus } from './types';
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
import { supabase } from './lib/supabaseClient';
import { LoaderIcon } from './components/icons';
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setSession(session);
        setIsAuthenticated(!!session);
        if (session?.user) {
            const profile = await getUserProfile(session.user.id);
            setCurrentUser(profile);
        } else {
            setCurrentUser(null);
            setCompany(null);
            setContracts([]);
            setCounterparties([]);
            setProperties([]);
            setUsers([]);
            setRoles([]);
        }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setIsAuthenticated(!!session);
        if (session?.user) {
            getUserProfile(session.user.id).then(setCurrentUser);
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
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    const companyId = user.companyId;

    // Fetch Company Info
    const { data: companyData } = await supabase.from('companies').select('id, name, slug').eq('id', companyId).single();
    setCompany(companyData);

    // Fetch users first to calculate role counts
    const { data: usersData } = await supabase.from('users').select('*').eq('company_id', companyId);
    
    const userCountsByRole = (usersData || []).reduce((acc, user) => {
        if (user.role_id) {
            acc[user.role_id] = (acc[user.role_id] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    // Fetch roles and enrich with user counts
    const { data: rolesData } = await supabase.from('roles').select('*').eq('company_id', companyId);
    setRoles((rolesData || []).map(r => ({
        ...r, 
        userCount: userCountsByRole[r.id] || 0,
        permissions: r.permissions as any 
    })).sort((a, b) => a.name.localeCompare(b.name)));
    const rolesMap = new Map((rolesData || []).map(r => [r.id, r.name]));
    
    const mappedUsers: UserProfile[] = (usersData || []).map(u => ({
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        phone: u.phone,
        jobTitle: u.job_title,
        department: u.department,
        avatarUrl: u.avatar_url,
        role: rolesMap.get(u.role_id) || 'Unknown',
        roleId: u.role_id,
        status: u.status,
        lastLogin: u.last_login,
        companyId: u.company_id,
        appId: u.app_id,
    }));
    const usersMap = new Map(mappedUsers.map(u => [u.id, u]));
    setUsers(mappedUsers);
    
    const { data: counterpartiesData } = await supabase.from('counterparties').select('*').eq('company_id', companyId);
    const mappedCounterparties: Counterparty[] = (counterpartiesData || []).map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        addressLine1: c.address_line1,
        addressLine2: c.address_line2,
        city: c.city,
        state: c.state,
        zipCode: c.zip_code,
        country: c.country,
        contactName: c.contact_name,
        contactEmail: c.contact_email,
        contactPhone: c.contact_phone
    }));
    const counterpartiesMap = new Map(mappedCounterparties.map(c => [c.id, c]));
    setCounterparties(mappedCounterparties);

    const { data: propertiesData } = await supabase.from('properties').select('*').eq('company_id', companyId);
    const mappedProperties: Property[] = (propertiesData || []).map(p => ({
        id: p.id,
        name: p.name,
        addressLine1: p.address_line1,
        addressLine2: p.address_line2,
        city: p.city,
        state: p.state,
        country: p.country,
        zipCode: p.zip_code
    }));
    const propertiesMap = new Map(mappedProperties.map(p => [p.id, p]));
    setProperties(mappedProperties);

    const { data: contractsData } = await supabase.from('contracts').select('*').eq('company_id', companyId);
    const contractIds = (contractsData || []).map(c => c.id);

    const { data: versionsData } = contractIds.length > 0 ? await supabase.from('contract_versions').select('*').in('contract_id', contractIds) : { data: [] };
    const { data: approvalsData } = contractIds.length > 0 ? await supabase.from('approval_steps').select('*').in('contract_id', contractIds) : { data: [] };
    const { data: allocationsData } = contractIds.length > 0 ? await supabase.from('contract_property_allocations').select('*').in('contract_id', contractIds) : { data: [] };
    
    const contractsById = new Map();
    for (const c of (contractsData || [])) {
      contractsById.set(c.id, {
        id: c.id, title: c.title, type: c.type, status: c.status,
        riskLevel: c.risk_level,
        effectiveDate: c.effective_date,
        endDate: c.end_date,
        renewalDate: c.renewal_date,
        value: c.value, frequency: c.frequency, allocation: c.allocation,
        seasonalMonths: c.seasonal_months,
        owner: usersMap.get(c.owner_id),
        counterparty: counterpartiesMap.get(c.counterparty_id),
        property: propertiesMap.get(c.property_id),
        submittedAt: c.submitted_at,
        reviewStartedAt: c.review_started_at,
        approvalStartedAt: c.approval_started_at,
        approvalCompletedAt: c.approval_completed_at,
        sentForSignatureAt: c.sent_for_signature_at,
        executedAt: c.executed_at,
        activeAt: c.active_at,
        expiredAt: c.expired_at,
        archivedAt: c.archived_at,
        updatedAt: c.updated_at,
        signatureProvider: c.signature_provider,
        signatureEnvelopeId: c.signature_envelope_id,
        signatureStatus: c.signature_status,
        executedFileUrl: c.executed_file_url,
        currentVersionId: c.current_version_id,
        versions: [], approvalSteps: [], propertyAllocations: [],
      });
    }

    for (const version of (versionsData || [])) {
        const contract = contractsById.get(version.contract_id);
        if (contract) {
            contract.versions.push({
                ...version,
                versionNumber: version.version_number,
                createdAt: version.created_at,
                fileName: version.file_name,
                effectiveDate: version.effective_date,
                endDate: version.end_date,
                renewalDate: version.renewal_date,
                seasonalMonths: version.seasonal_months,
                author: usersMap.get(version.author_id),
                property: propertiesMap.get(version.property_id),
            });
        }
    }
    
    for (const approval of (approvalsData || [])) {
        const contract = contractsById.get(approval.contract_id);
        if (contract) {
            contract.approvalSteps.push({
                ...approval,
                approvedAt: approval.approved_at,
                approver: usersMap.get(approval.approver_id),
            });
        }
    }

    for (const allocation of (allocationsData || [])) {
        const contract = contractsById.get(allocation.contract_id);
        if (contract) {
            contract.propertyAllocations.push({
                ...allocation,
                propertyId: allocation.property_id,
                allocatedValue: allocation.allocated_value,
                monthlyValues: allocation.monthly_values,
                manualEdits: allocation.manual_edits,
            });
        }
    }

    for (const contract of contractsById.values()) {
        contract.versions.sort((a: ContractVersion, b: ContractVersion) => a.versionNumber - b.versionNumber);
    }
    
    setContracts(Array.from(contractsById.values()));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if(currentUser) {
        fetchData(currentUser);
    }
  }, [currentUser, fetchData]);


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
      title: newContractData.title,
      type: newContractData.type,
      status: ContractStatus.DRAFT,
      risk_level: newContractData.riskLevel,
      counterparty_id: newContractData.counterparty?.id,
      property_id: newContractData.property?.id,
      owner_id: newContractData.owner?.id,
      effective_date: newContractData.effectiveDate,
      end_date: newContractData.endDate,
      renewal_date: newContractData.renewalDate,
      value: newContractData.value,
      frequency: newContractData.frequency,
      seasonal_months: newContractData.seasonalMonths,
      allocation: newContractData.allocation,
      company_id: currentUser.companyId,
      app_id: currentUser.appId,
    };
    
    const { data: insertedContract, error: contractError } = await supabase.from('contracts').insert(contractRecord).select().single();
    if (contractError) {
      console.error("Error creating contract:", contractError);
      return;
    }

    const versionData = newContractData.versions![0];
    const versionRecord = {
      contract_id: insertedContract.id,
      version_number: 1,
      author_id: versionData.author.id,
      content: versionData.content,
      value: versionData.value,
      effective_date: versionData.effectiveDate,
      end_date: versionData.endDate,
      renewal_date: versionData.renewalDate,
      frequency: versionData.frequency,
      seasonal_months: versionData.seasonalMonths,
      property_id: versionData.property?.id,
      company_id: currentUser.companyId,
      app_id: currentUser.appId,
    };
    const { error: versionError } = await supabase.from('contract_versions').insert(versionRecord);
     if (versionError) {
      console.error("Error creating version:", versionError);
      return;
    }
    
    if (newContractData.propertyAllocations && newContractData.propertyAllocations.length > 0) {
      const allocationRecords = newContractData.propertyAllocations.map(alloc => ({
        contract_id: insertedContract.id,
        property_id: alloc.propertyId === 'portfolio' ? null : alloc.propertyId,
        monthly_values: alloc.monthlyValues,
        manual_edits: alloc.manualEdits,
        allocated_value: alloc.allocatedValue,
        company_id: currentUser.companyId,
        app_id: currentUser.appId,
      }));
      const { error: allocationError } = await supabase.from('contract_property_allocations').insert(allocationRecords);
      if (allocationError) {
        console.error("Error creating allocations:", allocationError);
        return;
      }
    }
    
    await fetchData(currentUser);
    setIsCreatingContract(false);
  };

  const handleStartCreateCounterparty = () => setIsCreatingCounterparty(true);
  const handleCancelCreateCounterparty = () => setIsCreatingCounterparty(false);
  const handleFinalizeCreateCounterparty = async (newCounterpartyData: Omit<Counterparty, 'id'>) => {
     if (!currentUser?.companyId || !currentUser?.appId) return;
    const { data: insertedCounterparty, error } = await supabase.from('counterparties').insert({
        name: newCounterpartyData.name,
        type: newCounterpartyData.type,
        address_line1: newCounterpartyData.addressLine1,
        address_line2: newCounterpartyData.addressLine2,
        city: newCounterpartyData.city,
        state: newCounterpartyData.state,
        zip_code: newCounterpartyData.zipCode,
        country: newCounterpartyData.country,
        contact_name: newCounterpartyData.contactName,
        contact_email: newCounterpartyData.contactEmail,
        contact_phone: newCounterpartyData.contactPhone,
        company_id: currentUser.companyId,
        app_id: currentUser.appId,
    }).select().single();
    
    if (error) {
        console.error("Error creating counterparty:", error);
    } else if (insertedCounterparty) {
        setCounterparties(prev => [...prev, {
            ...insertedCounterparty,
            addressLine1: insertedCounterparty.address_line1,
            addressLine2: insertedCounterparty.address_line2,
            zipCode: insertedCounterparty.zip_code,
            contactName: insertedCounterparty.contact_name,
            contactEmail: insertedCounterparty.contact_email,
            contactPhone: insertedCounterparty.contact_phone
        }]);
    }
    setIsCreatingCounterparty(false);
  };
  
  const handleStartCreateProperty = () => setIsCreatingProperty(true);
  const handleCancelCreateProperty = () => setIsCreatingProperty(false);
  const handleFinalizeCreateProperty = async (newPropertyData: Omit<Property, 'id'>) => {
    if (!currentUser?.companyId || !currentUser?.appId) return;
    const { data: insertedProperty, error } = await supabase.from('properties').insert({
        name: newPropertyData.name,
        address_line1: newPropertyData.addressLine1,
        address_line2: newPropertyData.addressLine2,
        city: newPropertyData.city,
        state: newPropertyData.state,
        zip_code: newPropertyData.zipCode,
        country: newPropertyData.country,
        company_id: currentUser.companyId,
        app_id: currentUser.appId,
    }).select().single();

     if (error) {
        console.error("Error creating property:", error);
    } else if (insertedProperty) {
        setProperties(prev => [...prev, {
            ...insertedProperty,
            addressLine1: insertedProperty.address_line1,
            addressLine2: insertedProperty.address_line2,
            zipCode: insertedProperty.zip_code,
        }]);
    }
    setIsCreatingProperty(false);
  };

  const handleContractTransition = async (contractId: string, action: ContractAction, payload?: any) => {
    if (!currentUser) return;
    
    let rpcPayload = payload;
    // Transform payload for specific actions that need it
    if (action === ContractStatus.PENDING_APPROVAL && payload.approvers) {
        rpcPayload = {
            ...payload,
            approvers: payload.approvers.map((a: UserProfile) => a.id)
        };
    }
    
    const { error } = await supabase.rpc('handle_contract_transition', {
        p_contract_id: contractId,
        p_action: action,
        p_payload: rpcPayload,
    });

    if (error) {
      console.error("Error transitioning contract state:", error);
      alert(`Failed to update contract: ${error.message}`);
    } else {
      await fetchData(currentUser);
      // If the currently viewed contract was updated, make sure to update it
      if (selectedContract && selectedContract.id === contractId) {
        const {data} = await supabase.from('contracts').select('*').eq('id', contractId).single();
        if(data) {
          // This is a simplified refresh. A full refresh would require re-fetching versions, etc.
          // The full fetchData call above should handle this correctly, but this is a fallback.
           setSelectedContract(prev => prev ? { ...prev, status: data.status } : null);
        }
      }
    }
  };


  const handleCreateNewVersion = async (contractId: string, newVersionData: Omit<ContractVersion, 'id' | 'versionNumber' | 'createdAt' | 'author'>) => {
      if (!currentUser?.companyId || !currentUser?.appId) return;
      let contractToUpdate = contracts.find(c => c.id === contractId);
      if (!contractToUpdate) return;
      
      const latestVersionNumber = contractToUpdate.versions.length > 0 ? Math.max(...contractToUpdate.versions.map(v => v.versionNumber)) : 0;
      
      const { data: insertedVersion, error: versionError } = await supabase.from('contract_versions').insert({
          contract_id: contractId,
          version_number: latestVersionNumber + 1,
          author_id: currentUser.id,
          content: newVersionData.content,
          file_name: newVersionData.fileName,
          value: newVersionData.value,
          effective_date: newVersionData.effectiveDate,
          end_date: newVersionData.endDate,
          renewal_date: newVersionData.renewalDate,
          frequency: newVersionData.frequency,
          seasonal_months: newVersionData.seasonalMonths,
          property_id: newVersionData.property?.id,
          company_id: currentUser.companyId,
          app_id: currentUser.appId,
      }).select().single();
      
      if (versionError) { console.error("Error creating new version:", versionError); return; }

      const { error: contractUpdateError } = await supabase.from('contracts').update({
          value: newVersionData.value,
          effective_date: newVersionData.effectiveDate,
          end_date: newVersionData.endDate,
          renewal_date: newVersionData.renewalDate,
          frequency: newVersionData.frequency,
          seasonal_months: newVersionData.seasonalMonths,
          property_id: newVersionData.property?.id,
          status: ContractStatus.IN_REVIEW, // A new version always moves the contract back to review
          approval_completed_at: null, // Reset approval timestamp
          approval_started_at: null,
      }).eq('id', contractId);

      if (contractUpdateError) { console.error("Error updating contract:", contractUpdateError); return; }

      // When a new version is created, we reset approval steps.
      const { error: approvalError } = await supabase.from('approval_steps').delete().eq('contract_id', contractId);
      if (approvalError) { console.error("Error clearing old approvals:", approvalError); }

      await fetchData(currentUser);
  };

  const handleUpdateRolePermissions = async (roleId: string, newPermissions: PermissionSet) => {
    const { error } = await supabase
        .from('roles')
        .update({ permissions: newPermissions })
        .eq('id', roleId);

    if (error) {
        console.error("Error updating role permissions:", error);
        alert("Failed to update role permissions.");
        return;
    }

    setRoles(prevRoles => prevRoles.map(role =>
        role.id === roleId ? { ...role, permissions: newPermissions } : role
    ));
  };

  const handleCreateRole = async (name: string, description: string) => {
    if (!currentUser?.companyId || !currentUser?.appId) return;

    const { data, error } = await supabase.from('roles').insert({
        name,
        description,
        permissions: requestorPermissions,
        company_id: currentUser.companyId,
        app_id: currentUser.appId,
    }).select().single();

    if (error) {
        console.error("Error creating role:", error);
        alert("Failed to create role.");
        return;
    }

    if (data) {
        setRoles(prev => [...prev, { ...data, userCount: 0, permissions: data.permissions as any }].sort((a,b) => a.name.localeCompare(b.name)));
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    const roleToDelete = roles.find(r => r.id === roleId);
    if (!roleToDelete) return;

    if (roleToDelete.name === 'Admin') {
        alert("The default Admin role cannot be deleted.");
        return;
    }

    if (roleToDelete.userCount > 0) {
        alert("Cannot delete a role that has users assigned to it. Please reassign users first.");
        return;
    }
    
    if (!window.confirm(`Are you sure you want to delete the "${roleToDelete.name}" role? This action cannot be undone.`)) {
        return;
    }

    const { error } = await supabase.from('roles').delete().eq('id', roleId);
    
    if (error) {
        console.error("Error deleting role:", error);
        alert("Failed to delete role.");
        return;
    }
    
    setRoles(prev => prev.filter(r => r.id !== roleId));
  };


  const renderContent = () => {
    if (isLoading || !currentUser) {
        return (
            <div className="flex items-center justify-center h-full">
                <LoaderIcon className="w-12 h-12 text-primary" />
                <span className="ml-4 text-lg font-semibold text-gray-700 dark:text-gray-200">Loading Data...</span>
            </div>
        )
    }
    switch(activeView) {
      case 'dashboard':
        return <Dashboard contracts={contracts} onMetricClick={handleMetricNavigation} currentUser={currentUser} />;
      case 'contracts':
        return selectedContract ? (
          <ContractDetail 
            contract={selectedContract} 
            users={users}
            properties={properties}
            currentUser={currentUser}
            onBack={handleBackToList} 
            onTransition={handleContractTransition}
            onCreateNewVersion={handleCreateNewVersion}
          />
        ) : (
          <ContractsList 
            contracts={contracts} 
            onSelectContract={handleSelectContract} 
            onStartCreate={handleStartCreate}
            initialFilters={initialFilters}
            currentUser={currentUser}
          />
        );
      case 'approvals':
        return <ApprovalsPage contracts={contracts} onTransition={handleContractTransition} currentUser={currentUser} />;
      case 'templates':
        return selectedTemplate ? (
            <TemplateDetail template={selectedTemplate} onBack={handleBackToTemplatesList} />
        ) : (
            <TemplatesList templates={templates} onSelectTemplate={handleSelectTemplate} />
        );
      case 'counterparties':
        return selectedCounterparty ? (
            <CounterpartyDetail 
                counterparty={selectedCounterparty}
                contracts={contracts.filter(c => c.counterparty.id === selectedCounterparty.id)}
                onBack={handleBackToCounterpartiesList}
                onSelectContract={handleSelectContract}
            />
        ) : (
            <CounterpartiesList 
                counterparties={counterparties} 
                contracts={contracts} 
                onSelectCounterparty={handleSelectCounterparty}
                onStartCreate={handleStartCreateCounterparty}
                currentUser={currentUser}
            />
        );
      case 'properties':
        return selectedProperty ? (
          <PropertyDetail
            property={selectedProperty}
            contracts={contracts.filter(c => c.property?.id === selectedProperty.id)}
            onBack={handleBackToPropertiesList}
            onSelectContract={handleSelectContract}
          />
        ) : (
          <PropertiesList
            properties={properties}
            contracts={contracts}
            onSelectProperty={handleSelectProperty}
            onStartCreate={handleStartCreateProperty}
            currentUser={currentUser}
          />
        );
      case 'profile':
        return <ProfilePage 
                    currentUser={currentUser} 
                    theme={theme} 
                    onThemeChange={handleThemeChange}
                    notificationSettings={userNotificationSettings}
                    setNotificationSettings={setUserNotificationSettings}
                />;
      case 'company-settings':
        return <CompanySettingsPage 
                    users={users}
                    roles={roles}
                    notificationSettings={notificationSettings}
                    company={company}
                    currentUser={currentUser}
                    setUsers={setUsers}
                    onUpdateRolePermissions={handleUpdateRolePermissions}
                    onCreateRole={handleCreateRole}
                    onDeleteRole={handleDeleteRole}
                    setNotificationSettings={setNotificationSettings}
                />;
      default:
        return <div className="p-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm"><h2 className="text-xl font-bold">{activeView.charAt(0).toUpperCase() + activeView.slice(1)}</h2><p className="mt-2 text-gray-500 dark:text-gray-400">This section is not yet implemented.</p></div>;
    }
  };

  if (!isAuthenticated) {
    const renderAuthContent = () => {
        switch (authView) {
            case 'login':
                return <LoginPage onLogin={handleLogin} onNavigate={setAuthView} />;
            case 'org-signup':
                return <OrgSignUpPage onSignUp={() => setAuthView('login')} onNavigate={setAuthView} />;
            case 'user-signup':
                 return <UserSignUpPage onSignUp={() => setAuthView('login')} onNavigate={setAuthView} />;
            default:
                return <LoginPage onLogin={handleLogin} onNavigate={setAuthView} />;
        }
    }
    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans text-gray-900 dark:text-gray-100 flex items-center justify-center p-4">
            {renderAuthContent()}
        </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans text-gray-900 dark:text-gray-100 flex">
      <Sidebar activeView={activeView} onNavigate={handleNavigate} currentUser={currentUser} />
      <div className="flex-1 flex flex-col">
        <Header onLogout={handleLogout} onNavigate={handleNavigate} currentUser={currentUser} />
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
      {isCreatingContract && currentUser && (
        <CreateContractWorkflow
            properties={properties}
            counterparties={counterparties}
            users={users}
            onCancel={handleCancelCreate}
            onFinish={handleFinalizeCreate}
            currentUser={currentUser}
        />
      )}
      {isCreatingCounterparty && (
        <CreateCounterpartyWorkflow
            onCancel={handleCancelCreateCounterparty}
            onFinish={handleFinalizeCreateCounterparty}
        />
      )}
      {isCreatingProperty && (
        <CreatePropertyWorkflow
            onCancel={handleCancelCreateProperty}
            onFinish={handleFinalizeCreateProperty}
        />
      )}
    </div>
  );
}
