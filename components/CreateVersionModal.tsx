import React, { useState } from 'react';
import type { Contract, ContractVersion, Property } from '../types';
import { ContractFrequency } from '../types';
import { XIcon, UploadCloudIcon } from './icons';

interface CreateVersionModalProps {
  contract: Contract;
  properties: Property[];
  onClose: () => void;
  onSave: (newVersionData: Omit<ContractVersion, 'id' | 'versionNumber' | 'createdAt' | 'author'> & { file?: File | null }) => void;
}

const FormField = ({ label, children, className = 'sm:col-span-1' }: { label: string; children?: React.ReactNode; className?: string }) => (
    <div className={className}>
        <label className="block text-sm font-medium leading-6 text-gray-900">{label}</label>
        <div className="mt-2">{children}</div>
    </div>
);
const TextInput = (props: React.ComponentProps<'input'>) => <input {...props} className="block w-full rounded-md border-0 py-1.5 px-2 bg-white text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-[#9ca3af] focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6" />
const SelectInput = (props: React.ComponentProps<'select'>) => <select {...props} className="block w-full rounded-md border-0 py-1.5 px-2 bg-white text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6" />
const TextArea = (props: React.ComponentProps<'textarea'>) => <textarea {...props} rows={5} className="block w-full rounded-md border-0 py-1.5 px-2 bg-white text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-[#9ca3af] focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6" />

export default function CreateVersionModal({ contract, properties, onClose, onSave }: CreateVersionModalProps) {
    const latestVersion = contract.versions[contract.versions.length - 1];
    const [formData, setFormData] = useState({
        content: latestVersion.content,
        fileName: '',
        file: null as File | null,
        value: latestVersion.value,
        effectiveDate: latestVersion.effectiveDate,
        endDate: latestVersion.endDate,
        renewalDate: latestVersion.renewalDate,
        frequency: latestVersion.frequency,
        property: latestVersion.property,
    });

    const handleChange = (field: keyof typeof formData, value: any) => {
        setFormData(prev => ({...prev, [field]: value}));
    };
    
     const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            handleChange('fileName', file.name);
            handleChange('file', file);
        }
    };

    const handleSave = () => {
        const { file, ...restOfData } = formData;
        onSave({
            ...restOfData,
            content: formData.content || `Content for Version ${latestVersion.versionNumber + 1}`,
            file: file,
        });
    };

    return (
        <div className="relative z-20" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                    <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                         <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                            <button type="button" onClick={onClose} className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                                <XIcon className="h-6 w-6" aria-hidden="true" />
                            </button>
                        </div>
                        <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                           <h3 className="text-lg font-semibold leading-6 text-gray-900" id="modal-title">
                                Create New Version for "{contract.title}"
                            </h3>
                            <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                                <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10">
                                    <div className="text-center">
                                        <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-300" />
                                        <div className="mt-4 flex text-sm leading-6 text-gray-600">
                                            <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-semibold text-primary focus-within:outline-none hover:text-primary-500">
                                                <span>Upload a new document</span>
                                                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
                                            </label>
                                        </div>
                                        {formData.fileName && <p className="mt-2 text-sm text-gray-700 font-medium">File: {formData.fileName}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                     <FormField label="Contract Value (USD)">
                                        <TextInput type="number" value={formData.value} onChange={e => handleChange('value', Number(e.target.value))} />
                                    </FormField>
                                    <FormField label="Frequency">
                                        <SelectInput value={formData.frequency} onChange={e => handleChange('frequency', e.target.value as ContractFrequency)}>
                                            {Object.values(ContractFrequency).map(f => <option key={f} value={f}>{f}</option>)}
                                        </SelectInput>
                                    </FormField>
                                    <FormField label="Effective Date">
                                        <TextInput type="date" value={formData.effectiveDate} onChange={e => handleChange('effectiveDate', e.target.value)} />
                                    </FormField>
                                    <FormField label="End Date">
                                        <TextInput type="date" value={formData.endDate} onChange={e => handleChange('endDate', e.target.value)} />
                                    </FormField>
                                     <FormField label="Property" className="sm:col-span-2">
                                        <SelectInput 
                                            value={formData.property?.id || ''}
                                            onChange={e => handleChange('property', properties.find(p => p.id === e.target.value) || undefined)}
                                        >
                                            <option value="">Portfolio-wide (No specific property)</option>
                                            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </SelectInput>
                                    </FormField>
                                    <FormField label="Contract Text / Notes" className="sm:col-span-2">
                                        <TextArea value={formData.content} onChange={e => handleChange('content', e.target.value)} />
                                    </FormField>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                            <button type="button" onClick={handleSave} className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-900 shadow-sm hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto">
                                Save New Version & Reset Approvals
                            </button>
                            <button type="button" onClick={onClose} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}