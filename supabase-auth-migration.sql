-- Flash Movie: Supabase Auth + account/device-limit migration
-- Apply once in Supabase Dashboard > SQL Editor as the project owner.
-- This is additive: it does not delete existing content, storage, or message data.

begin;

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text not null unique check (username ~ '^[a-z0-9_.-]{1,30}$'),
    account_name text not null default '',
    avatar_url text not null default '',
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    role text not null default 'user' check (role in ('user', 'admin')),
    follow_view boolean not null default true,
    follower_view boolean not null default true,
    created_at timestamptz not null default now()
);

create table if not exists public.device_accounts (
    device_id text not null check (device_id ~ '^[A-Za-z0-9_-]{4,80}$'),
    user_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (device_id, user_id)
);
create index if not exists device_accounts_user_idx on public.device_accounts(user_id);

create table if not exists public.device_limits (
    device_id text primary key check (device_id ~ '^[A-Za-z0-9_-]{4,80}$'),
    max_accounts integer not null check (max_accounts >= 1),
    updated_by uuid references auth.users(id) on delete set null,
    updated_at timestamptz not null default now()
);

create table if not exists public.account_limit_requests (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete set null,
    requester_email text,
    username text,
    device_id text not null check (device_id ~ '^[A-Za-z0-9_-]{4,80}$'),
    current_limit integer not null check (current_limit >= 1),
    requested_limit integer not null check (requested_limit >= 1),
    status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
    created_at timestamptz not null default now(),
    handled_by uuid references auth.users(id) on delete set null,
    handled_at timestamptz
);
create unique index if not exists one_pending_limit_request_per_device
    on public.account_limit_requests(device_id) where status = 'Pending';

create or replace function public.is_flash_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
    select exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin' and status = 'approved'
    );
$$;

create or replace function public.auth_migration_ready()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$ select to_regclass('public.profiles') is not null $$;

create or replace function public.get_device_usage(p_device_id text)
returns table(account_count integer, max_accounts integer)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
    v_limit integer;
    v_count integer;
begin
    if p_device_id is null or p_device_id !~ '^[A-Za-z0-9_-]{4,80}$' then
        raise exception 'INVALID_DEVICE_ID';
    end if;
    select dl.max_accounts into v_limit from public.device_limits dl where dl.device_id = p_device_id;
    select count(*)::integer into v_count from public.device_accounts da where da.device_id = p_device_id;
    return query select coalesce(v_count, 0), coalesce(v_limit, 2);
end;
$$;

create or replace function public.link_my_device(p_device_id text)
returns table(account_count integer, max_accounts integer)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
    v_user_id uuid := auth.uid();
    v_limit integer;
    v_count integer;
begin
    if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
    if p_device_id is null or p_device_id !~ '^[A-Za-z0-9_-]{4,80}$' then raise exception 'INVALID_DEVICE_ID'; end if;
    perform pg_advisory_xact_lock(hashtext(p_device_id));
    if not exists (
        select 1 from public.device_accounts da where da.device_id = p_device_id and da.user_id = v_user_id
    ) then
        select dl.max_accounts into v_limit from public.device_limits dl where dl.device_id = p_device_id;
        select count(*)::integer into v_count from public.device_accounts da where da.device_id = p_device_id;
        if coalesce(v_count, 0) >= coalesce(v_limit, 2) then raise exception 'DEVICE_LIMIT_REACHED'; end if;
        insert into public.device_accounts(device_id, user_id) values (p_device_id, v_user_id)
        on conflict (device_id, user_id) do nothing;
    end if;
    return query select usage.account_count, usage.max_accounts from public.get_device_usage(p_device_id) usage;
end;
$$;

