import React, { useState } from 'react';
import type { Contract, ContractTemplate } from './types';
import { ContractStatus, RiskLevel } from './types';
import { MOCK_CONTRACTS, MOCK_TEMPLATES, USERS } from './constants';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ContractsList from './components/ContractsList';
import ContractDetail from './components/ContractDetail';
import Dashboard from './components/Dashboard';
import ApprovalsPage from './components/ApprovalsPage';
import TemplatesList from './components/TemplatesList';
import TemplateDetail from './components/TemplateDetail';
import CounterpartiesList from './components/CounterpartiesList';
import CreateContractWorkflow from './components/CreateContractWorkflow';

export default function App() {
  const [contracts, setContracts] = useState<Contract[]>(MOCK_CONTRACTS);
  const [templates] = useState<ContractTemplate[]>(MOCK_TEMPLATES);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [isCreatingContract, setIsCreatingContract] = useState(false);

  const handleSelectContract = (contract: Contract) => {
    setSelectedContract(contract);
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

  const handleNavigate = (view: string) => {
    setActiveView(view);
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


  const renderContent = () => {
    switch(activeView) {
      case 'dashboard':
        return <Dashboard contracts={contracts} />;
      case 'contracts':
        return selectedContract ? (
          <ContractDetail contract={selectedContract} onBack={handleBackToList} />
        ) : (
          <ContractsList contracts={contracts} onSelectContract={handleSelectContract} onStartCreate={handleStartCreate} />
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
        return <CounterpartiesList contracts={contracts} />;
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
            onCancel={handleCancelCreate}
            onFinish={handleFinalizeCreate}
        />
      )}
    </div>
  );
}