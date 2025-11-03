import React, { useState } from 'react';
import type { Contract, Counterparty, UserProfile, Property } from '../types';
import { ContractType, ContractStatus, RiskLevel, ContractFrequency } from '../types';
import { COUNTERPARTIES, USERS } from '../constants';
import { UploadCloudIcon, XIcon } from './icons';

interface CreateContractWorkflowProps {
  properties: Property[];
  onCancel: () => void;
  onFinish: (newContractData: Partial<Contract>) => void;
}

const STEPS = [
  { id: 1, name: 'Upload Documents' },
  { id: 2, name: 'Contract Information' },
  { id: 3, name: 'Cost Allocations' },
  { id: 4, name: 'Summary' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ProgressBar = ({ currentStep }: { currentStep: number }) => (
    <nav aria-label="Progress">
      <ol role="list" className="space-y-4 md:flex md:space-x-8 md:space-y-0">
        {STEPS.map((step) => (
          <li key={step.name} className="md:flex-1">
            {currentStep > step.id ? (
              <div className="group flex w-full flex-col border-l-4 border-primary py-2 pl-4 transition-colors md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4">
                <span className="text-sm font-medium text-primary transition-colors">{step.name}</span>
              </div>
            ) : currentStep === step.id ? (
              <div
                className="flex w-full flex-col border-l-4 border-primary py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4"
                aria-current="step"
              >
                <span className="text-sm font-medium text-primary">{step.name}</span>
              </div>
            ) : (
              <div className="group flex w-full flex-col border-l-4 border-gray-200 py-2 pl-4 transition-colors md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4">
                <span className="text-sm font-medium text-gray-500 transition-colors">{step.name}</span>
              </div>
            )}
          </li>
        ))}
      </ol>
    </nav>
);

const Stage1_Upload = ({ onNext }: { onNext: () => void }) => {
    const [fileName, setFileName] = useState('');
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFileName(e.target.files[0].name);
        }
    };

    return (
        <div>
            <h2 className="text-lg font-semibold text-gray-800">Upload Documents (Optional)</h2>
            <p className="mt-1 text-sm text-gray-500">Upload a third-party paper or other relevant documents to start.</p>
            <div className="mt-6">
                <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10">
                    <div className="text-center">
                        <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                        <div className="mt-4 flex text-sm leading-6 text-gray-600">
                            <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-semibold text-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-600 focus-within:ring-offset-2 hover:text-primary-500">
                                <span>Upload a file</span>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs leading-5 text-gray-600">PDF, DOCX, etc. up to 10MB</p>
                    </div>
                </div>
                 {fileName && <p className="mt-3 text-sm text-gray-700 font-medium">Uploaded: {fileName}</p>}
            </div>
            <div className="mt-8 flex justify-end space-x-3">
                <button onClick={onNext} type="button" className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">Skip for now</button>
                <button onClick={onNext} type="button" className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">Next</button>
            </div>
        </div>
    );
};

interface StageProps {
    data: Partial<Contract>;
    properties: Property[];
    setData: (field: keyof Contract, value: any) => void;
    onBack: () => void;
    onNext: () => void;
    onToggleMonth: (month: string) => void;
}

const FormRow = ({ children }: { children: React.ReactNode }) => <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">{children}</div>
const FormField = ({ label, children, className = 'sm:col-span-3' }: { label: string; children: React.ReactNode; className?: string }) => (
    <div className={className}>
        <label className="block text-sm font-medium leading-6 text-gray-900">{label}</label>
        <div className="mt-2">{children}</div>
    </div>
);
const TextInput = (props: React.ComponentProps<'input'>) => <input {...props} className="block w-full rounded-md border-0 py-1.5 px-3 bg-white text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-[#9ca3af] focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6" />
const SelectInput = (props: React.ComponentProps<'select'>) => <select {...props} className="block w-full rounded-md border-0 py-1.5 px-3 bg-white text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6" />


