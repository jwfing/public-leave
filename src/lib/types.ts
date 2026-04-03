export type LeaveType = 'annual' | 'sick' | 'personal';
export type Period = 'am' | 'pm';

export interface Leave {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  leave_type: LeaveType;
  start_date: string; // YYYY-MM-DD
  start_period: Period;
  end_date: string;   // YYYY-MM-DD
  end_period: Period;
  note: string | null;
  created_at: string;
}

export interface LeaveInsert {
  user_id: string;
  user_email: string;
  user_name: string;
  leave_type: LeaveType;
  start_date: string;
  start_period: Period;
  end_date: string;
  end_period: Period;
  note?: string;
}
