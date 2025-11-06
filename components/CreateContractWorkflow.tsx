import React, { useState, useEffect, useMemo } from 'react';
import type { Contract, Counterparty, UserProfile, Property, AllocationType, ContractPropertyAllocation } from '../types';
import { ContractType, ContractStatus, RiskLevel, ContractFrequency } from '../types';
import { UploadCloudIcon, XIcon, PlusIcon, Trash2Icon } from './icons';

interface CreateContractWorkflowProps {
  properties: Property[];
  counterparties: Counterparty[];
  users: UserProfile[];
  onCancel: () => void;
  onFinish: (newContractData: Partial<Contract> & { propertyAllocations?: any[] }) => void;
  currentUser: UserProfile;
}

const STEPS = [
  { id: 1, name: 'Upload Documents' },
  { id: 2, name: 'Contract Information' },
  { id: 3, name: 'Property & Cost Allocation' },
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
            <div className="mt-8 flex justify-end">
                <button onClick={onNext} type="button" className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-900 shadow-sm hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">Next</button>
            </div>
        </div>
    );
};

interface Stage2Props {
    data: Partial<Contract>;
    setData: (field: keyof Contract | Partial<Contract>, value?: any) => void;
    onBack: () => void;
    onNext: () => void;
    onToggleMonth: (monthYearKey: string) => void;
    counterparties: Counterparty[];
    users: UserProfile[];
}

const FormRow = ({ children }: { children?: React.ReactNode }) => <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">{children}</div>
const FormField = ({ label, children, className = 'sm:col-span-3' }: { label: string; children?: React.ReactNode; className?: string }) => (
    <div className={className}>
        <label className="block text-sm font-medium leading-6 text-gray-900">{label}</label>
        <div className="mt-2">{children}</div>
    </div>
);
const TextInput = (props: React.ComponentProps<'input'>) => <input {...props} className="block w-full rounded-md border-0 py-1.5 px-3 bg-white text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-[#9ca3af] focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6" />
const SelectInput = (props: React.ComponentProps<'select'>) => <select {...props} className="block w-full rounded-md border-0 py-1.5 px-3 bg-white text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6" />


const getMonthsInRange = (startDateStr: string, endDateStr: string): { year: number; months: string[] }[] => {
    if (!startDateStr || !endDateStr) return [];
    
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];

    const startUTC = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const endUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
    
    const monthsByYear: { [year: number]: string[] } = {};
    let current = new Date(Date.UTC(startUTC.getUTCFullYear(), startUTC.getUTCMonth(), 1));

    while (current <= endUTC) {
        const year = current.getUTCFullYear();
        const month = MONTHS[current.getUTCMonth()];
        if (!monthsByYear[year]) {
          monthsByYear[year] = [];
        }
        monthsByYear[year].push(month);
        current.setUTCMonth(current.getUTCMonth() + 1);
    }

    return Object.entries(monthsByYear).map(([year, months]) => ({
        year: parseInt(year, 10),
        months,
    }));
};


