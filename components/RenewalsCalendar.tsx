import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Contract } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from './icons';
import { RenewalStatus } from '../types';

interface RenewalsCalendarProps {
  contracts: Contract[];
  onSelectContract: (contract: Contract) => void;
  onNavigateToWorkspace: (contract: Contract) => void;
}

const EventIndicator: React.FC<{ type: 'renewal' | 'notice' }> = ({ type }) => (
  <div className={`mt-1 flex items-center w-full px-1 py-0.5 rounded ${type === 'renewal' ? 'bg-primary-100' : 'bg-red-100'}`}>
    <div className={`w-1.5 h-1.5 rounded-full ${type === 'renewal' ? 'bg-primary-500' : 'bg-red-500'}`}></div>
    <p className={`ml-1 text-xs truncate ${type === 'renewal' ? 'text-primary-800' : 'text-red-800'}`}>
        {type === 'renewal' ? 'End Date' : 'Notice Due'}
    </p>
  </div>
);

type CalendarEvent = { type: 'renewal' | 'notice', contract: Contract };

export default function RenewalsCalendar({ contracts, onSelectContract, onNavigateToWorkspace }: RenewalsCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateEvents, setSelectedDateEvents] = useState<{ day: number, events: CalendarEvent[] } | null>(null);
  const [showRenewals, setShowRenewals] = useState(true);
  const [showNotices, setShowNotices] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
            setIsModalOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startingDay = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  
  const eventsByDay = useMemo(() => {
    const events: { [key: number]: CalendarEvent[] } = {};
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    contracts.forEach(contract => {
        if (showRenewals) {
            const endDate = new Date(contract.endDate + 'T00:00:00Z');
            if(endDate.getUTCFullYear() === year && endDate.getUTCMonth() === month) {
                const day = endDate.getUTCDate();
                if(!events[day]) events[day] = [];
                events[day].push({ type: 'renewal', contract });
            }
        }
        if (showNotices && contract.renewalRequest?.noticeDeadline) {
             const noticeDate = new Date(contract.renewalRequest.noticeDeadline + 'T00:00:00Z');
             if(noticeDate.getUTCFullYear() === year && noticeDate.getUTCMonth() === month) {
                const day = noticeDate.getUTCDate();
                if(!events[day]) events[day] = [];
                events[day].push({ type: 'notice', contract });
            }
        }
    });
    return events;
  }, [contracts, currentDate, showRenewals, showNotices]);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: startingDay }, (_, i) => i);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const handleDayClick = (day: number) => {
    if (eventsByDay[day] && eventsByDay[day].length > 0) {
        setSelectedDateEvents({ day, events: eventsByDay[day] });
        setIsModalOpen(true);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 relative">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}
        </h3>
        <div className="flex items-center space-x-4">
            <label className="flex items-center text-sm"><input type="checkbox" checked={showRenewals} onChange={e => setShowRenewals(e.target.checked)} className="h-4 w-4 rounded text-primary focus:ring-primary mr-2" /> End Dates</label>
            <label className="flex items-center text-sm"><input type="checkbox" checked={showNotices} onChange={e => setShowNotices(e.target.checked)} className="h-4 w-4 rounded text-red-500 focus:ring-red-500 mr-2" /> Notice Deadlines</label>
            <button onClick={handlePrevMonth} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronLeftIcon className="w-5 h-5" /></button>
            <button onClick={handleNextMonth} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronRightIcon className="w-5 h-5" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {weekDays.map(day => (
            <div key={day} className="py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50">{day}</div>
        ))}
        {blanks.map(b => <div key={`blank-${b}`} className="bg-white dark:bg-gray-800"></div>)}
        {days.map(day => (
            <button key={day} onClick={() => handleDayClick(day)} className="p-1 h-28 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 text-left align-top hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:hover:bg-white dark:disabled:hover:bg-gray-800" disabled={!eventsByDay[day]}>
                <span>{day}</span>
                <div className="flex flex-col space-y-1 mt-1">
                    {eventsByDay[day]?.map((event, index) => (
                        <EventIndicator key={`${event.contract.id}-${event.type}-${index}`} type={event.type} />
                    ))}
                </div>
            </button>
        ))}
      </div>
       {isModalOpen && selectedDateEvents && (
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-20">
                <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-bold">Events for {currentDate.toLocaleString('default', { month: 'long' })} {selectedDateEvents.day}</h4>
                        <button onClick={() => setIsModalOpen(false)}><XIcon className="w-5 h-5" /></button>
                    </div>
                    <ul className="space-y-3">
                        {selectedDateEvents.events.map(({type, contract}, index) => (
                            <li key={`${contract.id}-${index}`} className="p-3 rounded-md bg-gray-50 dark:bg-gray-700/50">
                                <p className={`font-semibold ${type === 'renewal' ? 'text-primary-800' : 'text-red-800'}`}>{type === 'renewal' ? 'Contract End Date' : 'Notice Deadline'}</p>
                                <p className="font-medium text-gray-800 dark:text-gray-200">{contract.title}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">vs. {contract.counterparty.name}</p>
                                <div className="mt-2 text-right space-x-2">
                                    <button onClick={() => { onSelectContract(contract); setIsModalOpen(false); }} className="text-sm font-semibold text-primary-600 hover:underline">View Contract</button>
                                     {contract.renewalRequest?.status === RenewalStatus.IN_PROGRESS && (
                                        <button onClick={() => { onNavigateToWorkspace(contract); setIsModalOpen(false); }} className="px-2 py-1 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">Workspace</button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
       )}
    </div>
  );
}