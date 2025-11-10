import React, { useState, useMemo } from 'react';
import type { UserProfile, Role } from '../types';
import { SearchIcon, PlusIcon, EditIcon } from './icons';
import Pagination from './Pagination';
import EditUserModal from './EditUserModal';
import { supabase } from '../lib/supabaseClient';

interface UserManagementTabProps {
    users: UserProfile[];
    roles: Role[];
    setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
    currentUser: UserProfile;
    onAddUser: () => void;
}

const ITEMS_PER_PAGE = 5;

export default function UserManagementTab({ users, roles, setUsers, currentUser, onAddUser }: UserManagementTabProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    
    const filteredUsers = useMemo(() => {
        return users.filter(user => 
            ((`${user.firstName} ${user.lastName}`).toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
            (roleFilter === '' || user.role === roleFilter) &&
            (statusFilter === '' || user.status === statusFilter)
        );
    }, [users, searchTerm, roleFilter, statusFilter]);
    
    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
    const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handlePageChange = (page: number) => {
        if (page > 0 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handleSaveRole = async (userId: string, newRoleId: string) => {
        const { error } = await supabase
            .from('users')
            .update({ role_id: newRoleId })
            .eq('id', userId);

        if (error) {
            console.error("Error updating user role:", error);
            alert("Failed to update user role.");
            return;
        }

        // Update local state to provide instant feedback
        setUsers(prevUsers => prevUsers.map(user => {
            if (user.id === userId) {
                const newRole = roles.find(r => r.id === newRoleId);
                return { ...user, roleId: newRoleId, role: newRole?.name || 'Unknown' };
            }
            return user;
        }));
        setEditingUser(null); // Close modal
    };
    
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Users</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage team members and their account access.</p>
                    </div>
                    <button onClick={onAddUser} className="flex items-center px-4 py-2 text-sm font-semibold text-primary-900 bg-primary rounded-lg hover:bg-primary-600">
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Add User
                    </button>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative md:col-span-3 lg:col-span-1">
                         <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <SearchIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="search"
                            placeholder="Search by name or email..."
                            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 pl-10 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder-gray-400 focus:ring-primary focus:border-primary"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-primary focus:border-primary">
                        <option value="">All Roles</option>
                        {roles.map(role => <option key={role.id} value={role.name}>{role.name}</option>)}
                    </select>
                     <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-primary focus:border-primary">
                        <option value="">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>
            <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Last Login</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {paginatedUsers.map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <img className="h-8 w-8 rounded-full" src={user.avatarUrl} alt="" />
                                        <div className="ml-3">
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{`${user.firstName} ${user.lastName}`}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{user.role}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{user.lastLogin}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        className="text-primary-600 hover:text-primary-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                                        disabled={currentUser.role !== 'Admin' || user.role === 'Admin'}
                                        onClick={() => setEditingUser(user)}
                                        title={currentUser.role !== 'Admin' ? "You don't have permission to edit users." : user.role === 'Admin' ? "Admin roles cannot be changed." : "Edit User"}
                                    >
                                        <EditIcon className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
            </div>
            <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalItems={filteredUsers.length}
                itemsPerPage={ITEMS_PER_PAGE}
            />
            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    roles={roles}
                    onClose={() => setEditingUser(null)}
                    onSave={handleSaveRole}
                />
            )}
        </div>
    );
}
