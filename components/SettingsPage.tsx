
import React from 'react';
import { SunIcon, MoonIcon, MonitorIcon } from './icons';

type Theme = 'light' | 'dark' | 'system';

interface SettingsPageProps {
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const ThemeOption = ({
  label,
  value,
  icon,
  current,
  onClick
}: {
  label: string;
  value: Theme;
  icon: React.ReactNode;
  current: Theme;
  onClick: (theme: Theme) => void;
}) => {
  const isActive = current === value;
  return (
    <button
      onClick={() => onClick(value)}
      className={`rounded-lg border p-4 flex flex-col items-center justify-center space-y-2 w-full transition-colors duration-200 ${
        isActive
          ? 'bg-primary-100 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700 text-primary-800 dark:text-primary-100'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
      }`}
    >
      {icon}
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
};

export default function SettingsPage({ currentTheme, onThemeChange }: SettingsPageProps) {
  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your application preferences.</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
             <div className="p-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Appearance</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Choose how the application looks. Select a theme or sync with your system.
                </p>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <ThemeOption
                        label="Light"
                        value="light"
                        icon={<SunIcon className="w-6 h-6" />}
                        current={currentTheme}
                        onClick={onThemeChange}
                    />
                    <ThemeOption
                        label="Dark"
                        value="dark"
                        icon={<MoonIcon className="w-6 h-6" />}
                        current={currentTheme}
                        onClick={onThemeChange}
                    />
                    <ThemeOption
                        label="System"
                        value="system"
                        icon={<MonitorIcon className="w-6 h-6" />}
                        current={currentTheme}
                        onClick={onThemeChange}
                    />
                </div>
            </div>
        </div>
    </div>
  );
}
