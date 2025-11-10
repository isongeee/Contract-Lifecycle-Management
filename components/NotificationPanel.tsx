import React from 'react';
import type { Notification } from '../types';
import { BellIcon } from './icons';

function timeSince(dateString: string) {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return "Just now";
}

// FIX: Changed component to be of type React.FC to correctly handle system props like 'key'.
const NotificationItem: React.FC<{ notification: Notification; onClick: (notification: Notification) => void; }> = ({ notification, onClick }) => (
    <button
        onClick={() => onClick(notification)}
        className="w-full text-left flex items-start p-3 space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700"
    >
        {!notification.is_read && <div className="w-2.5 h-2.5 bg-primary rounded-full mt-1.5 flex-shrink-0"></div>}
        <div className={`flex-1 ${notification.is_read ? 'pl-5' : ''}`}>
            <p className="text-sm text-gray-700 dark:text-gray-200">{notification.message}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{timeSince(notification.created_at)}</p>
        </div>
    </button>
);


interface NotificationPanelProps {
    notifications: Notification[];
    onNotificationClick: (notification: Notification) => void;
    onMarkAllAsRead: () => void;
}

export default function NotificationPanel({ notifications, onNotificationClick, onMarkAllAsRead }: NotificationPanelProps) {
    return (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-10">
            <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
                <button onClick={onMarkAllAsRead} className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">
                    Mark all as read
                </button>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                {notifications.length > 0 ? (
                    notifications.map(n => (
                        <NotificationItem key={n.id} notification={n} onClick={onNotificationClick} />
                    ))
                ) : (
                    <div className="text-center py-10">
                        <BellIcon className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">You're all caught up!</p>
                    </div>
                )}
            </div>
        </div>
    );
}