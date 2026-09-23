-- Store client-to-worker reviews and immediately recalculate the worker's public rating.
create or replace function public.submit_worker_review(p_task_id uuid, p_rating numeric, p_comment text)
returns public.reviews
language plpgsql security definer set search_path = public as $$
declare
  task_record public.tasks;
  result public.reviews;
begin
  select * into task_record from public.tasks where id = p_task_id;
  if not found or task_record.status <> 'completed' or task_record.client_id <> auth.uid() or task_record.worker_id is null then
    raise exception 'Only the client who posted a completed task can rate its worker';
  end if;
  if p_rating < 1 or p_rating > 5 or p_comment is null or char_length(trim(p_comment)) not between 1 and 2000 then
    raise exception 'Enter a rating from 1 to 5 and a review comment';
  end if;

  insert into public.reviews (task_id, reviewer_id, reviewee_id, rating, comment)
  values (p_task_id, auth.uid(), task_record.worker_id, p_rating, trim(p_comment))
  returning * into result;

  update public.profiles
  set rating = coalesce((select round(avg(r.rating)::numeric, 1) from public.reviews r where r.reviewee_id = task_record.worker_id), 0),
      updated_at = now()
  where id = task_record.worker_id;
  return result;
end;
$$;

grant execute on function public.submit_worker_review(uuid, numeric, text) to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;
