
import React, { useState, useMemo } from 'react';
import type { Contract } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

interface RenewalsCalendarProps {
  contracts: Contract[];
}

// FIX: Changed component to be of type React.FC to correctly handle system props like 'key'.
const EventIndicator: React.FC<{ type: 'renewal' | 'notice' }> = ({ type }) => (
  <div className={`mt-1 mx-auto w-2 h-2 rounded-full ${type === 'renewal' ? 'bg-primary' : ''}`}>
    {type === 'notice' && <div className="w-0 h-0 border-l-[4px] border-l-transparent border-b-[6px] border-b-red-500 border-r-[4px] border-r-transparent"></div>}
  </div>
);

export default function RenewalsCalendar({ contracts }: RenewalsCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startingDay = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  
  const eventsByDay = useMemo(() => {
    const events: { [key: number]: { type: 'renewal' | 'notice', contract: Contract }[] } = {};
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    contracts.forEach(contract => {
        // Handle renewal date by parsing as UTC
        const endDate = new Date(contract.endDate + 'T00:00:00Z');
        if(endDate.getUTCFullYear() === year && endDate.getUTCMonth() === month) {
            const day = endDate.getUTCDate();
            if(!events[day]) events[day] = [];
            events[day].push({ type: 'renewal', contract });
        }
        
        // Handle notice deadline by parsing as UTC
        if(contract.renewalRequest?.noticeDeadline) {
             const noticeDate = new Date(contract.renewalRequest.noticeDeadline + 'T00:00:00Z');
             if(noticeDate.getUTCFullYear() === year && noticeDate.getUTCMonth() === month) {
                const day = noticeDate.getUTCDate();
                if(!events[day]) events[day] = [];
                events[day].push({ type: 'notice', contract });
            }
        }
    });
    return events;
  }, [contracts, currentDate]);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: startingDay }, (_, i) => i);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}
        </h3>
        <div className="flex space-x-2">
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
            <div key={day} className="p-2 h-24 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200">
                <span>{day}</span>
                <div className="flex flex-col items-center">
                    {eventsByDay[day]?.map((event, index) => (
                        <EventIndicator key={`${event.contract.id}-${event.type}-${index}`} type={event.type} />
                    ))}
                </div>
            </div>
        ))}
      </div>
       <div className="mt-4 flex space-x-4">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-primary mr-2"></div>
            <span className="text-sm text-gray-600 dark:text-gray-300">Renewal Date</span>
          </div>
          <div className="flex items-center">
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-b-[9px] border-b-red-500 border-r-[6px] border-r-transparent mr-2"></div>
            <span className="text-sm text-gray-600 dark:text-gray-300">Notice Deadline</span>
          </div>
        </div>
    </div>
  );
}