-- Erranus secure backend schema
-- Run this in the Supabase SQL Editor after creating the project.

create extension if not exists "pgcrypto";

create type public.account_type as enum ('client', 'worker', 'dual');
create type public.task_status as enum ('open', 'accepted', 'in_progress', 'completion_requested', 'completed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) >= 2),
  account_type public.account_type not null default 'dual',
  avatar_url text,
  about text,
  public_area text,
  languages text[] not null default '{}',
  rating numeric(2,1) not null default 0 check (rating between 0 and 5),
  completed_task_count integer not null default 0 check (completed_task_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.private_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  phone_number text
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete restrict,
  worker_id uuid references public.profiles(id) on delete restrict,
  title text not null,
  category text not null,
  public_area text not null,
  amount numeric(12,2) not null check (amount > 0),
  duration text not null,
  description text not null,
  status public.task_status not null default 'open',
  agreement_signed_at timestamptz,
  worker_signature text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_private_details (
  task_id uuid primary key references public.tasks(id) on delete cascade,
  exact_address text not null
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  task_id uuid unique not null references public.tasks(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating numeric(2,1) not null check (rating between 1 and 5),
  comment text not null check (char_length(trim(comment)) between 1 and 2000),
  created_at timestamptz not null default now(),
  check (reviewer_id <> reviewee_id)
);

-- Create a matching profile when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, account_type)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'Erranus member'), coalesce((new.raw_user_meta_data ->> 'account_type')::public.account_type, 'dual'));
  insert into public.private_profiles (id, phone_number) values (new.id, new.raw_user_meta_data ->> 'phone_number');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.private_profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.task_private_details enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;

-- Public profile details never include email or phone number.
create policy "public profile summary" on public.profiles for select using (true);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "users view own private profile" on public.private_profiles for select using (auth.uid() = id);
create policy "users update own private profile" on public.private_profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "signed-in users view tasks" on public.tasks for select to authenticated using (true);
create policy "clients create own tasks" on public.tasks for insert to authenticated with check (auth.uid() = client_id);
create policy "clients update own unassigned tasks" on public.tasks for update to authenticated using (auth.uid() = client_id and worker_id is null) with check (auth.uid() = client_id);
create policy "task participants view exact address after assignment" on public.task_private_details for select to authenticated using (
  exists (select 1 from public.tasks t where t.id = task_id and t.worker_id is not null and auth.uid() in (t.client_id, t.worker_id))
);
create policy "clients add task exact address" on public.task_private_details for insert to authenticated with check (
  exists (select 1 from public.tasks t where t.id = task_id and auth.uid() = t.client_id)
);

create policy "participants view messages" on public.messages for select to authenticated using (
  exists (select 1 from public.tasks t where t.id = task_id and auth.uid() in (t.client_id, t.worker_id))
);
create policy "participants send messages" on public.messages for insert to authenticated with check (
  auth.uid() = sender_id and exists (select 1 from public.tasks t where t.id = task_id and auth.uid() in (t.client_id, t.worker_id))
);
create policy "participants view reviews" on public.reviews for select using (true);
create policy "task participants leave one review" on public.reviews for insert to authenticated with check (
  auth.uid() = reviewer_id and exists (select 1 from public.tasks t where t.id = task_id and t.status = 'completed' and auth.uid() in (t.client_id, t.worker_id))
);

-- Do not select phone_number or exact_address from browser queries.
create view public.public_profiles with (security_invoker = true) as
select id, full_name, account_type, avatar_url, about, public_area, languages, rating, completed_task_count
from public.profiles;