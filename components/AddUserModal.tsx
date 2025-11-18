import React, { useState } from 'react';
import type { Role } from '../types';
import { XIcon, RefreshCwIcon } from './icons';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
};

export default function AddUserModal() {
  const { roles, setIsAddingUser } = useAppContext();
  const { handleCreateUser } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(generatePassword());
  const [roleId, setRoleId] = useState<string>(roles.find(r => r.name === 'Requestor')?.id || roles[0]?.id || '');

  const handleSave = async () => {
      if (!firstName || !lastName || !email || !password || !roleId) {
          alert("Please fill in all fields.");
          return;
      }
      await handleCreateUser({ firstName, lastName, email, password, roleId });
      setIsAddingUser(false);
  };

  return (
      <div className="relative z-20" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
              <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                  <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                      <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                          <button type="button" onClick={() => setIsAddingUser(false)} className="rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                              <XIcon className="h-6 w-6" aria-hidden="true" />
                          </button>
                      </div>
                      <div className="bg-white dark:bg-gray-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                          <h3 className="text-lg font-semibold leading-6 text-gray-900 dark:text-gray-100" id="modal-title">
                              Add New User
                          </h3>
                          <div className="mt-4 space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
                                      <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-primary focus:border-primary" />
                                  </div>
                                  <div>
                                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
                                      <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-primary focus:border-primary" />
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-primary focus:border-primary" />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Temporary Password</label>
                                  <div className="mt-1 flex rounded-md shadow-sm">
                                      <input type="text" value={password} readOnly className="block w-full flex-1 rounded-none rounded-l-md border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100" />
                                      <button onClick={() => setPassword(generatePassword())} type="button" className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">
                                          <RefreshCwIcon className="h-4 w-4" />
                                          <span>Generate</span>
                                      </button>
                                  </div>
                                   <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">The user will be prompted to change this on first login.</p>
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                                  <select value={roleId} onChange={e => setRoleId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-primary focus:border-primary">
                                      {roles.filter(r => r.name !== 'Admin').map(role => (
                                          <option key={role.id} value={role.id}>{role.name}</option>
                                      ))}
                                  </select>
                              </div>
                          </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                          <button onClick={handleSave} type="button" className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-900 shadow-sm hover:bg-primary-600 sm:ml-3 sm:w-auto">Create User</button>
                          <button onClick={() => setIsAddingUser(false)} type="button" className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 sm:mt-0 sm:w-auto">Cancel</button>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );
}