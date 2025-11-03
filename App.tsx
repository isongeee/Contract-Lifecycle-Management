import React, { useState, useEffect } from 'react';
import type { Contract, ContractTemplate, Counterparty, Property, ContractStatus as ContractStatusType, ContractVersion, UserProfile, Role, NotificationSetting, UserNotificationSettings } from './types';
import { ContractStatus, RiskLevel, ApprovalStatus } from './types';
import { MOCK_CONTRACTS, MOCK_TEMPLATES, USERS, COUNTERPARTIES, MOCK_PROPERTIES, MOCK_FULL_USER_LIST, MOCK_ROLES, MOCK_NOTIFICATION_SETTINGS, MOCK_USER_NOTIFICATION_SETTINGS } from './constants';
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


// In a real app, this would come from an auth context
const currentUser = USERS['alice'];

export default function App() {
  const [contracts, setContracts] = useState<Contract[]>(MOCK_CONTRACTS);
  const [templates] = useState<ContractTemplate[]>(MOCK_TEMPLATES);
  const [counterparties, setCounterparties] = useState<Counterparty[]>(Object.values(COUNTERPARTIES));
  const [properties, setProperties] = useState<Property[]>(Object.values(MOCK_PROPERTIES));
  const [users, setUsers] = useState<UserProfile[]>(MOCK_FULL_USER_LIST);
  const [roles, setRoles] = useState<Role[]>(MOCK_ROLES);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>(MOCK_NOTIFICATION_SETTINGS);
  const [userNotificationSettings, setUserNotificationSettings] = useState<UserNotificationSettings>(MOCK_USER_NOTIFICATION_SETTINGS);


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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'org-signup' | 'user-signup'>('login');

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
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveView('dashboard'); // Reset to default view on logout
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
    setInitialFilters({}); // Reset filters on direct navigation
  };
  
  const handleMetricNavigation = (metric: 'active' | 'pending' | 'high-risk' | 'my-contracts') => {
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

  const handleFinalizeCreate = (newContractData: Partial<Contract>) => {
    const newContract: Contract = {
        id: `contract-${Date.now()}`,
        status: ContractStatus.DRAFT,
        riskLevel: RiskLevel.LOW,
        versions: [],
        approvalSteps: [],
        renewalDate: newContractData.endDate || '',
        ...newContractData
    } as Contract;
    
    if (newContract.versions && newContract.versions.length > 0) {
      // Data is already correctly formatted by the workflow
    } else {
        const firstVersion: Omit<ContractVersion, 'id'> = {
            versionNumber: 1,
            createdAt: new Date().toISOString().split('T')[0],
            author: currentUser,
            content: `This contract for ${newContractData.title || 'a new matter'} was created via the wizard.`,
            fileName: 'Initial_Draft.pdf',
            value: newContractData.value || 0,
            startDate: newContractData.startDate || '',
            endDate: newContractData.endDate || '',
            renewalDate: newContractData.renewalDate || '',
            frequency: newContractData.frequency!,
            seasonalMonths: newContractData.seasonalMonths,
            property: newContractData.property,
        };
        newContract.versions = [{ ...firstVersion, id: `v1-${Date.now()}` }];
    }

    setContracts(prev => [newContract, ...prev]);
    setIsCreatingContract(false);
  };

  const handleStartCreateCounterparty = () => setIsCreatingCounterparty(true);
  const handleCancelCreateCounterparty = () => setIsCreatingCounterparty(false);
  const handleFinalizeCreateCounterparty = (newCounterpartyData: Omit<Counterparty, 'id'>) => {
    const newCounterparty: Counterparty = {
        id: `cp-${Date.now()}`,
        ...newCounterpartyData,
    };
    setCounterparties(prev => [...prev, newCounterparty]);
    setIsCreatingCounterparty(false);
  };
  
  const handleStartCreateProperty = () => setIsCreatingProperty(true);
  const handleCancelCreateProperty = () => setIsCreatingProperty(false);
  const handleFinalizeCreateProperty = (newPropertyData: Omit<Property, 'id'>) => {
    const newProperty: Property = {
        id: `prop-${Date.now()}`,
        ...newPropertyData,
    };
    setProperties(prev => [...prev, newProperty]);
    setIsCreatingProperty(false);
  };

  const handleUpdateContractStatus = (contractId: string, newStatus: ContractStatusType) => {
    setContracts(prevContracts =>
      prevContracts.map(contract =>
        contract.id === contractId ? { ...contract, status: newStatus } : contract
      )
    );
    if (selectedContract && selectedContract.id === contractId) {
        setSelectedContract(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const handleCreateNewVersion = (contractId: string, newVersionData: Omit<ContractVersion, 'id' | 'versionNumber' | 'createdAt' | 'author'>) => {
      let updatedContract: Contract | null = null;
      
      const newContracts = contracts.map(c => {
          if (c.id === contractId) {
              const latestVersionNumber = c.versions.length > 0 ? Math.max(...c.versions.map(v => v.versionNumber)) : 0;
              
              const newVersion: ContractVersion = {
                  ...newVersionData,
                  id: `v${latestVersionNumber + 1}-${Date.now()}`,
                  versionNumber: latestVersionNumber + 1,
                  createdAt: new Date().toISOString().split('T')[0],
                  author: currentUser,
              };

              updatedContract = {
                  ...c,
                  value: newVersion.value,
                  startDate: newVersion.startDate,
                  endDate: newVersion.endDate,
                  renewalDate: newVersion.renewalDate,
                  frequency: newVersion.frequency,
                  seasonalMonths: newVersion.seasonalMonths,
                  property: newVersion.property,
                  versions: [...c.versions, newVersion],
                  status: ContractStatus.IN_REVIEW,
                  approvalSteps: c.approvalSteps.map(step => ({
                      ...step,
                      status: ApprovalStatus.PENDING,
                      approvedAt: undefined,
                      comment: undefined,
                  })),
              };
              return updatedContract;
          }
          return c;
      });

      setContracts(newContracts);
      if (updatedContract && selectedContract?.id === contractId) {
          setSelectedContract(updatedContract);
      }
  };


  const renderContent = () => {
    switch(activeView) {
      case 'dashboard':
        return <Dashboard contracts={contracts} onMetricClick={handleMetricNavigation} currentUser={currentUser} />;
      case 'contracts':
        return selectedContract ? (
          <ContractDetail 
            contract={selectedContract} 
            properties={properties}
            onBack={handleBackToList} 
            onUpdateStatus={handleUpdateContractStatus}
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
        return <ApprovalsPage contracts={contracts} setContracts={setContracts} currentUser={currentUser} />;
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
                    setUsers={setUsers}
                    setRoles={setRoles}
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
      <Sidebar activeView={activeView} onNavigate={handleNavigate} />
      <div className="flex-1 flex flex-col">
        <Header onLogout={handleLogout} onNavigate={handleNavigate} currentUser={currentUser} />
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
      {isCreatingContract && (
        <CreateContractWorkflow
            properties={properties}
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