
import React, { useState } from 'react';
import { XIcon } from './icons';
import type { Property } from '../types';

interface CreatePropertyWorkflowProps {
  onCancel: () => void;
  onFinish: (newPropertyData: Omit<Property, 'id'>) => void;
}

// FIX: Made children prop optional to satisfy type checker for what appears to be correct usage.
const FormField = ({ label, children, className = 'col-span-1' }: { label: string; children?: React.ReactNode; className?: string }) => (
    <div className={className}>
        <label className="block text-sm font-medium leading-6 text-gray-900">{label}</label>
        <div className="mt-2">{children}</div>
    </div>
);
const TextInput = (props: React.ComponentProps<'input'>) => <input {...props} className="block w-full rounded-md border-0 py-1.5 px-2 bg-white text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-[#9ca3af] focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6" />

export default function CreatePropertyWorkflow({ onCancel, onFinish }: CreatePropertyWorkflowProps) {
    const [formData, setFormData] = useState<Omit<Property, 'id'>>({
        name: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        country: '',
        zipCode: '',
    });

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({...prev, [field]: value}));
    };

    const handleSubmit = () => {
        // Basic validation
        if (!formData.name || !formData.addressLine1 || !formData.city || !formData.state || !formData.country || !formData.zipCode) {
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
                    <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                         <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                            <button type="button" onClick={onCancel} className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                                <span className="sr-only">Close</span>
                                <XIcon className="h-6 w-6" aria-hidden="true" />
                            </button>
                        </div>
                        <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                            <div className="w-full">
                                <h3 className="text-base font-semibold leading-6 text-gray-900" id="modal-title">
                                    Add New Property
                                </h3>
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField label="Property Name*" className="sm:col-span-2">
                                        <TextInput type="text" value={formData.name} onChange={e => handleChange('name', e.target.value)} placeholder="e.g., Downtown Office" />
                                    </FormField>
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
                                    <FormField label="Country*">
                                        <TextInput type="text" value={formData.country} onChange={e => handleChange('country', e.target.value)} />
                                    </FormField>
                                    <FormField label="Zip / Postal Code*">
                                        <TextInput type="text" value={formData.zipCode} onChange={e => handleChange('zipCode', e.target.value)} />
                                    </FormField>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                            <button type="button" onClick={handleSubmit} className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-900 shadow-sm hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto">
                                Create Property
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
