
import React, { useState } from 'react';
import type { UserNotificationSettings } from '../types';
import ToggleSwitch from './ToggleSwitch';
import { XIcon, PlusIcon } from './icons';

interface RenewalsSettingsProps {
    settings: UserNotificationSettings;
    onUpdate: (settings: UserNotificationSettings) => void;
}

export default function RenewalsSettings({ settings: initialSettings, onUpdate }: RenewalsSettingsProps) {
    const [settings, setSettings] = useState(initialSettings);
    const [newDay, setNewDay] = useState('');

    const handleToggleChange = (channel: 'email' | 'inApp', value: boolean) => {
        const newPreferences = {
            ...settings.preferences,
            renewals: {
                ...settings.preferences.renewals,
                [channel]: value,
            }
        };
        const updatedSettings = { ...settings, preferences: newPreferences };
        setSettings(updatedSettings);
        // In a real app, you would debounce this or have a save button
        onUpdate(updatedSettings);
    };

    const handleAddDay = () => {
        const day = parseInt(newDay, 10);
        if (!isNaN(day) && day > 0 && !settings.renewalDaysBefore.includes(day)) {
            const newDays = [...settings.renewalDaysBefore, day].sort((a, b) => b - a);
            const updatedSettings = { ...settings, renewalDaysBefore: newDays };
            setSettings(updatedSettings);
            onUpdate(updatedSettings);
            setNewDay('');
        }
    };

    const handleRemoveDay = (dayToRemove: number) => {
        const newDays = settings.renewalDaysBefore.filter(d => d !== dayToRemove);
        const updatedSettings = { ...settings, renewalDaysBefore: newDays };
        setSettings(updatedSettings);
        onUpdate(updatedSettings);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Personal Notification Preferences</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Control how you are notified about upcoming renewals.</p>
                </div>
                <div className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-800 dark:text-gray-200">Renewal Alerts</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Receive reminders for contracts nearing their end date.</p>
                        </div>
                        <div className="flex items-center space-x-6">
                             <div className="text-center">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                <ToggleSwitch enabled={settings.preferences.renewals.email} onChange={(val) => handleToggleChange('email', val)} />
                            </div>
                             <div className="text-center">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">In-App</label>
                                <ToggleSwitch enabled={settings.preferences.renewals.inApp} onChange={(val) => handleToggleChange('inApp', val)} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Reminder Schedule</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage the specific days before expiration you wish to be notified.</p>
                </div>
                <div className="p-6">
                     <div className="flex flex-wrap gap-2">
                        {settings.renewalDaysBefore.map(day => (
                            <div key={day} className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1 text-sm font-medium text-gray-800 dark:text-gray-200">
                                {day} days
                                <button onClick={() => handleRemoveDay(day)} className="ml-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                                    <XIcon className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <input
                            type="number"
                            value={newDay}
                            onChange={e => setNewDay(e.target.value)}
                            placeholder="e.g., 45"
                            className="w-24 rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-sm"
                        />
                         <button onClick={handleAddDay} className="flex items-center px-3 py-1.5 text-sm font-semibold text-primary-900 bg-primary rounded-md hover:bg-primary-600">
                            <PlusIcon className="w-4 h-4 mr-1" />
                            Add
                        </button>
                    </div>
                </div>
            </div>

             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Company Policy Defaults</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">These are the default settings for your organization, managed by your administrator.</p>
                </div>
                <div className="p-6 space-y-3">
                    <p className="text-sm"><span className="font-semibold text-gray-700 dark:text-gray-300">Default Notice Period:</span> 30 days</p>
                    <p className="text-sm"><span className="font-semibold text-gray-700 dark:text-gray-300">Default Renewal Term:</span> 12 months</p>
                </div>
            </div>
        </div>
    );
}
