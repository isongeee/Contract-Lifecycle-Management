
import React, { useState } from 'react';
import type { Role, PermissionSet } from '../types';
import { PlusIcon } from './icons';

interface RolesPermissionsTabProps {
    roles: Role[];
    setRoles: React.Dispatch<React.SetStateAction<Role[]>>;
}

// FIX: Changed component to React.FC to correctly handle props including the 'key' prop.
const PermissionCheckbox: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ label, checked, onChange }) => (
    <label className="flex items-center space-x-2">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
        <span className="text-sm text-gray-600">{label}</span>
    </label>
);

// FIX: Changed component to React.FC to correctly handle props including the 'key' prop.
const ModulePermissions: React.FC<{ title: string; permissions: any; onPermissionChange: (key: string, value: boolean) => void }> = ({ title, permissions, onPermissionChange }) => (
    <div>
        <h5 className="font-semibold text-sm text-gray-800">{title}</h5>
        <div className="flex space-x-4 mt-2">
            {Object.entries(permissions).map(([key, value]) => (
                <PermissionCheckbox key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} checked={value as boolean} onChange={(checked) => onPermissionChange(key, checked)} />
            ))}
        </div>
    </div>
);


export default function RolesPermissionsTab({ roles, setRoles }: RolesPermissionsTabProps) {
    const [selectedRole, setSelectedRole] = useState<Role | null>(roles[0] || null);
    
    const handlePermissionChange = (module: keyof PermissionSet, key: string, value: boolean) => {
        if (!selectedRole) return;
        
        const newRoles = roles.map(role => {
            if (role.id === selectedRole.id) {
                const newPermissions = { ...role.permissions };
                (newPermissions[module] as any)[key] = value;
                return { ...role, permissions: newPermissions };
            }
            return role;
        });
        
        setRoles(newRoles);
        setSelectedRole(prev => prev ? { ...prev, permissions: (newRoles.find(r => r.id === prev.id) as Role).permissions } : null);
    };

    return (
        <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Roles & Permissions</h3>
                    <p className="text-sm text-gray-500 mt-1">Define roles to control what users can see and do.</p>
                </div>
                 <button className="flex items-center px-4 py-2 text-sm font-semibold text-primary-900 bg-primary rounded-lg hover:bg-primary-600">
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Add Role
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3">
                <div className="md:col-span-1 border-r border-gray-200">
                    <ul className="divide-y divide-gray-200">
                        {roles.map(role => (
                            <li key={role.id}>
                                <button onClick={() => setSelectedRole(role)} className={`w-full text-left p-4 ${selectedRole?.id === role.id ? 'bg-primary-50' : 'hover:bg-gray-50'}`}>
                                    <p className={`font-semibold ${selectedRole?.id === role.id ? 'text-primary-700' : 'text-gray-800'}`}>{role.name}</p>
                                    <p className="text-sm text-gray-500">{role.userCount} users</p>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="md:col-span-2 p-6">
                    {selectedRole ? (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-xl font-bold text-gray-900">{selectedRole.name}</h4>
                                <p className="text-sm text-gray-600 mt-1">{selectedRole.description}</p>
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
                        <p>Select a role to view and edit its permissions.</p>
                    )}
                </div>
            </div>
        </div>
    );
}