const Stage2_Information = ({ data, setData, properties, onBack, onNext, onToggleMonth }: StageProps) => {
    return (
        <div>
            <h2 className="text-lg font-semibold text-gray-800">Contract Information</h2>
            <p className="mt-1 text-sm text-gray-500">Enter the essential details for this contract.</p>
            <div className="mt-6 space-y-6">
                 <FormRow>
                    <FormField label="Contract Title" className="sm:col-span-6">
                        <TextInput type="text" value={data.title} onChange={e => setData('title', e.target.value)} placeholder="e.g., Master Services Agreement" />
                    </FormField>
                    <FormField label="Counterparty">
                         <SelectInput value={data.counterparty?.id} onChange={e => setData('counterparty', Object.values(COUNTERPARTIES).find(c => c.id === e.target.value))}>
                            {Object.values(COUNTERPARTIES).map((cp: Counterparty) => <option key={cp.id} value={cp.id}>{cp.name}</option>)}
                        </SelectInput>
                    </FormField>
                    <FormField label="Property">
                         <SelectInput value={data.property?.id} onChange={e => setData('property', properties.find(p => p.id === e.target.value))}>
                            {properties.map((p: Property) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </SelectInput>
                    </FormField>
                    <FormField label="Contract Type">
                        <SelectInput value={data.type} onChange={e => setData('type', e.target.value as ContractType)}>
                            {Object.values(ContractType).map(type => <option key={type} value={type}>{type}</option>)}
                        </SelectInput>
                    </FormField>
                    <FormField label="Contract Owner">
                        <SelectInput value={data.owner?.id} onChange={e => setData('owner', Object.values(USERS).find(u => u.id === e.target.value))}>
                            {Object.values(USERS).map((user: UserProfile) => <option key={user.id} value={user.id}>{user.name}</option>)}
                        </SelectInput>
                    </FormField>
                    <FormField label="Start Date">
                        <TextInput type="date" value={data.startDate} onChange={e => setData('startDate', e.target.value)} />
                    </FormField>
                    <FormField label="End Date">
                        <TextInput type="date" value={data.endDate} onChange={e => setData('endDate', e.target.value)} />
                    </FormField>
                    <FormField label="Frequency" className="sm:col-span-3">
                        <SelectInput value={data.frequency} onChange={e => setData('frequency', e.target.value as ContractFrequency)}>
                            {Object.values(ContractFrequency).map(freq => <option key={freq} value={freq}>{freq}</option>)}
                        </SelectInput>
                    </FormField>
                     <FormField label="Risk Level">
                         <SelectInput value={data.riskLevel} onChange={e => setData('riskLevel', e.target.value as RiskLevel)}>
                            {Object.values(RiskLevel).map(level => <option key={level} value={level}>{level}</option>)}
                        </SelectInput>
                    </FormField>
                    {data.frequency === ContractFrequency.SEASONAL && (
                        <div className="sm:col-span-6">
                            <label className="block text-sm font-medium leading-6 text-gray-900">Active Months</label>
                            <div className="mt-2 grid grid-cols-4 sm:grid-cols-6 gap-2">
                                {MONTHS.map(month => (
                                    <button
                                        key={month}
                                        type="button"
                                        onClick={() => onToggleMonth(month)}
                                        className={`rounded-md px-3 py-2 text-sm font-semibold shadow-sm transition-colors ${
                                            data.seasonalMonths?.includes(month)
                                                ? 'bg-primary text-white hover:bg-primary-500'
                                                : 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        {month}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </FormRow>
            </div>
            <div className="mt-8 flex justify-between">
                <button onClick={onBack} type="button" className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">Back</button>
                <button onClick={onNext} type="button" className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">Next</button>
            </div>
        </div>
    );
};

const Stage3_Cost = ({ data, setData, onBack, onNext }: Omit<StageProps, 'onToggleMonth' | 'properties'>) => {
    return (
        <div>
            <h2 className="text-lg font-semibold text-gray-800">Cost Allocations</h2>
            <p className="mt-1 text-sm text-gray-500">Specify the financial details of the contract.</p>
             <div className="mt-6 space-y-6">
                <FormRow>
                    <FormField label="Total Contract Value (USD)" className="sm:col-span-3">
                        <div className="relative rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <span className="text-gray-500 sm:text-sm">$</span>
                            </div>
                            <input type="number" value={data.value} onChange={e => setData('value', Number(e.target.value))} className="no-spinner block w-full rounded-md border-0 py-1.5 pl-7 pr-12 bg-white text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-[#9ca3af] focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6" placeholder="0.00" />
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                <span className="text-gray-500 sm:text-sm">USD</span>
                            </div>
                        </div>
                    </FormField>
                </FormRow>
            </div>
            <div className="mt-8 flex justify-between">
                <button onClick={onBack} type="button" className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">Back</button>
                <button onClick={onNext} type="button" className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">Next</button>
            </div>
        </div>
    );
};

const SummaryItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex flex-col rounded-lg bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm font-semibold text-gray-900 sm:mt-0">{value}</dd>
    </div>
);


const Stage4_Summary = ({ data, onBack, onFinish }: { data: Partial<Contract>, onBack: () => void, onFinish: () => void }) => {
    const frequencyDisplay = data.frequency === ContractFrequency.SEASONAL
        ? `Seasonal (${(data.seasonalMonths || []).join(', ') || 'No months selected'})`
        : data.frequency;
        
    return (
        <div>
            <h2 className="text-lg font-semibold text-gray-800">Summary</h2>
            <p className="mt-1 text-sm text-gray-500">Please review the details below before creating the contract draft.</p>
            <dl className="mt-6 space-y-3">
                <SummaryItem label="Contract Title" value={data.title} />
                <SummaryItem label="Counterparty" value={data.counterparty?.name} />
                <SummaryItem label="Property" value={data.property ? data.property.name : 'N/A'} />
                <SummaryItem label="Contract Type" value={data.type} />
                <SummaryItem label="Contract Owner" value={data.owner?.name} />
                <SummaryItem label="Total Value" value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.value || 0)} />
                <SummaryItem label="Start Date" value={data.startDate} />
                <SummaryItem label="End Date" value={data.endDate} />
                <SummaryItem label="Risk Level" value={data.riskLevel} />
                <SummaryItem label="Frequency" value={frequencyDisplay} />
            </dl>
            <div className="mt-8 flex justify-between">
                <button onClick={onBack} type="button" className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">Back</button>
                <button onClick={onFinish} type="button" className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">Create Contract</button>
            </div>
        </div>
    );
}


export default function CreateContractWorkflow({ onCancel, onFinish, properties }: CreateContractWorkflowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [newContractData, setNewContractData] = useState<Partial<Contract>>({
      title: '',
      type: ContractType.MSA,
      status: ContractStatus.DRAFT,
      riskLevel: RiskLevel.LOW,
      value: 0,
      owner: USERS['alice'],
      counterparty: Object.values(COUNTERPARTIES)[0],
      property: properties[0],
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      frequency: ContractFrequency.ANNUALLY,
      seasonalMonths: [],
  });

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, 4));
  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 1));
  
  const updateData = (field: keyof Contract, value: any) => {
      setNewContractData(prev => ({...prev, [field]: value }));
  };

  const handleToggleMonth = (month: string) => {
    setNewContractData(prev => {
        const currentMonths = prev.seasonalMonths || [];
        const newMonths = currentMonths.includes(month)
            ? currentMonths.filter(m => m !== month)
            : [...currentMonths, month].sort((a, b) => MONTHS.indexOf(a) - MONTHS.indexOf(b));
        return { ...prev, seasonalMonths: newMonths };
    });
  };

  const renderStep = () => {
      switch (currentStep) {
          case 1:
              return <Stage1_Upload onNext={handleNext} />;
          case 2:
              return <Stage2_Information data={newContractData} setData={updateData} properties={properties} onBack={handleBack} onNext={handleNext} onToggleMonth={handleToggleMonth} />;
          case 3:
              return <Stage3_Cost data={newContractData} setData={updateData} onBack={handleBack} onNext={handleNext} />;
          case 4:
              return <Stage4_Summary data={newContractData} onBack={handleBack} onFinish={() => onFinish(newContractData)} />;
          default:
              return null;
      }
  }

  return (
    <div className="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl">
                    <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                        <button type="button" onClick={onCancel} className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                            <span className="sr-only">Close</span>
                            <XIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                    </div>
                    <div className="p-6 sm:p-8">
                        <div className="mb-8">
                           <h3 className="text-xl font-bold leading-6 text-gray-900" id="modal-title">Create New Contract</h3>
                           <div className="mt-4">
                               <ProgressBar currentStep={currentStep} />
                           </div>
                        </div>
                        <div>
                            {renderStep()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}