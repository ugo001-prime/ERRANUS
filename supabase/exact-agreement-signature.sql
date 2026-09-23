-- A worker must sign an agreement with their exact stored profile name.
create or replace function public.accept_task(p_task_id uuid, p_signature text)
returns public.tasks
language plpgsql security definer set search_path = public as $$
declare
  result public.tasks;
  expected_name text;
begin
  select full_name into expected_name from public.profiles where id = auth.uid();

  if p_signature is distinct from expected_name then
    raise exception 'Enter your full name exactly as it appears on your profile';
  end if;

  update public.tasks
  set worker_id = auth.uid(),
      status = 'accepted',
      agreement_signed_at = now(),
      worker_signature = p_signature,
      updated_at = now()
  where id = p_task_id
    and worker_id is null
    and status = 'open'
    and client_id <> auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.account_type in ('worker', 'dual')
    )
  returning * into result;

  if not found then
    raise exception 'Only Worker and Dual accounts can accept an available task';
  end if;
  return result;
end;
$$;

grant execute on function public.accept_task(uuid, text) to authenticated;
