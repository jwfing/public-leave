// src/components/LeaveForm.tsx
'use client';

import { useState } from 'react';
import type { LeaveType, Period, LeaveInsert } from '@/lib/types';
import { LEAVE_TYPES, PERIOD_LABELS } from '@/lib/constants';
import type { User } from '@supabase/supabase-js';

interface LeaveFormProps {
  user: User;
  initialDate: Date | null;
  onSubmit: (leave: LeaveInsert) => Promise<void>;
  onClose: () => void;
}

function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function LeaveForm({ user, initialDate, onSubmit, onClose }: LeaveFormProps) {
  const defaultDate = initialDate ? formatDateInput(initialDate) : formatDateInput(new Date());

  const [leaveType, setLeaveType] = useState<LeaveType>('annual');
  const [startDate, setStartDate] = useState(defaultDate);
  const [startPeriod, setStartPeriod] = useState<Period>('am');
  const [endDate, setEndDate] = useState(defaultDate);
  const [endPeriod, setEndPeriod] = useState<Period>('pm');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (startDate > endDate) {
      setError('开始日期不能晚于结束日期');
      return;
    }
    if (startDate === endDate && startPeriod === 'pm' && endPeriod === 'am') {
      setError('结束时段不能早于开始时段');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        user_id: user.id,
        user_email: user.email!,
        user_name: user.user_metadata?.full_name ?? user.email!,
        leave_type: leaveType,
        start_date: startDate,
        start_period: startPeriod,
        end_date: endDate,
        end_period: endPeriod,
        note: note || undefined,
      });
      onClose();
    } catch {
      setError('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900">申请请假</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Leave Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">请假类型</label>
            <div className="flex gap-2">
              {(Object.keys(LEAVE_TYPES) as LeaveType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setLeaveType(type)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    leaveType === type
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={leaveType === type ? { backgroundColor: LEAVE_TYPES[type].color } : undefined}
                >
                  {LEAVE_TYPES[type].label}
                </button>
              ))}
            </div>
          </div>

          {/* Start */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">开始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="w-24">
              <label className="mb-1 block text-sm font-medium text-gray-700">时段</label>
              <select
                value={startPeriod}
                onChange={(e) => setStartPeriod(e.target.value as Period)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="am">{PERIOD_LABELS.am}</option>
                <option value="pm">{PERIOD_LABELS.pm}</option>
              </select>
            </div>
          </div>

          {/* End */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">结束日期</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="w-24">
              <label className="mb-1 block text-sm font-medium text-gray-700">时段</label>
              <select
                value={endPeriod}
                onChange={(e) => setEndPeriod(e.target.value as Period)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="am">{PERIOD_LABELS.am}</option>
                <option value="pm">{PERIOD_LABELS.pm}</option>
              </select>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">备注（选填）</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="请假原因..."
            />
          </div>

          {/* Error */}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Buttons */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? '提交中...' : '提交'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
