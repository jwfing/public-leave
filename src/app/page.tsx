// src/app/page.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLeaves } from '@/hooks/useLeaves';
import { Header } from '@/components/Header';
import { Calendar } from '@/components/Calendar';
import { LeaveForm } from '@/components/LeaveForm';
import { LeaveList } from '@/components/LeaveList';
import { LEAVE_TYPES } from '@/lib/constants';
import type { LeaveType } from '@/lib/types';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { leaves, loading: leavesLoading, addLeave, deleteLeave } = useLeaves();
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  if (authLoading || leavesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  if (!user) return null;

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowForm(true);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-6">
        {/* Legend */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setSelectedDate(null);
              setShowForm(true);
            }}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + 申请请假
          </button>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            {(Object.keys(LEAVE_TYPES) as LeaveType[]).map((type) => (
              <div key={type} className="flex items-center gap-1">
                <span
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ backgroundColor: LEAVE_TYPES[type].color }}
                />
                {LEAVE_TYPES[type].label}
              </div>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <Calendar leaves={leaves} onDateClick={handleDateClick} />

        {/* My Leaves */}
        <LeaveList leaves={leaves} currentUserId={user.id} onDelete={deleteLeave} />
      </main>

      {/* Leave Form Modal */}
      {showForm && (
        <LeaveForm
          user={user}
          initialDate={selectedDate}
          onSubmit={addLeave}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
