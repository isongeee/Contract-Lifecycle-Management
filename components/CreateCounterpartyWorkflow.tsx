import React, { useState } from 'react';
import { XIcon } from './icons';
import { Counterparty, CounterpartyType } from '../types';

interface CreateCounterpartyWorkflowProps {
  onCancel: () => void;
  onFinish: (newCounterpartyData: Omit<Counterparty, 'id'>) => void;
}

// FIX: Made children prop optional to satisfy type checker for what appears to be correct usage.
const FormField = ({ label, children, className = 'col-span-1' }: { label: string; children?: React.ReactNode; className?: string }) => (
    <div className={className}>
        <label className="block text-sm font-medium leading-6 text-gray-900">{label}</label>
        <div className="mt-2">{children}</div>
    </div>
);
const TextInput = (props: React.ComponentProps<'input'>) => <input {...props} className="block w-full rounded-md border-0 py-1.5 px-2 bg-white text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-[#9ca3af] focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6" />
const SelectInput = (props: React.ComponentProps<'select'>) => <select {...props} className="block w-full rounded-md border-0 py-1.5 px-2 bg-white text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6" />


export default function CreateCounterpartyWorkflow({ onCancel, onFinish }: CreateCounterpartyWorkflowProps) {
    const [formData, setFormData] = useState<Omit<Counterparty, 'id'>>({
        name: '',
        type: CounterpartyType.VENDOR,
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        country: '',
        zipCode: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
    });

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({...prev, [field]: value}));
    };

    const handleSubmit = () => {
        // Basic validation
        if (!formData.name || !formData.type || !formData.addressLine1 || !formData.city || !formData.state || !formData.country || !formData.zipCode) {
            alert('Please fill in all required fields.');
            return;
        }
        onFinish(formData);
    };

    return (
        <div className="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                    <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-xl">
                         <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                            <button type="button" onClick={onCancel} className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                                <span className="sr-only">Close</span>
                                <XIcon className="h-6 w-6" aria-hidden="true" />
                            </button>
                        </div>
                        <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                            <div className="w-full">
                                <h3 className="text-lg font-semibold leading-6 text-gray-900" id="modal-title">
                                    Add New Counterparty
                                </h3>
                                <div className="mt-6 space-y-6">
                                    
                                    {/* Basic Info Section */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-500 border-b border-gray-200 pb-2 mb-4">Basic Information</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormField label="Counterparty Name*" className="sm:col-span-1">
                                                <TextInput type="text" value={formData.name} onChange={e => handleChange('name', e.target.value)} placeholder="e.g., Acme Corporation" />
                                            </FormField>
                                            <FormField label="Type*" className="sm:col-span-1">
                                                <SelectInput value={formData.type} onChange={e => handleChange('type', e.target.value)}>
                                                  {Object.values(CounterpartyType).map(type => (
                                                      <option key={type} value={type}>{type}</option>
                                                  ))}
                                                </SelectInput>
                                            </FormField>
                                        </div>
                                    </div>
                                    
                                    {/* Primary Contact Section */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-500 border-b border-gray-200 pb-2 mb-4">Primary Contact (Optional)</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormField label="Contact Name">
                                                <TextInput type="text" value={formData.contactName} onChange={e => handleChange('contactName', e.target.value)} placeholder="John Doe" />
                                            </FormField>
                                            <FormField label="Contact Email">
                                                <TextInput type="email" value={formData.contactEmail} onChange={e => handleChange('contactEmail', e.target.value)} placeholder="john.doe@example.com" />
                                            </FormField>
                                            <FormField label="Contact Phone" className="sm:col-span-2">
                                                <TextInput type="tel" value={formData.contactPhone} onChange={e => handleChange('contactPhone', e.target.value)} placeholder="(555) 123-4567" />
                                            </FormField>
                                        </div>
                                    </div>
                                    
                                    {/* Address Section */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-500 border-b border-gray-200 pb-2 mb-4">Address</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                             <FormField label="Address Line 1*" className="sm:col-span-2">
                                                <TextInput type="text" value={formData.addressLine1} onChange={e => handleChange('addressLine1', e.target.value)} />
                                            </FormField>
                                            <FormField label="Address Line 2" className="sm:col-span-2">
                                                <TextInput type="text" value={formData.addressLine2} onChange={e => handleChange('addressLine2', e.target.value)} />
                                            </FormField>
                                            <FormField label="City*">
                                                <TextInput type="text" value={formData.city} onChange={e => handleChange('city', e.target.value)} />
                                            </FormField>
                                            <FormField label="State / Province*">
                                                <TextInput type="text" value={formData.state} onChange={e => handleChange('state', e.target.value)} />
                                            </FormField>
                                            <FormField label="Zip / Postal Code*">
                                                <TextInput type="text" value={formData.zipCode} onChange={e => handleChange('zipCode', e.target.value)} />
                                            </FormField>
                                            <FormField label="Country*">
                                                <TextInput type="text" value={formData.country} onChange={e => handleChange('country', e.target.value)} />
                                            </FormField>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                            <button type="button" onClick={handleSubmit} className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 sm:ml-3 sm:w-auto">
                                Create Counterparty
                            </button>
                            <button type="button" onClick={onCancel} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}