import React from 'react';
import type { NotificationSetting } from '../types';
import ToggleSwitch from './ToggleSwitch';

interface NotificationsTabProps {
  settings: NotificationSetting[];
  setSettings: React.Dispatch<React.SetStateAction<NotificationSetting[]>>;
}

export default function NotificationsTab({ settings, setSettings }: NotificationsTabProps) {

  const handleToggle = (id: string, method: 'email' | 'inApp' | 'sms', value: boolean) => {
    setSettings(prev => 
        prev.map(setting => 
            setting.id === id ? { ...setting, [method]: value } : setting
        )
    );
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
        <p className="text-sm text-gray-500 mt-1">Configure how your organization receives alerts.</p>
      </div>
      <ul role="list" className="divide-y divide-gray-200">
        {settings.map((setting) => (
          <li key={setting.id} className="flex items-center justify-between p-4">
            <div className="w-2/3">
              <p className="text-sm font-medium text-gray-900">{setting.type}</p>
              <p className="text-sm text-gray-500">{setting.description}</p>
            </div>
            <div className="flex items-center space-x-6">
                <div className="text-center">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <ToggleSwitch enabled={setting.email} onChange={(val) => handleToggle(setting.id, 'email', val)} />
                </div>
                 <div className="text-center">
                    <label className="block text-sm font-medium text-gray-700 mb-1">In-App</label>
                    <ToggleSwitch enabled={setting.inApp} onChange={(val) => handleToggle(setting.id, 'inApp', val)} />
                </div>
                 <div className="text-center">
                    <label className="block text-sm font-medium text-gray-700 mb-1">SMS</label>
                    <ToggleSwitch enabled={setting.sms} onChange={(val) => handleToggle(setting.id, 'sms', val)} />
                </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}