create or replace function public.request_device_limit(
    p_device_id text,
    p_requester_email text,
    p_requested_limit integer,
    p_username text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
    v_current_limit integer;
    v_request_id uuid;
    v_username text;
begin
    if p_device_id is null or p_device_id !~ '^[A-Za-z0-9_-]{4,80}$' then raise exception 'INVALID_DEVICE_ID'; end if;
    if p_requester_email is not null and (length(trim(p_requester_email)) > 254 or trim(p_requester_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
        raise exception 'INVALID_EMAIL';
    end if;
    if p_requested_limit is null or p_requested_limit < 1 then raise exception 'INVALID_REQUESTED_LIMIT'; end if;
    select dl.max_accounts into v_current_limit from public.device_limits dl where dl.device_id = p_device_id;
    v_current_limit := coalesce(v_current_limit, 2);
    if p_requested_limit <= v_current_limit then raise exception 'REQUEST_NOT_HIGHER_THAN_CURRENT_LIMIT'; end if;
    v_username := nullif(lower(regexp_replace(trim(coalesce(p_username, '')), '^@+', '')), '');
    if v_username is not null and v_username !~ '^[a-z0-9_.-]{1,30}$' then raise exception 'INVALID_USERNAME'; end if;
    if v_username is null and p_requester_email is null then raise exception 'MISSING_REQUEST_CONTACT'; end if;

    insert into public.account_limit_requests(user_id, requester_email, username, device_id, current_limit, requested_limit)
    values (auth.uid(), nullif(lower(trim(coalesce(p_requester_email, ''))), ''), v_username, p_device_id, v_current_limit, p_requested_limit)
    on conflict (device_id) where status = 'Pending'
    do update set
        user_id = coalesce(excluded.user_id, public.account_limit_requests.user_id),
        requester_email = excluded.requester_email,
        username = excluded.username,
        current_limit = excluded.current_limit,
        requested_limit = excluded.requested_limit,
        created_at = now()
    returning id into v_request_id;
    return v_request_id;
end;
$$;

create or replace function public.admin_set_device_limit(
    p_device_id text,
    p_max_accounts integer,
    p_request_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
    v_request public.account_limit_requests%rowtype;
begin
    if not public.is_flash_admin() then raise exception 'ADMIN_REQUIRED'; end if;
    if p_device_id is null or p_device_id !~ '^[A-Za-z0-9_-]{4,80}$' then raise exception 'INVALID_DEVICE_ID'; end if;
    if p_max_accounts is null or p_max_accounts < 1 then raise exception 'INVALID_LIMIT'; end if;
    perform pg_advisory_xact_lock(hashtext(p_device_id));
    if p_request_id is not null then
        select * into v_request from public.account_limit_requests where id = p_request_id for update;
        if not found or v_request.device_id <> p_device_id or v_request.status <> 'Pending' then
            raise exception 'LIMIT_REQUEST_NOT_PENDING';
        end if;
    end if;
    insert into public.device_limits(device_id, max_accounts, updated_by, updated_at)
    values (p_device_id, p_max_accounts, auth.uid(), now())
    on conflict (device_id) do update set max_accounts = excluded.max_accounts, updated_by = excluded.updated_by, updated_at = now();
    if p_request_id is not null then
        update public.account_limit_requests
        set status = 'Approved', handled_by = auth.uid(), handled_at = now()
        where id = p_request_id;
    end if;
end;
$$;

create or replace function public.admin_set_account_status(p_user_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
    if not public.is_flash_admin() then raise exception 'ADMIN_REQUIRED'; end if;
    if p_status not in ('approved', 'rejected') then raise exception 'INVALID_ACCOUNT_STATUS'; end if;
    update public.profiles set status = p_status where id = p_user_id;
    if not found then raise exception 'ACCOUNT_NOT_FOUND'; end if;
end;
$$;

create or replace function public.handle_new_flash_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
    v_username text;
    v_account_name text;
    v_device_id text;
    v_limit integer;
    v_count integer;
    v_follow_view boolean;
    v_follower_view boolean;
begin
    v_username := lower(regexp_replace(trim(coalesce(new.raw_user_meta_data->>'username', '')), '^@+', ''));
    v_account_name := left(coalesce(nullif(trim(new.raw_user_meta_data->>'account_name'), ''), v_username), 60);
    v_device_id := trim(coalesce(new.raw_user_meta_data->>'device_id', ''));
    v_follow_view := lower(coalesce(new.raw_user_meta_data->>'follow_view', 'true')) <> 'false';
    v_follower_view := lower(coalesce(new.raw_user_meta_data->>'follower_view', 'true')) <> 'false';
    if v_username !~ '^[a-z0-9_.-]{1,30}$' then raise exception 'INVALID_USERNAME'; end if;
    if v_device_id !~ '^[A-Za-z0-9_-]{4,80}$' then raise exception 'INVALID_DEVICE_ID'; end if;
    perform pg_advisory_xact_lock(hashtext(v_device_id));
    select dl.max_accounts into v_limit from public.device_limits dl where dl.device_id = v_device_id;
    select count(*)::integer into v_count from public.device_accounts da where da.device_id = v_device_id;
    if coalesce(v_count, 0) >= coalesce(v_limit, 2) then raise exception 'DEVICE_LIMIT_REACHED'; end if;
    insert into public.profiles(id, username, account_name, status, role, follow_view, follower_view)
    values (new.id, v_username, v_account_name, 'pending', 'user', v_follow_view, v_follower_view);
    insert into public.device_accounts(device_id, user_id) values (v_device_id, new.id);
    return new;
end;
$$;

drop trigger if exists on_auth_user_created_flash_movie on auth.users;
create trigger on_auth_user_created_flash_movie
after insert on auth.users
for each row execute function public.handle_new_flash_auth_user();

alter table public.profiles enable row level security;
alter table public.device_accounts enable row level security;
alter table public.device_limits enable row level security;
alter table public.account_limit_requests enable row level security;

revoke all on public.profiles, public.device_accounts, public.device_limits, public.account_limit_requests from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (account_name, avatar_url, follow_view, follower_view) on public.profiles to authenticated;
grant select on public.device_accounts, public.device_limits, public.account_limit_requests to authenticated;

drop policy if exists profiles_authenticated_read on public.profiles;
create policy profiles_authenticated_read on public.profiles
for select to authenticated using (auth.uid() is not null);
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists device_accounts_admin_read on public.device_accounts;
create policy device_accounts_admin_read on public.device_accounts
for select to authenticated using (public.is_flash_admin());
drop policy if exists device_limits_admin_read on public.device_limits;
create policy device_limits_admin_read on public.device_limits
for select to authenticated using (public.is_flash_admin());
drop policy if exists account_limit_requests_read on public.account_limit_requests;
create policy account_limit_requests_read on public.account_limit_requests
for select to authenticated using (user_id = auth.uid() or public.is_flash_admin());

revoke all on function public.is_flash_admin() from public, anon;
grant execute on function public.is_flash_admin() to authenticated;
revoke all on function public.auth_migration_ready() from public;
grant execute on function public.auth_migration_ready() to anon, authenticated;
revoke all on function public.get_device_usage(text) from public;
grant execute on function public.get_device_usage(text) to anon, authenticated;
revoke all on function public.link_my_device(text) from public, anon;
grant execute on function public.link_my_device(text) to authenticated;
revoke all on function public.request_device_limit(text, text, integer, text) from public;
grant execute on function public.request_device_limit(text, text, integer, text) to anon, authenticated;
revoke all on function public.admin_set_device_limit(text, integer, uuid) from public, anon;
grant execute on function public.admin_set_device_limit(text, integer, uuid) to authenticated;
revoke all on function public.admin_set_account_status(uuid, text) from public, anon;
grant execute on function public.admin_set_account_status(uuid, text) to authenticated;
revoke all on function public.handle_new_flash_auth_user() from public, anon, authenticated;

commit;
