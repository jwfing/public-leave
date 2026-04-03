// src/components/LeaveList.tsx
'use client';

import type { Leave } from '@/lib/types';
import { LEAVE_TYPES, PERIOD_LABELS } from '@/lib/constants';

interface LeaveListProps {
  leaves: Leave[];
  currentUserId: string;
  onDelete: (id: string) => Promise<void>;
}

export function LeaveList({ leaves, currentUserId, onDelete }: LeaveListProps) {
  const myLeaves = leaves
    .filter((l) => l.user_id === currentUserId)
    .sort((a, b) => b.start_date.localeCompare(a.start_date));

  if (myLeaves.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
        暂无请假记录
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">我的请假</h3>
      </div>
      <ul className="divide-y divide-gray-100">
        {myLeaves.map((leave) => {
          const config = LEAVE_TYPES[leave.leave_type];
          return (
            <li key={leave.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span
                  className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: config.color + '20', color: config.color }}
                >
                  {config.label}
                </span>
                <span className="text-sm text-gray-900">
                  {leave.start_date} {PERIOD_LABELS[leave.start_period]} ~ {leave.end_date}{' '}
                  {PERIOD_LABELS[leave.end_period]}
                </span>
                {leave.note && (
                  <span className="text-sm text-gray-500">({leave.note})</span>
                )}
              </div>
              <button
                onClick={() => onDelete(leave.id)}
                className="text-sm text-red-500 hover:text-red-700"
              >
                取消
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
