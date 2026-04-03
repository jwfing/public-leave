import type { LeaveType } from './types';

export const LEAVE_TYPES: Record<LeaveType, { label: string; color: string; bg: string }> = {
  annual:   { label: '年假', color: '#3B82F6', bg: 'bg-blue-100 text-blue-800' },
  sick:     { label: '病假', color: '#F97316', bg: 'bg-orange-100 text-orange-800' },
  personal: { label: '事假', color: '#8B5CF6', bg: 'bg-purple-100 text-purple-800' },
};

export const PERIOD_LABELS: Record<string, string> = {
  am: '上午',
  pm: '下午',
};
