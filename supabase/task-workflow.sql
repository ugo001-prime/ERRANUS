-- Protected task actions. Run after schema.sql.
create or replace function public.accept_task(p_task_id uuid, p_signature text)
returns public.tasks
language plpgsql security definer set search_path = public as $$
declare result public.tasks;
begin
  update public.tasks
  set worker_id = auth.uid(), status = 'accepted', agreement_signed_at = now(), worker_signature = p_signature, updated_at = now()
  where id = p_task_id and worker_id is null and status = 'open' and client_id <> auth.uid()
  returning * into result;
  if not found then raise exception 'This task is no longer available'; end if;
  return result;
end;
$$;

create or replace function public.update_task_status(p_task_id uuid, p_status public.task_status)
returns public.tasks
language plpgsql security definer set search_path = public as $$
declare result public.tasks;
begin
  if p_status = 'in_progress' then
    update public.tasks set status = p_status, updated_at = now() where id = p_task_id and worker_id = auth.uid() and status = 'accepted' returning * into result;
  elsif p_status = 'completion_requested' then
    update public.tasks set status = p_status, updated_at = now() where id = p_task_id and worker_id = auth.uid() and status = 'in_progress' returning * into result;
  elsif p_status = 'completed' then
    update public.tasks set status = p_status, updated_at = now() where id = p_task_id and client_id = auth.uid() and status = 'completion_requested' returning * into result;
  else
    raise exception 'Invalid task status change';
  end if;
  if not found then raise exception 'This task cannot be updated'; end if;
  return result;
end;
$$;

grant execute on function public.accept_task(uuid, text) to authenticated;
grant execute on function public.update_task_status(uuid, public.task_status) to authenticated;
