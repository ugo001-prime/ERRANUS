-- Allow a client to delete only their own open, unassigned task.
create policy "clients delete own unassigned tasks" on public.tasks
for delete to authenticated
using (auth.uid() = client_id and worker_id is null and status = 'open');