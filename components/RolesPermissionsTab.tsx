
import React, { useState, useMemo, useEffect } from 'react';
import type { Role, PermissionSet } from '../types';
import { PlusIcon, Trash2Icon, XIcon } from './icons';

interface RolesPermissionsTabProps {
    roles: Role[];
    onUpdateRole: (roleId: string, permissions: PermissionSet) => void;
    onCreateRole: (name: string, description: string) => void;
    onDeleteRole: (roleId: string) => void;
}

interface AddRoleModalProps {
    onClose: () => void;
    onSave: (name: string, description: string) => void;
}

const AddRoleModal = ({ onClose, onSave }: AddRoleModalProps) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const handleSave = () => {
        if (name.trim()) {
            onSave(name, description);
        }
    };

    return (
        <div className="relative z-20" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                    <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                        <div className="bg-white dark:bg-gray-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                            <h3 className="text-lg font-semibold leading-6 text-gray-900 dark:text-gray-100">Add New Role</h3>
                            <div className="mt-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role Name</label>
                                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-primary focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-primary focus:border-primary"></textarea>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                            <button onClick={handleSave} type="button" className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-900 shadow-sm hover:bg-primary-600 sm:ml-3 sm:w-auto">Create Role</button>
                            <button onClick={onClose} type="button" className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 sm:mt-0 sm:w-auto">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PermissionCheckbox: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ label, checked, onChange }) => (
    <label className="flex items-center space-x-2">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
        <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
    </label>
);

const ModulePermissions: React.FC<{ title: string; permissions: any; onPermissionChange: (key: string, value: boolean) => void }> = ({ title, permissions, onPermissionChange }) => (
    <div>
        <h5 className="font-semibold text-sm text-gray-800 dark:text-gray-100">{title}</h5>
        <div className="flex space-x-4 mt-2">
            {Object.entries(permissions).map(([key, value]) => (
                <PermissionCheckbox key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} checked={value as boolean} onChange={(checked) => onPermissionChange(key, checked)} />
            ))}
        </div>
    </div>
);

export default function RolesPermissionsTab({ roles, onUpdateRole, onCreateRole, onDeleteRole }: RolesPermissionsTabProps) {
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(roles[0]?.id || null);
    const [isAddingRole, setIsAddingRole] = useState(false);
    
    useEffect(() => {
        if (!selectedRoleId || !roles.find(r => r.id === selectedRoleId)) {
            setSelectedRoleId(roles[0]?.id || null);
        }
    }, [roles, selectedRoleId]);

    const selectedRole = useMemo(() => roles.find(role => role.id === selectedRoleId), [roles, selectedRoleId]);
    
    const handlePermissionChange = (module: keyof PermissionSet, key: string, value: boolean) => {
        if (!selectedRole) return;
        
        const newPermissions = JSON.parse(JSON.stringify(selectedRole.permissions));
        (newPermissions[module] as any)[key] = value;
        
        onUpdateRole(selectedRole.id, newPermissions);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Roles & Permissions</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Define roles to control what users can see and do.</p>
                </div>
                 <button onClick={() => setIsAddingRole(true)} className="flex items-center px-4 py-2 text-sm font-semibold text-primary-900 bg-primary rounded-lg hover:bg-primary-600">
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Add Role
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3">
                <div className="md:col-span-1 border-r border-gray-200 dark:border-gray-700">
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {roles.map(role => (
                            <li key={role.id}>
                                <div className={`w-full text-left flex justify-between items-center p-4 ${selectedRole?.id === role.id ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                                    <button onClick={() => setSelectedRoleId(role.id)} className="flex-1 text-left">
                                        <p className={`font-semibold ${selectedRole?.id === role.id ? 'text-primary-700 dark:text-primary-200' : 'text-gray-800 dark:text-gray-100'}`}>{role.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{role.userCount} user{role.userCount !== 1 && 's'}</p>
                                    </button>
                                    {role.name !== 'Admin' && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onDeleteRole(role.id); }}
                                            disabled={role.userCount > 0}
                                            title={role.userCount > 0 ? "Cannot delete role with assigned users" : "Delete role"}
                                            className="ml-2 p-1 rounded-full text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                        >
                                            <Trash2Icon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="md:col-span-2 p-6">
                    {selectedRole ? (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedRole.name}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{selectedRole.description}</p>
                            </div>
                            <div className="space-y-4">
                               {Object.entries(selectedRole.permissions).map(([module, perms]) => (
                                    <ModulePermissions 
                                        key={module}
                                        title={module.charAt(0).toUpperCase() + module.slice(1)}
                                        permissions={perms}
                                        onPermissionChange={(key, value) => handlePermissionChange(module as keyof PermissionSet, key, value)}
                                    />
                               ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400">Select a role to view and edit its permissions.</p>
                    )}
                </div>
            </div>
            {isAddingRole && (
                <AddRoleModal 
                    onClose={() => setIsAddingRole(false)}
                    onSave={(name, description) => {
                        onCreateRole(name, description);
                        setIsAddingRole(false);
                    }}
                />
            )}
        </div>
    );
}