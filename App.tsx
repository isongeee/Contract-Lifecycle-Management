import React, { useState } from 'react';
import type { Contract, ContractTemplate, Counterparty, Property, ContractStatus as ContractStatusType } from './types';
import { ContractStatus, RiskLevel } from './types';
import { MOCK_CONTRACTS, MOCK_TEMPLATES, USERS, COUNTERPARTIES, MOCK_PROPERTIES } from './constants';
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

export default function App() {
  const [contracts, setContracts] = useState<Contract[]>(MOCK_CONTRACTS);
  const [templates] = useState<ContractTemplate[]>(MOCK_TEMPLATES);
  const [counterparties, setCounterparties] = useState<Counterparty[]>(Object.values(COUNTERPARTIES));
  const [properties, setProperties] = useState<Property[]>(Object.values(MOCK_PROPERTIES));
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [selectedCounterparty, setSelectedCounterparty] = useState<Counterparty | null>(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [isCreatingContract, setIsCreatingContract] = useState(false);
  const [isCreatingCounterparty, setIsCreatingCounterparty] = useState(false);
  const [isCreatingProperty, setIsCreatingProperty] = useState(false);
  const [initialFilters, setInitialFilters] = useState<{ status?: ContractStatus; riskLevels?: RiskLevel[] }>({});


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

  const handleNavigate = (view: string) => {
    setActiveView(view);
    setSelectedContract(null);
    setSelectedTemplate(null);
    setSelectedCounterparty(null);
    setInitialFilters({}); // Reset filters on direct navigation
  };
  
  const handleMetricNavigation = (metric: 'active' | 'pending' | 'high-risk') => {
    let filters: { status?: ContractStatus; riskLevels?: RiskLevel[] } = {};
    if (metric === 'active') {
        filters = { status: ContractStatus.ACTIVE };
    } else if (metric === 'pending') {
        filters = { status: ContractStatus.PENDING_APPROVAL };
    } else if (metric === 'high-risk') {
        filters = { riskLevels: [RiskLevel.HIGH, RiskLevel.CRITICAL] };
    }
    setInitialFilters(filters);
    setActiveView('contracts');
    setSelectedContract(null);
    setSelectedTemplate(null);
  };

  const handleStartCreate = () => setIsCreatingContract(true);
  const handleCancelCreate = () => setIsCreatingContract(false);

  const handleFinalizeCreate = (newContractData: Partial<Contract>) => {
    const newContract: Contract = {
        id: `contract-${Date.now()}`,
        status: ContractStatus.DRAFT,
        riskLevel: RiskLevel.LOW,
        versions: [{
            id: `v1-${Date.now()}`,
            versionNumber: 1,
            createdAt: new Date().toISOString().split('T')[0],
            author: USERS['alice'], // Assuming current user is Alice
            content: `This contract for ${newContractData.title || 'a new matter'} was created via the wizard.`
        }],
        approvalSteps: [],
        renewalDate: newContractData.endDate || '',
        ...newContractData
    } as Contract;

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
    // If we are in the detail view, we also need to update the selected contract
    if (selectedContract && selectedContract.id === contractId) {
        setSelectedContract(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };


  const renderContent = () => {
    switch(activeView) {
      case 'dashboard':
        return <Dashboard contracts={contracts} onMetricClick={handleMetricNavigation} />;
      case 'contracts':
        return selectedContract ? (
          <ContractDetail contract={selectedContract} onBack={handleBackToList} onUpdateStatus={handleUpdateContractStatus} />
        ) : (
          <ContractsList 
            contracts={contracts} 
            onSelectContract={handleSelectContract} 
            onStartCreate={handleStartCreate}
            initialFilters={initialFilters}
          />
        );
      case 'approvals':
        return <ApprovalsPage contracts={contracts} setContracts={setContracts} />;
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
        return <PropertiesList properties={properties} onStartCreate={handleStartCreateProperty} />;
      default:
        return <div className="p-8 bg-white rounded-xl shadow-sm"><h2 className="text-xl font-bold">{activeView.charAt(0).toUpperCase() + activeView.slice(1)}</h2><p className="mt-2 text-gray-500">This section is not yet implemented.</p></div>;
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen font-sans text-gray-900 flex">
      <Sidebar activeView={activeView} onNavigate={handleNavigate} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
      {isCreatingContract && (
        <CreateContractWorkflow
            properties={properties}
            onCancel={handleCancelCreate}
            onFinish={handleFinalizeCreate}
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