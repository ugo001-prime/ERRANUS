-- Unique usernames for existing Erranus projects.
alter table public.profiles add column if not exists username text;

update public.profiles p
set username = lower(regexp_replace(split_part(u.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g')) || '_' || right(replace(p.id::text, '-', ''), 6)
from auth.users u
where p.id = u.id and (p.username is null or trim(p.username) = '');

alter table public.profiles alter column username set not null;
alter table public.profiles add constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,24}$');
create unique index if not exists profiles_username_lower_key on public.profiles (lower(username));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, username, account_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Erranus member'),
    lower(new.raw_user_meta_data ->> 'username'),
    coalesce((new.raw_user_meta_data ->> 'account_type')::public.account_type, 'dual')
  );
  insert into public.private_profiles (id, phone_number) values (new.id, new.raw_user_meta_data ->> 'phone_number');
  return new;
end;
$$;
