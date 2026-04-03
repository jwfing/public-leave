'use client';

import { useState } from 'react';
import type { Leave } from '@/lib/types';
import { CalendarCell } from './CalendarCell';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

interface CalendarProps {
  leaves: Leave[];
  onDateClick: (date: Date) => void;
}

function getCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const days: Date[] = [];

  for (let i = startDow - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  const lastDate = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= lastDate; d++) {
    days.push(new Date(year, month, d));
  }

  while (days.length < 42) {
    const next = days.length - startDow - lastDate + 1;
    days.push(new Date(year, month + 1, next));
  }

  return days;
}

export function Calendar({ leaves, onDateClick }: CalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const days = getCalendarDays(year, month);

  const goToPrev = () => {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNext = () => {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  };

  const goToToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  const monthLabel = `${year}年${month + 1}月`;

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{monthLabel}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            今天
          </button>
          <button
            onClick={goToPrev}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            &lt;
          </button>
          <button
            onClick={goToNext}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            &gt;
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-200">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-2 text-center text-xs font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((date, i) => (
          <CalendarCell
            key={i}
            date={date}
            leaves={leaves}
            isCurrentMonth={date.getMonth() === month}
            isToday={
              date.getDate() === today.getDate() &&
              date.getMonth() === today.getMonth() &&
              date.getFullYear() === today.getFullYear()
            }
            onClick={onDateClick}
          />
        ))}
      </div>
    </div>
  );
}
