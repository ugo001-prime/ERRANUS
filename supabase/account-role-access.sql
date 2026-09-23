-- Enforce Erranus account-role task permissions in Supabase.
-- Run once in the Supabase SQL Editor.

drop policy if exists "clients create own tasks" on public.tasks;
create policy "clients and dual accounts create own tasks" on public.tasks
for insert to authenticated with check (
  auth.uid() = client_id
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.account_type in ('client', 'dual')
  )
);

create or replace function public.accept_task(p_task_id uuid, p_signature text)
returns public.tasks
language plpgsql security definer set search_path = public as $$
declare result public.tasks;
begin
  update public.tasks
  set worker_id = auth.uid(), status = 'accepted', agreement_signed_at = now(), worker_signature = p_signature, updated_at = now()
  where id = p_task_id and worker_id is null and status = 'open' and client_id <> auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.account_type in ('worker', 'dual')
    )
  returning * into result;
  if not found then raise exception 'Only Worker and Dual accounts can accept an available task'; end if;
  return result;
end;
$$;

grant execute on function public.accept_task(uuid, text) to authenticated;
