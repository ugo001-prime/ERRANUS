-- One-time cleanup: retain the oldest original task in each exact duplicate group.
with ranked_tasks as (
  select id,
         row_number() over (
           partition by client_id,
                        lower(trim(title)),
                        lower(trim(category)),
                        lower(trim(public_area)),
                        amount,
                        lower(trim(duration)),
                        lower(trim(description))
           order by created_at asc, id asc
         ) as copy_number
  from public.tasks
)
delete from public.tasks as task
using ranked_tasks as duplicate
where task.id = duplicate.id
  and duplicate.copy_number > 1;

-- Blocks duplicate active task submissions while allowing a completed task to be posted again later.
create unique index if not exists tasks_one_active_copy_per_client
on public.tasks (
  client_id,
  lower(trim(title)),
  lower(trim(category)),
  lower(trim(public_area)),
  amount,
  lower(trim(duration)),
  lower(trim(description))
)
where status in ('open', 'accepted', 'in_progress', 'completion_requested');
