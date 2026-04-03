'use client';

import type { Leave } from '@/lib/types';
import { LEAVE_TYPES } from '@/lib/constants';

interface CalendarCellProps {
  date: Date;
  leaves: Leave[];
  isCurrentMonth: boolean;
  isToday: boolean;
  onClick: (date: Date) => void;
}

function getLeaveEntriesForDate(date: Date, leaves: Leave[]): { am: Leave[]; pm: Leave[] } {
  const dateStr = formatDate(date);
  const am: Leave[] = [];
  const pm: Leave[] = [];

  for (const leave of leaves) {
    if (dateStr < leave.start_date || dateStr > leave.end_date) continue;

    const isStartDate = dateStr === leave.start_date;
    const isEndDate = dateStr === leave.end_date;

    const coversAM = isStartDate ? leave.start_period === 'am' : true;
    const coversPM = isEndDate ? leave.end_period === 'pm' : true;

    if (coversAM) am.push(leave);
    if (coversPM) pm.push(leave);
  }

  return { am, pm };
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function LeaveBlock({ leave }: { leave: Leave }) {
  const config = LEAVE_TYPES[leave.leave_type];
  return (
    <div
      className="truncate rounded px-1 text-xs leading-4"
      style={{ backgroundColor: config.color + '20', color: config.color }}
      title={`${leave.user_name} - ${config.label}`}
    >
      {leave.user_name?.split(' ')[0] ?? leave.user_email.split('@')[0]}
    </div>
  );
}

export function CalendarCell({ date, leaves, isCurrentMonth, isToday, onClick }: CalendarCellProps) {
  const { am, pm } = getLeaveEntriesForDate(date, leaves);
  const hasLeaves = am.length > 0 || pm.length > 0;

  return (
    <div
      onClick={() => onClick(date)}
      className={`flex min-h-[100px] cursor-pointer flex-col border border-gray-100 p-1 transition-colors hover:bg-blue-50 ${
        !isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
      }`}
    >
      <span
        className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
          isToday ? 'bg-blue-600 font-bold text-white' : ''
        }`}
      >
        {date.getDate()}
      </span>
      {hasLeaves && (
        <div className="flex flex-1 flex-col gap-px overflow-hidden">
          {am.length > 0 && (
            <div className="flex flex-col gap-px">
              {am.slice(0, 2).map((l) => (
                <LeaveBlock key={l.id + '-am'} leave={l} />
              ))}
              {am.length > 2 && (
                <span className="text-xs text-gray-400">+{am.length - 2}</span>
              )}
            </div>
          )}
          {pm.length > 0 && am.length > 0 && (
            <div className="my-px border-t border-dashed border-gray-200" />
          )}
          {pm.length > 0 && (
            <div className="flex flex-col gap-px">
              {pm.slice(0, 2).map((l) => (
                <LeaveBlock key={l.id + '-pm'} leave={l} />
              ))}
              {pm.length > 2 && (
                <span className="text-xs text-gray-400">+{pm.length - 2}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
