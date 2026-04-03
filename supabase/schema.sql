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
