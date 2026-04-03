# Leave Management System Design

## Overview

A leave management web app built with Next.js + Supabase. Users log in via Google OAuth, submit leave requests (no approval needed), and view everyone's leaves on a shared calendar.

## Architecture

- **Frontend**: Next.js 16 App Router, Tailwind CSS v4
- **Backend**: Supabase (Auth, Database, Realtime)
- **Auth**: Supabase Auth with Google OAuth provider
- **Data access**: Client-side via `@supabase/supabase-js`, protected by RLS
- **Realtime**: Supabase Realtime subscriptions for live calendar updates

## Database Schema

### `leaves` table

| Column       | Type         | Constraints                    |
|--------------|--------------|--------------------------------|
| id           | uuid         | PK, default gen_random_uuid() |
| user_id      | uuid         | FK → auth.users(id), NOT NULL |
| user_email   | text         | NOT NULL                       |
| user_name    | text         | NOT NULL                       |
| leave_type   | text         | NOT NULL, check in (annual, sick, personal) |
| start_date   | date         | NOT NULL                       |
| start_period | text         | NOT NULL, check in (am, pm)    |
| end_date     | date         | NOT NULL                       |
| end_period   | text         | NOT NULL, check in (am, pm)    |
| note         | text         | nullable                       |
| created_at   | timestamptz  | default now()                  |

### RLS Policies

- **SELECT**: `authenticated` role can read all rows
- **INSERT**: `authenticated` role, with check `user_id = auth.uid()`
- **DELETE**: `authenticated` role, with check `user_id = auth.uid()`

## Pages

### `/login`
- Google OAuth login button
- Redirects to `/` after successful login

### `/auth/callback`
- Route handler to exchange OAuth code for session
- Redirects to `/`

### `/` (Main page, protected)
- **Calendar view**: Monthly grid showing all leaves
  - Each cell shows leave entries as colored blocks
  - Half-day leaves render in top half (AM) or bottom half (PM) of the cell
  - Colors: Annual = blue, Sick = orange, Personal = purple
  - Navigation arrows for previous/next month
- **Leave form**: Modal dialog triggered by clicking a date or a "+" button
  - Fields: leave type (dropdown), start date, start period (AM/PM), end date, end period (AM/PM), note (optional)
  - Submit creates a record in Supabase
- **My leaves**: User can see and delete their own leave entries

### Auth flow
- Middleware checks session; unauthenticated users redirected to `/login`
- OAuth callback handled at `/auth/callback` (server-side route handler)

## Leave Types

| Type     | Label | Color  |
|----------|-------|--------|
| annual   | Annual Leave   | Blue (#3B82F6)   |
| sick     | Sick Leave   | Orange (#F97316) |
| personal | Personal Leave   | Purple (#8B5CF6) |

## Key Behaviors

- All leaves auto-effective on submission (no approval workflow)
- Users can only delete their own leaves
- All authenticated users see all leaves on the calendar
- Realtime subscription updates the calendar when any user adds/removes a leave
- start_date must be <= end_date; if same day, start_period must be <= end_period (am <= pm)
