# Leave Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a leave management web app where users log in via Google OAuth, submit half-day-granularity leave requests (auto-effective), and view everyone's leaves on a shared monthly calendar with realtime updates.

**Architecture:** Client-side SPA pattern using Next.js App Router. Supabase handles auth (Google OAuth), database (leaves table with RLS), and realtime subscriptions. All data access happens client-side via `@supabase/supabase-js`. Middleware handles session refresh and auth redirects.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Supabase (Auth, Database, Realtime), TypeScript

---

## File Structure

```
src/
  app/
    layout.tsx              — (modify) Update metadata title/description
    page.tsx                — (rewrite) Main calendar page, protected
    login/
      page.tsx              — (create) Google OAuth login page
    auth/
      callback/
        route.ts            — (create) OAuth callback handler
    globals.css             — (modify) Add custom styles for calendar
  components/
    Calendar.tsx            — (create) Monthly calendar grid component
    CalendarCell.tsx        — (create) Single day cell with leave blocks
    LeaveForm.tsx           — (create) Modal form for creating a leave
    LeaveList.tsx           — (create) User's own leaves with delete
    Header.tsx              — (create) Top nav with user info + logout
  hooks/
    useLeaves.ts            — (create) Hook: fetch leaves + realtime subscription
    useAuth.ts              — (create) Hook: auth state management
  lib/
    types.ts                — (create) Shared TypeScript types
    constants.ts            — (create) Leave type config (labels, colors)
  utils/
    supabase/
      client.ts             — (existing) Browser Supabase client
      server.ts             — (existing) Server Supabase client
      middleware.ts          — (modify) Add auth check + redirect logic
  middleware.ts              — (modify) Wire up auth redirect
supabase/
  schema.sql                — (create) SQL for leaves table + RLS policies
```

---

### Task 1: Database Schema

**Files:**
- Create: `supabase/schema.sql`

This SQL must be run manually in the Supabase dashboard (SQL Editor).

- [ ] **Step 1: Create the schema SQL file**

```sql
-- Create the leaves table
create table public.leaves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  user_name text not null,
  leave_type text not null check (leave_type in ('annual', 'sick', 'personal')),
  start_date date not null,
  start_period text not null check (start_period in ('am', 'pm')),
  end_date date not null,
  end_period text not null check (end_period in ('am', 'pm')),
  note text,
  created_at timestamptz not null default now(),
  constraint valid_date_range check (
    start_date < end_date
    or (start_date = end_date and (start_period = 'am' or end_period = 'pm'))
  )
);

-- Enable RLS
alter table public.leaves enable row level security;

-- All authenticated users can view all leaves
create policy "Authenticated users can view all leaves"
  on public.leaves for select
  to authenticated
  using (true);

-- Users can insert their own leaves
create policy "Users can insert own leaves"
  on public.leaves for insert
  to authenticated
  with check (user_id = auth.uid());

-- Users can delete their own leaves
create policy "Users can delete own leaves"
  on public.leaves for delete
  to authenticated
  using (user_id = auth.uid());

-- Enable realtime for the leaves table
alter publication supabase_realtime add table public.leaves;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add leaves table schema with RLS policies"
```

---

### Task 2: Types and Constants

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/constants.ts`

- [ ] **Step 1: Create types file**

```typescript
// src/lib/types.ts
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
```

- [ ] **Step 2: Create constants file**

```typescript
// src/lib/constants.ts
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
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts src/lib/constants.ts
git commit -m "feat: add leave types and constants"
```

---

### Task 3: Auth — Middleware Update

**Files:**
- Modify: `src/utils/supabase/middleware.ts`
- Modify: `src/middleware.ts`

- [ ] **Step 1: Update Supabase middleware helper to check auth and redirect**

Replace the entire content of `src/utils/supabase/middleware.ts` with:

```typescript
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  // If not logged in and not on login or auth callback page, redirect to login
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

- [ ] **Step 2: Update middleware.ts to use the new helper**

Replace the entire content of `src/middleware.ts` with:

```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/supabase/middleware.ts src/middleware.ts
git commit -m "feat: add auth check to middleware with login redirect"
```

---

### Task 4: Auth — Login Page and OAuth Callback

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/auth/callback/route.ts`

- [ ] **Step 1: Create login page**

```tsx
// src/app/login/page.tsx
'use client';

import { createClient } from '@/utils/supabase/client';

