-- Erranus administrator access. Run once in the Supabase SQL Editor.
-- This allows only the named administrator to change account type.

create or replace function public.restrict_account_type_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.account_type is distinct from old.account_type
    and coalesce(auth.jwt() ->> 'email', '') <> 'ogbogumichael03@gmail.com' then
    raise exception 'Only the Erranus administrator can change account type';
  end if;
  return new;
end;
$$;

drop trigger if exists restrict_account_type_changes on public.profiles;
create trigger restrict_account_type_changes
before update of account_type on public.profiles
for each row execute function public.restrict_account_type_changes();