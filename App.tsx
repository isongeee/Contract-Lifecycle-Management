import React from 'react';
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
import { LoaderIcon, AlertTriangleIcon } from './components/icons';
import AddUserModal from './components/AddUserModal';
import { useAppContext } from './contexts/AppContext';
import { useAuth } from './contexts/AuthContext';
import SearchResultsPage from './components/SearchResultsPage';
import ReportingPage from './components/ReportingPage';
import RenewalWorkspace from './components/RenewalWorkspace';


export default function App() {
  // Use AuthContext for auth state
  const { 
    isAuthenticated, 
    currentUser, 
    isLoading: isAuthLoading,
    handleLogout, 
    authView
  } = useAuth();

  // Use AppContext for app data and UI state
  const {
    isLoading: isDataLoading,
    activeView,
    isCreatingContract, isCreatingCounterparty, editingCounterparty,
    isCreatingProperty, editingProperty, isAddingUser,
    contracts,
    handleSelectContract,
    users,
    userNotificationSettings,
    setUserNotificationSettings,
    handleSigningStatusUpdate,
    handleMarkAsExecuted,
    theme,
    handleThemeChange,
    roles,
    notificationSettings,
    company,
    setUsers,
    handleUpdateRolePermissions,
    handleCreateRole,
    handleDeleteRole,
    setNotificationSettings,
    setIsAddingUser,
    selectedContract,
    properties,
    handleBackToList,
    handleContractTransition,
    handleCreateNewVersion,
    handleRenewalDecision,
    handleCreateRenewalRequest,
    handleRenewAsIs,
    handleStartRenegotiation,
    handleCreateComment,
    handleResolveComment,
    handleCreateRenewalFeedback,
    handleUpdateRenewalTerms,
    selectedTemplate,
    selectedCounterparty,
    selectedProperty,
    handleBackToPropertiesList,
    handleStartEditProperty,
    counterparties,
    handleCancelCreate,
    handleFinalizeCreate,
    initialCreateData,
    handleBackToTemplatesList,
    handleBackToCounterpartiesList,
    handleStartEditCounterparty,
    handleNavigate,
    handleNavigateToRenewalWorkspace,
    handleDownloadFile,
  } = useAppContext();

  const isLoading = isAuthLoading || (isAuthenticated && isDataLoading);

  const renderContent = () => {
    if (isLoading) {
        return ( <div className="flex items-center justify-center h-full"> <LoaderIcon className="w-12 h-12 text-primary" /> <span className="ml-4 text-lg font-semibold text-gray-700 dark:text-gray-200">Loading Data...</span> </div> )
    }
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
      case 'dashboard': return <Dashboard />;
      case 'contracts': return <ContractsList />;
      case 'renewals': return <RenewalsPage 
        contracts={contracts}
        onSelectContract={handleSelectContract}
        onNavigateToWorkspace={handleNavigateToRenewalWorkspace}
        users={users}
      />;
      case 'renewal-workspace': return <RenewalWorkspace />;
      case 'reporting': return <ReportingPage />;
      case 'approvals': return <ApprovalsPage />;
      case 'signing': return <SigningPage
        contracts={contracts}
        onSelectContract={handleSelectContract}
        onUpdateSigningStatus={handleSigningStatusUpdate}
        onMarkAsExecuted={handleMarkAsExecuted}
      />;
      case 'templates': return <TemplatesList />;
      case 'counterparties': return <CounterpartiesList />;
      case 'properties': return <PropertiesList />;
      case 'search': return <SearchResultsPage />;
      case 'profile': return <ProfilePage 
        currentUser={currentUser!}
        theme={theme}
        onThemeChange={handleThemeChange}
        notificationSettings={userNotificationSettings}
        setNotificationSettings={setUserNotificationSettings}
      />;
      case 'company-settings': return <CompanySettingsPage
        users={users}
        roles={roles}
        notificationSettings={notificationSettings}
        company={company}
        currentUser={currentUser!}
        setUsers={setUsers}
        onUpdateRolePermissions={handleUpdateRolePermissions}
        onCreateRole={handleCreateRole}
        onDeleteRole={handleDeleteRole}
        setNotificationSettings={setNotificationSettings}
        onAddUser={() => setIsAddingUser(true)}
      />;
      default: return <div className="p-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm"><h2 className="text-xl font-bold">{activeView.charAt(0).toUpperCase() + activeView.slice(1)}</h2><p className="mt-2 text-gray-500 dark:text-gray-400">This section is not yet implemented.</p></div>;
    }
  };

  const renderActiveView = () => {
    if (activeView === 'contracts' && selectedContract) return <ContractDetail
      contractId={selectedContract.id}
      properties={properties}
      users={users}
      currentUser={currentUser!}
      onBack={handleBackToList}
      onTransition={handleContractTransition}
      onCreateNewVersion={handleCreateNewVersion}
      onRenewalDecision={handleRenewalDecision}
      onCreateRenewalRequest={handleCreateRenewalRequest}
      onSelectContract={(cId) => {
        const contract = contracts.find(con => con.id === cId);
        if (contract) handleSelectContract(contract);
      }}
      onRenewAsIs={handleRenewAsIs}
      onStartRenegotiation={handleStartRenegotiation}
      onUpdateSigningStatus={handleSigningStatusUpdate}
      onCreateComment={handleCreateComment}
      onResolveComment={handleResolveComment}
      onCreateRenewalFeedback={handleCreateRenewalFeedback}
      onUpdateRenewalTerms={handleUpdateRenewalTerms}
      onNavigate={handleNavigate}
      onDownloadFile={handleDownloadFile}
    />;
    if (activeView === 'templates' && selectedTemplate) return <TemplateDetail />;
    if (activeView === 'counterparties' && selectedCounterparty) return <CounterpartyDetail />;
    if (activeView === 'properties' && selectedProperty) return <PropertyDetail
      property={selectedProperty}
      contracts={contracts.filter(c => 
        c.property?.id === selectedProperty.id ||
        (c.propertyAllocations || []).some(a => a.propertyId === selectedProperty.id)
      )}
      onBack={handleBackToPropertiesList}
      onSelectContract={handleSelectContract}
      onStartEdit={handleStartEditProperty}
      currentUser={currentUser!}
    />;
    
    return renderContent();
  }

  if (!isAuthenticated && !isAuthLoading) {
    const renderAuthContent = () => {
        switch (authView) {
            case 'login': return <LoginPage />;
            case 'org-signup': return <OrgSignUpPage />;
            case 'user-signup': return <UserSignUpPage />;
            default: return <LoginPage />;
        }
    }
    return ( <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans text-gray-900 dark:text-gray-100 flex items-center justify-center p-4"> {renderAuthContent()} </div> );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans text-gray-900 dark:text-gray-100 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {renderActiveView()}
        </main>
      </div>
      {isCreatingContract && <CreateContractWorkflow
        properties={properties}
        counterparties={counterparties}
        users={users}
        onCancel={handleCancelCreate}
        onFinish={handleFinalizeCreate}
        currentUser={currentUser!}
        initialData={initialCreateData}
      />}
      {isCreatingCounterparty && <CreateCounterpartyWorkflow />}
      {editingCounterparty && <CreateCounterpartyWorkflow />}
      {isCreatingProperty && <CreatePropertyWorkflow />}
      {editingProperty && <CreatePropertyWorkflow />}
      {isAddingUser && <AddUserModal />}
    </div>
  );
}