export default function LoginPage() {
  const supabase = createClient();

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">请假管理系统</h1>
        <p className="mb-8 text-center text-sm text-gray-500">使用 Google 账号登录</p>
        <button
          onClick={handleLogin}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          使用 Google 登录
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create OAuth callback route**

```typescript
// src/app/auth/callback/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(origin);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/login/page.tsx src/app/auth/callback/route.ts
git commit -m "feat: add Google OAuth login page and callback"
```

---

### Task 5: Auth Hook

**Files:**
- Create: `src/hooks/useAuth.ts`

- [ ] **Step 1: Create auth hook**

```typescript
// src/hooks/useAuth.ts
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return { user, loading, signOut };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useAuth.ts
git commit -m "feat: add useAuth hook"
```

---

### Task 6: Leaves Hook (Fetch + Realtime)

**Files:**
- Create: `src/hooks/useLeaves.ts`

- [ ] **Step 1: Create useLeaves hook**

```typescript
// src/hooks/useLeaves.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Leave, LeaveInsert } from '@/lib/types';

export function useLeaves() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchLeaves = useCallback(async () => {
    const { data, error } = await supabase
      .from('leaves')
      .select('*')
      .order('start_date', { ascending: true });

    if (!error && data) {
      setLeaves(data as Leave[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchLeaves();

    const channel = supabase
      .channel('leaves-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leaves' },
        () => {
          fetchLeaves();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchLeaves]);

  const addLeave = async (leave: LeaveInsert) => {
    const { error } = await supabase.from('leaves').insert(leave);
    if (error) throw error;
  };

  const deleteLeave = async (id: string) => {
    const { error } = await supabase.from('leaves').delete().eq('id', id);
    if (error) throw error;
  };

  return { leaves, loading, addLeave, deleteLeave };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useLeaves.ts
git commit -m "feat: add useLeaves hook with realtime subscription"
```

---

### Task 7: Header Component

**Files:**
- Create: `src/components/Header.tsx`

- [ ] **Step 1: Create Header component**

```tsx
// src/components/Header.tsx
'use client';

import { useAuth } from '@/hooks/useAuth';

export function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
      <h1 className="text-xl font-bold text-gray-900">请假管理</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{user?.user_metadata?.full_name ?? user?.email}</span>
        <button
          onClick={signOut}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-200"
        >
          退出
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat: add Header component with user info and logout"
```

---

### Task 8: Calendar Components

**Files:**
- Create: `src/components/CalendarCell.tsx`
- Create: `src/components/Calendar.tsx`

- [ ] **Step 1: Create CalendarCell component**

This component renders a single day cell. It shows leave entries as colored blocks, with AM leaves in the top half and PM leaves in the bottom half.

```tsx
// src/components/CalendarCell.tsx
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

    // Determine if this leave covers AM for this date
    const coversAM = isStartDate ? leave.start_period === 'am' : true;
    // Determine if this leave covers PM for this date
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
```

- [ ] **Step 2: Create Calendar component**

```tsx
// src/components/Calendar.tsx
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
  // Monday = 0, Sunday = 6
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const days: Date[] = [];

  // Previous month padding
  for (let i = startDow - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  // Current month
  const lastDate = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= lastDate; d++) {
    days.push(new Date(year, month, d));
  }

  // Next month padding to fill 6 rows
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
      {/* Header */}
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

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-2 text-center text-xs font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
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
```

- [ ] **Step 3: Commit**

```bash
git add src/components/CalendarCell.tsx src/components/Calendar.tsx
git commit -m "feat: add Calendar and CalendarCell components"
```

---

### Task 9: Leave Form Modal

**Files:**
- Create: `src/components/LeaveForm.tsx`

- [ ] **Step 1: Create LeaveForm component**

```tsx
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

    // Validate date range
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/LeaveForm.tsx
git commit -m "feat: add LeaveForm modal component"
```

---

### Task 10: Leave List (My Leaves) Component

**Files:**
- Create: `src/components/LeaveList.tsx`

- [ ] **Step 1: Create LeaveList component**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/LeaveList.tsx
git commit -m "feat: add LeaveList component for user's own leaves"
```

---

### Task 11: Main Page — Wire Everything Together

**Files:**
- Rewrite: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Update layout.tsx metadata**

In `src/app/layout.tsx`, change the metadata:

```typescript
export const metadata: Metadata = {
  title: "请假管理系统",
  description: "团队请假管理 — 日历视图",
};
```

- [ ] **Step 2: Update globals.css**

Replace the content of `src/app/globals.css` with:

```css
@import "tailwindcss";

:root {
  --background: #f9fafb;
  --foreground: #111827;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), Arial, Helvetica, sans-serif;
}
```

- [ ] **Step 3: Rewrite page.tsx as the main dashboard**

```tsx
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

  if (!user) return null; // Middleware redirects to /login

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
```

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/app/layout.tsx src/app/globals.css
git commit -m "feat: wire up main dashboard with calendar, form, and leave list"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Run build to check for TypeScript errors**

```bash
npm run build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 2: Manual verification checklist**

1. Ensure Google OAuth provider is enabled in Supabase dashboard (Authentication → Providers → Google)
2. Run the SQL from `supabase/schema.sql` in Supabase SQL Editor
3. Run `npm run dev` and test:
   - Visit `/` → redirected to `/login`
   - Click Google login → redirected back to `/`
   - Click a date → leave form opens with date pre-filled
   - Submit a leave → appears on calendar
   - Delete a leave from "My Leaves" → removed from calendar
   - Open in another browser/tab → realtime updates appear

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: address build issues"
```