const Stage2_Information = ({ data, setData, onBack, onNext, onToggleMonth, counterparties, users }: Stage2Props) => {
    const availableMonthsByYear = useMemo(() => getMonthsInRange(data.effectiveDate!, data.endDate!), [data.effectiveDate, data.endDate]);

    const isFormValid = useMemo(() => {
        if (!data.title || data.title.trim() === '') return false;
        if (!data.counterparty) return false;
        if (!data.effectiveDate || !data.endDate) return false;
    
        const start = new Date(data.effectiveDate);
        const end = new Date(data.endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
            return false;
        }
        
        return true;
    }, [data.title, data.counterparty, data.effectiveDate, data.endDate]);

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
                        {counterparties.length > 0 ? (
                             <SelectInput value={data.counterparty?.id || ''} onChange={e => setData('counterparty', counterparties.find(c => c.id === e.target.value))}>
                                <option value="" disabled>Select a counterparty...</option>
                                {counterparties.map((cp: Counterparty) => <option key={cp.id} value={cp.id}>{cp.name}</option>)}
                            </SelectInput>
                        ) : (
                            <p className="text-sm text-red-600 pt-2">No counterparties found. Please go to the Counterparties page to create one first.</p>
                        )}
                    </FormField>
                    <FormField label="Contract Type">
                        <SelectInput value={data.type} onChange={e => setData('type', e.target.value as ContractType)}>
                            {Object.values(ContractType).map(type => <option key={type} value={type}>{type}</option>)}
                        </SelectInput>
                    </FormField>
                    <FormField label="Contract Owner" className="sm:col-span-full">
                        <SelectInput value={data.owner?.id || ''} onChange={e => setData('owner', users.find(u => u.id === e.target.value))}>
                             <option value="" disabled>Select an owner...</option>
                            {users.map((user: UserProfile) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>)}
                        </SelectInput>
                    </FormField>
                    <FormField label="Effective Date">
                        <TextInput type="date" value={data.effectiveDate} onChange={e => setData('effectiveDate', e.target.value)} />
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
                             <p className="text-sm text-gray-500">Select the months within the contract period that are considered active.</p>
                            {availableMonthsByYear.length > 0 ? (
                                <div className="mt-2 space-y-4">
                                    {availableMonthsByYear.map(({ year, months }) => (
                                        <div key={year}>
                                            <p className="text-sm font-semibold text-gray-700">{year}</p>
                                            <div className="mt-2 grid grid-cols-4 sm:grid-cols-6 gap-2">
                                                {months.map(month => {
                                                    const monthIndex = MONTHS.indexOf(month);
                                                    const monthYearKey = `${year}-${(monthIndex + 1).toString().padStart(2, '0')}`;
                                                    const isSelected = data.seasonalMonths?.includes(monthYearKey);
                                                    return (
                                                        <button
                                                            key={monthYearKey}
                                                            type="button"
                                                            onClick={() => onToggleMonth(monthYearKey)}
                                                            className={`rounded-md px-3 py-2 text-sm font-semibold shadow-sm transition-colors ${
                                                                isSelected
                                                                    ? 'bg-primary text-white hover:bg-primary-500'
                                                                    : 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            {month}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="mt-2 text-sm text-gray-500">Please set a valid Effective and End Date to select active months.</p>
                            )}
                        </div>
                    )}
                </FormRow>
            </div>
            <div className="mt-8 flex justify-between">
                <button onClick={onBack} type="button" className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">Back</button>
                <button 
                    onClick={onNext} 
                    type="button"
                    disabled={!isFormValid}
                    title={!isFormValid ? "Please fill in all required fields and ensure End Date is not before Effective Date." : undefined}
                    className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-900 shadow-sm hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50 disabled:cursor-not-allowed">
                    Next
                </button>
            </div>
        </div>
    );
};

type MonthlyAllocation = {
    id: number;
    propertyId: string;
    monthlyValues: { [month: string]: number };
    manualEdits: { [month: string]: boolean };
};

type MultiPropertyAllocation = {
    id: number;
    propertyId: string;
    allocatedValue: number;
    manualEdits: boolean;
};

const Stage3_PropertyAndCost = ({ data, properties, onBack, onNext, setData }: any) => {
    const isSeasonal = data.frequency === ContractFrequency.SEASONAL && data.seasonalMonths?.length > 0;
    const [allocationType, setAllocationType] = useState<AllocationType>(
      !data.property && (!data.propertyAllocations || data.propertyAllocations.length === 0) ? 'portfolio' :
      data.propertyAllocations?.length > 1 ? 'multi' : 'single'
    );
    
    // Non-seasonal state
    const [singlePropertyId, setSinglePropertyId] = useState(data.property?.id || (properties.length > 0 ? properties[0].id : ''));
    const [multiAllocations, setMultiAllocations] = useState<MultiPropertyAllocation[]>(() => 
        (data.propertyAllocations && !isSeasonal && data.propertyAllocations.length > 0
            ? data.propertyAllocations.map((a: any, i: number) => ({ ...a, id: Date.now() + i, manualEdits: false }))
            : [{ id: Date.now(), propertyId: properties[0]?.id || '', allocatedValue: data.value || 0, manualEdits: false }]
        )
    );

    // Seasonal state
    const [seasonalAllocations, setSeasonalAllocations] = useState<MonthlyAllocation[]>([]);

    useEffect(() => {
        if (isSeasonal) {
            const initialMonthlyValues = data.seasonalMonths.reduce((acc: any, month: string) => {
                acc[month] = 0;
                return acc;
            }, {});
            const initialManualEdits = { ...initialMonthlyValues };
             Object.keys(initialManualEdits).forEach(k => initialManualEdits[k] = false);

            if (allocationType === 'single') {
                setSeasonalAllocations([{ id: Date.now(), propertyId: singlePropertyId, monthlyValues: initialMonthlyValues, manualEdits: initialManualEdits }]);
            } else if (allocationType === 'multi') {
                const existingProps = multiAllocations.map((a: any) => a.propertyId).filter(Boolean);
                if (existingProps.length === 0 && properties.length > 0) existingProps.push(properties[0].id);
                setSeasonalAllocations(existingProps.map((propId: string, idx: number) => ({ id: Date.now() + idx, propertyId: propId, monthlyValues: { ...initialMonthlyValues }, manualEdits: { ...initialManualEdits }})));
            } else if (allocationType === 'portfolio') {
                setSeasonalAllocations([{ id: Date.now(), propertyId: 'portfolio', monthlyValues: initialMonthlyValues, manualEdits: initialManualEdits }]);
            }
        } else {
            setSeasonalAllocations([]);
        }
    }, [isSeasonal, data.seasonalMonths, allocationType, singlePropertyId, multiAllocations, properties]);


    const handleProceed = () => {
        const updates: Partial<Contract> & { propertyAllocations?: ContractPropertyAllocation[] } = {
            allocation: allocationType,
        };

        if (allocationType === 'single') {
            updates.property = properties.find((p: Property) => p.id === singlePropertyId);
            if (isSeasonal) {
                // FIX: Corrected object structure to match ContractPropertyAllocation type.
                updates.propertyAllocations = seasonalAllocations.map(({ id, ...rest }) => ({
                    ...rest,
                    propertyId: singlePropertyId,
                    id: `temp-${id}`,
// FIX: Cast the result of Object.values to number[] to resolve the TypeScript error with the reduce function.
                    allocatedValue: (Object.values(rest.monthlyValues) as number[]).reduce((sum, v) => sum + (v || 0), 0)
                }));
            } else {
                updates.propertyAllocations = [];
            }
        } else if (allocationType === 'multi') {
            updates.property = properties.find((p: Property) => p.id === (isSeasonal ? seasonalAllocations[0]?.propertyId : multiAllocations[0]?.propertyId));
            if (isSeasonal) {
                 // FIX: Corrected object structure to match ContractPropertyAllocation type.
                updates.propertyAllocations = seasonalAllocations.map(({ id, ...rest }) => ({
                    ...rest,
                    id: `temp-${id}`,
// FIX: Cast the result of Object.values to number[] to resolve the TypeScript error with the reduce function.
                    allocatedValue: (Object.values(rest.monthlyValues) as number[]).reduce((sum, v) => sum + (v || 0), 0)
                }));
            } else {
                // FIX: Corrected object structure to match ContractPropertyAllocation type.
                 updates.propertyAllocations = multiAllocations.map(({ id, manualEdits, ...rest }: MultiPropertyAllocation) => ({
                    ...rest,
                    id: `temp-${id}`
                 }));
            }
        } else { // portfolio
            updates.property = undefined;
            if (isSeasonal) {
                // FIX: Corrected object structure to match ContractPropertyAllocation type.
                updates.propertyAllocations = seasonalAllocations.map(({ id, ...rest }) => ({
                    ...rest,
                    id: `temp-${id}`,
// FIX: Cast the result of Object.values to number[] to resolve the TypeScript error with the reduce function.
                    allocatedValue: (Object.values(rest.monthlyValues) as number[]).reduce((sum, v) => sum + (v || 0), 0)
                }));
            } else {
                updates.propertyAllocations = [];
            }
        }

        setData(updates);
        onNext();
    };

    const handleAddRow = () => {
        if(isSeasonal) {
            const initialMonthlyValues = data.seasonalMonths.reduce((acc: any, month: string) => ({ ...acc, [month]: 0 }), {});
            const initialManualEdits = { ...initialMonthlyValues };
            Object.keys(initialManualEdits).forEach(k => initialManualEdits[k] = false);
            setSeasonalAllocations(prev => [...prev, { id: Date.now(), propertyId: properties[0]?.id || '', monthlyValues: initialMonthlyValues, manualEdits: initialManualEdits }]);
        } else {
             setMultiAllocations((prev) => [...prev, { id: Date.now(), propertyId: properties[0]?.id || '', allocatedValue: 0, manualEdits: false }]);
        }
    };
    
    const handleDeleteRow = (id: number) => {
        if (isSeasonal) {
            setSeasonalAllocations(prev => prev.filter(row => row.id !== id));
        } else {
             setMultiAllocations((prev) => prev.filter((row) => row.id !== id));
        }
    };

    const handleAllocationChange = (id: number, field: 'propertyId' | 'allocatedValue' | string, value: string | number) => {
        if(isSeasonal) {
            setSeasonalAllocations(prev => prev.map(row => {
                if (row.id === id) {
                    if (field === 'propertyId') {
                        return { ...row, propertyId: String(value) };
                    }
                    return { 
                        ...row, 
                        monthlyValues: { ...row.monthlyValues, [field]: Number(value) },
                        manualEdits: { ...row.manualEdits, [field]: true }
                    };
                }
                return row;
            }));
        } else {
            setMultiAllocations((prev) => prev.map((row) => {
                if (row.id === id) {
                    if (field === 'allocatedValue') {
                        return { ...row, allocatedValue: Number(value), manualEdits: true };
                    }
                    return { ...row, [field]: value };
                }
                return row;
            }));
        }
    };
    
    const handleCalculateAllocation = () => {
        if (isSeasonal) {
            let totalManualAllocation = 0;
            let unallocatedCellCount = 0;

            seasonalAllocations.forEach(row => {
                data.seasonalMonths.forEach((month: string) => {
                    if (row.manualEdits[month]) {
                        totalManualAllocation += row.monthlyValues[month] || 0;
                    } else {
                        unallocatedCellCount++;
                    }
                });
            });
            
            const remainingValue = (data.value || 0) - totalManualAllocation;
            const valuePerCell = unallocatedCellCount > 0 ? remainingValue / unallocatedCellCount : 0;

            setSeasonalAllocations(prev => prev.map(row => {
                const newMonthlyValues = { ...row.monthlyValues };
                data.seasonalMonths.forEach((month: string) => {
                    if (!row.manualEdits[month]) {
                        newMonthlyValues[month] = Math.max(0, valuePerCell);
                    }
                });
                return { ...row, monthlyValues: newMonthlyValues };
            }));
        } else if (allocationType === 'multi') {
            let totalManualAllocation = 0;
            let unallocatedRowCount = 0;

            multiAllocations.forEach((row) => {
                if (row.manualEdits) {
                    totalManualAllocation += Number(row.allocatedValue) || 0;
                } else {
                    unallocatedRowCount++;
                }
            });
            
            const remainingValue = (data.value || 0) - totalManualAllocation;
            const valuePerRow = unallocatedRowCount > 0 ? remainingValue / unallocatedRowCount : 0;

            setMultiAllocations((prev) => prev.map((row) => {
                if (!row.manualEdits) {
                    return { ...row, allocatedValue: Math.max(0, valuePerRow) };
                }
                return row;
            }));
        }
    };

    let totalAllocated = 0;
    if (isSeasonal) {
        totalAllocated = seasonalAllocations.reduce((sum: number, alloc) => {
            const monthlyTotal = (Object.values(alloc.monthlyValues) as number[]).reduce((monthSum, val) => monthSum + (val || 0), 0);
            return sum + monthlyTotal;
        }, 0);
    } else {
         if (allocationType === 'multi') {
            totalAllocated = multiAllocations.reduce((sum: number, alloc: any) => sum + Number(alloc.allocatedValue || 0), 0);
        } else {
            totalAllocated = data.value || 0;
        }
    }
    const remainingValue = (data.value || 0) - totalAllocated;

    return (
        <div>
            <h2 className="text-lg font-semibold text-gray-800">Property & Cost Allocation</h2>
            <p className="mt-1 text-sm text-gray-500">Specify the financial details and associate properties.</p>
            <div className="mt-6 space-y-6">
                <FormField label="Total Contract Value (USD)" className="sm:col-span-3">
                    <div className="relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-gray-500 sm:text-sm">$</span></div>
                        <input type="number" value={data.value} onChange={e => setData('value', Number(e.target.value))} className="no-spinner block w-full rounded-md border-0 py-1.5 pl-7 pr-12 bg-white text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-[#9ca3af] focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6" placeholder="0.00" />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3"><span className="text-gray-500 sm:text-sm">USD</span></div>
                    </div>
                </FormField>

                <div className="sm:col-span-6">
                    <label className="block text-sm font-medium leading-6 text-gray-900">Allocation Type</label>
                    <fieldset className="mt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {(['Property-specific Contract', 'Multi-property Contract', 'Portfolio-wide Contract'] as const).map((label, idx) => {
                                const type = (['single', 'multi', 'portfolio'] as const)[idx];
                                return (
                                <label key={type} className={`relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none ${allocationType === type ? 'border-primary ring-2 ring-primary' : 'border-gray-300'}`}>
                                    <input type="radio" name="allocation-type" value={type} className="sr-only" checked={allocationType === type} onChange={(e) => setAllocationType(e.target.value as AllocationType)} />
                                    <span className="flex flex-1"><span className="flex flex-col"><span className="block text-sm font-medium text-gray-900">{label}</span></span></span>
                                </label>
                                );
                            })}
                        </div>
                    </fieldset>
                </div>
                
                {!isSeasonal && allocationType === 'single' && (
                    <FormField label="Property" className="sm:col-span-3">
                        <SelectInput value={singlePropertyId} onChange={e => setSinglePropertyId(e.target.value)}>
                            {properties.map((p: Property) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </SelectInput>
                    </FormField>
                )}
                {!isSeasonal && allocationType === 'multi' && (
                     <div className="sm:col-span-6 space-y-3">
                        {multiAllocations.map((alloc: any, index: number) => (
                            <div key={alloc.id} className="grid grid-cols-12 gap-x-4 items-center">
                                <div className="col-span-6"><SelectInput value={alloc.propertyId} onChange={e => handleAllocationChange(alloc.id, 'propertyId', e.target.value)}><option value="">Select property...</option>{properties.map((p: Property) => <option key={p.id} value={p.id}>{p.name}</option>)}</SelectInput></div>
                                <div className="col-span-5"><div className="relative rounded-md shadow-sm"><div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-gray-500 sm:text-sm">$</span></div><input type="number" value={alloc.allocatedValue} onChange={e => handleAllocationChange(alloc.id, 'allocatedValue', e.target.value)} className="no-spinner block w-full rounded-md border-0 py-1.5 pl-7 bg-white text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm"/></div></div>
                                <div className="col-span-1">{multiAllocations.length > 1 && <button type="button" onClick={() => handleDeleteRow(alloc.id)} className="text-gray-400 hover:text-red-600"><Trash2Icon className="w-5 h-5"/></button>}</div>
                            </div>
                        ))}
                        <div className="flex justify-between items-center pt-2">
                            <button type="button" onClick={handleAddRow} className="flex items-center text-sm font-semibold text-primary hover:text-primary-600"><PlusIcon className="w-4 h-4 mr-1"/> Add Property</button>
                            <div className="flex items-center space-x-4">
                                <button onClick={handleCalculateAllocation} type="button" className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                                    Calculate Allocation
                                </button>
                                <div className="text-sm font-medium">
                                    <span className={remainingValue.toFixed(2) !== '0.00' ? 'text-red-600' : 'text-green-600'}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(remainingValue)}</span>
                                    <span className="text-gray-600"> unallocated</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {isSeasonal && (allocationType === 'single' || allocationType === 'multi' || allocationType === 'portfolio') && (
                    <div className="sm:col-span-6 space-y-4">
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{allocationType !== 'portfolio' ? 'Property' : 'Allocation'}</th>
                                        {data.seasonalMonths.map((monthYear: string) => {
                                             const [year, month] = monthYear.split('-');
                                             const monthName = MONTHS[parseInt(month, 10) - 1];
                                            return <th key={monthYear} className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">{`${monthName} ${year}`}</th>
                                        })}
                                        {allocationType === 'multi' && <th className="w-10"></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {seasonalAllocations.map(alloc => (
                                        <tr key={alloc.id} className="border-b">
                                            <td className="py-2 px-3">
                                                {allocationType === 'single' ? 
                                                    (<SelectInput value={singlePropertyId} onChange={e => setSinglePropertyId(e.target.value)}>
                                                        {properties.map((p: Property) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                    </SelectInput>) :
                                                allocationType === 'multi' ?
                                                    (<SelectInput value={alloc.propertyId} onChange={e => handleAllocationChange(alloc.id, 'propertyId', e.target.value)}>{properties.map((p: Property) => <option key={p.id} value={p.id}>{p.name}</option>)}</SelectInput>) :
                                                    (<span className="text-sm font-medium text-gray-700">Portfolio-wide</span>)
                                                }
                                            </td>
                                            {data.seasonalMonths.map((monthYear: string) => (
                                                <td key={monthYear} className="py-2 px-3">
                                                     <div className="relative rounded-md shadow-sm">
                                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-gray-500 sm:text-sm">$</span></div>
                                                        <input type="number" value={alloc.monthlyValues[monthYear] || ''} onChange={e => handleAllocationChange(alloc.id, monthYear, e.target.value)} className="no-spinner block w-full rounded-md border-0 py-1.5 pl-7 bg-white text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm"/>
                                                    </div>
                                                </td>
                                            ))}
                                            {allocationType === 'multi' && <td>{seasonalAllocations.length > 1 && <button type="button" onClick={() => handleDeleteRow(alloc.id)} className="text-gray-400 hover:text-red-600 ml-2"><Trash2Icon className="w-5 h-5"/></button>}</td>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                            <div>
                                {allocationType === 'multi' && <button type="button" onClick={handleAddRow} className="flex items-center text-sm font-semibold text-primary hover:text-primary-600"><PlusIcon className="w-4 h-4 mr-1"/> Add Property</button>}
                            </div>
                            <div className="flex items-center space-x-4">
                                <button onClick={handleCalculateAllocation} type="button" className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">Calculate Allocation</button>
                                <div className="text-sm font-medium">
                                    <span className={remainingValue.toFixed(2) !== '0.00' ? 'text-red-600' : 'text-green-600'}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(remainingValue)}</span>
                                    <span className="text-gray-600"> unallocated</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div className="mt-8 flex justify-between">
                <button onClick={onBack} type="button" className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">Back</button>
                <button onClick={handleProceed} type="button" className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-900 shadow-sm hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">Next</button>
            </div>
        </div>
    );
};

const SummaryItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex flex-col rounded-lg bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm font-semibold text-gray-900 sm:mt-0 text-right">{value}</dd>
    </div>
);


const Stage4_Summary = ({ data, onBack, onFinish }: { data: Partial<Contract> & { propertyAllocations?: any[] }, onBack: () => void, onFinish: () => void }) => {
    const frequencyDisplay = data.frequency === ContractFrequency.SEASONAL
        ? `Seasonal (${(data.seasonalMonths || []).length} active months)`
        : data.frequency;
        
    const propertyDisplay = () => {
        if (data.allocation === 'multi') {
             return `Multi-property (${data.propertyAllocations?.length || 0} locations)`;
        }
        if (data.allocation === 'single' && data.property) {
            return data.property.name;
        }
        return "Portfolio-wide Contract";
    };
        
    return (
        <div>
            <h2 className="text-lg font-semibold text-gray-800">Summary</h2>
            <p className="mt-1 text-sm text-gray-500">Please review the details below before creating the contract draft.</p>
            <dl className="mt-6 space-y-3">
                <SummaryItem label="Contract Title" value={data.title} />
                <SummaryItem label="Counterparty" value={data.counterparty?.name} />
                <SummaryItem label="Property Association" value={propertyDisplay()} />
                <SummaryItem label="Contract Type" value={data.type} />
                <SummaryItem label="Contract Owner" value={`${data.owner?.firstName} ${data.owner?.lastName}`} />
                <SummaryItem label="Total Value" value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.value || 0)} />
                <SummaryItem label="Effective Date" value={data.effectiveDate} />
                <SummaryItem label="End Date" value={data.endDate} />
                <SummaryItem label="Risk Level" value={data.riskLevel} />
                <SummaryItem label="Frequency" value={frequencyDisplay} />
            </dl>
            <div className="mt-8 flex justify-between">
                <button onClick={onBack} type="button" className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">Back</button>
                <button onClick={onFinish} type="button" className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-900 shadow-sm hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">Create Contract</button>
            </div>
        </div>
    );
}


export default function CreateContractWorkflow({ onCancel, onFinish, properties, counterparties, users, currentUser }: CreateContractWorkflowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [newContractData, setNewContractData] = useState<Partial<Contract> & { propertyAllocations?: any[] }>({
      title: '',
      type: ContractType.MSA,
      status: ContractStatus.DRAFT,
      riskLevel: RiskLevel.LOW,
      value: 0,
      owner: currentUser,
      counterparty: undefined,
      property: undefined,
      effectiveDate: '',
      endDate: '',
      frequency: ContractFrequency.MONTHLY,
      seasonalMonths: [],
      propertyAllocations: [],
  });

  useEffect(() => {
    if (newContractData.frequency === ContractFrequency.SEASONAL && newContractData.effectiveDate && newContractData.endDate && newContractData.seasonalMonths && newContractData.seasonalMonths.length > 0) {
      const start = new Date(newContractData.effectiveDate);
      const end = new Date(newContractData.endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        setNewContractData(prev => ({ ...prev, seasonalMonths: [] }));
        return;
      }
      
      const startUTC = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
      const endUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

      const validMonths = newContractData.seasonalMonths.filter(monthYear => {
        const [year, month] = monthYear.split('-').map(Number);
        const monthDate = new Date(Date.UTC(year, month - 1, 1));
        
        const afterStart = monthDate.getUTCFullYear() > startUTC.getUTCFullYear() || (monthDate.getUTCFullYear() === startUTC.getUTCFullYear() && monthDate.getUTCMonth() >= startUTC.getUTCMonth());
        const beforeEnd = monthDate.getUTCFullYear() < endUTC.getUTCFullYear() || (monthDate.getUTCFullYear() === endUTC.getUTCFullYear() && monthDate.getUTCMonth() <= endUTC.getUTCMonth());

        return afterStart && beforeEnd;
      });

      if (validMonths.length !== newContractData.seasonalMonths.length) {
        setNewContractData(prev => ({ ...prev, seasonalMonths: validMonths }));
      }
    }
  }, [newContractData.effectiveDate, newContractData.endDate, newContractData.frequency]);

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, 4));
  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 1));
  
  const updateData = (
    fieldOrUpdates: keyof typeof newContractData | Partial<typeof newContractData>,
    value?: any
  ) => {
    setNewContractData((prev) => {
      if (typeof fieldOrUpdates === 'string') {
        return { ...prev, [fieldOrUpdates]: value };
      }
      return { ...prev, ...fieldOrUpdates };
    });
  };

  const handleToggleMonth = (monthYearKey: string) => {
    setNewContractData(prev => {
        const currentMonths = prev.seasonalMonths || [];
        const newMonths = currentMonths.includes(monthYearKey)
            ? currentMonths.filter(m => m !== monthYearKey)
            : [...currentMonths, monthYearKey];
        newMonths.sort();
        return { ...prev, seasonalMonths: newMonths };
    });
  };
  
  const handleFinalize = () => {
    let finalContent = `This contract for ${newContractData.title || 'a new matter'} was created via the wizard.`;
    const isSeasonal = newContractData.frequency === ContractFrequency.SEASONAL;
    
    if (newContractData.propertyAllocations && newContractData.propertyAllocations.length > 0) {
        let allocationDetails = '';
        if (isSeasonal) {
            allocationDetails = newContractData.propertyAllocations.map(alloc => {
                const prop = properties.find(p => p.id === alloc.propertyId);
                const propName = prop?.name || (alloc.propertyId === 'portfolio' ? 'Portfolio-wide Total' : 'Unknown Property');
                const monthlyDetails = Object.entries(alloc.monthlyValues)
                    .map(([month, value]) => `    - ${month}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value as number)}`)
                    .join('\n');
                return `- ${propName}:\n${monthlyDetails}`;
            }).join('\n');
            finalContent += `\n\n--- SEASONAL COST ALLOCATION ---\n${allocationDetails}`;
        } else if (newContractData.propertyAllocations.length > 1) {
            const totalValue = newContractData.value || 0;
            allocationDetails = newContractData.propertyAllocations.map(alloc => {
                const prop = properties.find(p => p.id === alloc.propertyId);
                const percentage = totalValue > 0 ? ((alloc.allocatedValue / totalValue) * 100).toFixed(2) : 0;
                return `- ${prop?.name || 'Unknown Property'}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(alloc.allocatedValue)} (${percentage}%)`;
            }).join('\n');
            finalContent += `\n\n--- MULTI-PROPERTY COST ALLOCATION ---\n${allocationDetails}`;
        }
    }


    const finalContractData = { ...newContractData };
    
    finalContractData.versions = [{
        id: `v1-${Date.now()}`,
        versionNumber: 1,
        createdAt: new Date().toISOString().split('T')[0],
        author: currentUser,
        content: finalContent,
        value: newContractData.value || 0,
        effectiveDate: newContractData.effectiveDate || '',
        endDate: newContractData.endDate || '',
        renewalDate: newContractData.endDate || '',
        frequency: newContractData.frequency!,
        seasonalMonths: newContractData.seasonalMonths,
        property: newContractData.property,
    }];

    onFinish(finalContractData);
  };


  const renderStep = () => {
      switch (currentStep) {
          case 1:
              return <Stage1_Upload onNext={handleNext} />;
          case 2:
              return <Stage2_Information data={newContractData} setData={updateData} onBack={handleBack} onNext={handleNext} onToggleMonth={handleToggleMonth} counterparties={counterparties} users={users} />;
          case 3:
              return <Stage3_PropertyAndCost data={newContractData} setData={updateData} properties={properties} onBack={handleBack} onNext={handleNext} />;
          case 4:
              return <Stage4_Summary data={newContractData} onBack={handleBack} onFinish={handleFinalize} />;
          default:
              return null;
      }
  }

  return (
    <div className="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
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
