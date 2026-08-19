-- FulfillOS team directory and secure organization invitations.
-- Additive only: existing memberships and operational history are preserved.

create extension if not exists pgcrypto;

create table if not exists public.team_profiles (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 100),
  email text,
  job_title text,
  employee_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id),
  unique (organization_id, employee_code)
);

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  display_name text not null check (char_length(display_name) between 2 and 100),
  job_title text,
  role text not null check (role in ('admin', 'manager', 'operator', 'viewer')),
  token text not null unique,
  invited_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id),
  revoked_at timestamptz
);

create unique index if not exists organization_invitations_one_pending_email
  on public.organization_invitations (organization_id, lower(email))
  where accepted_at is null and revoked_at is null;
create index if not exists organization_invitations_token_idx on public.organization_invitations(token);

alter table public.team_profiles enable row level security;
alter table public.organization_invitations enable row level security;

create policy "Organization members read team profiles" on public.team_profiles for select
using (exists (select 1 from public.organization_members m where m.organization_id = team_profiles.organization_id and m.user_id = auth.uid() and m.status = 'active'));
create policy "Admins manage team profiles" on public.team_profiles for all
using (exists (select 1 from public.organization_members m where m.organization_id = team_profiles.organization_id and m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner','admin')))
with check (exists (select 1 from public.organization_members m where m.organization_id = team_profiles.organization_id and m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner','admin')));
create policy "Admins read invitations" on public.organization_invitations for select
using (exists (select 1 from public.organization_members m where m.organization_id = organization_invitations.organization_id and m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner','admin')));
create policy "Admins create invitations" on public.organization_invitations for insert
with check (invited_by = auth.uid() and exists (select 1 from public.organization_members m where m.organization_id = organization_invitations.organization_id and m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner','admin')));
create policy "Admins update invitations" on public.organization_invitations for update
using (exists (select 1 from public.organization_members m where m.organization_id = organization_invitations.organization_id and m.user_id = auth.uid() and m.status = 'active' and m.role in ('owner','admin')));

create or replace function public.accept_team_invitation(p_token text) returns boolean
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare v_inv public.organization_invitations%rowtype; v_email text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  select * into v_inv from public.organization_invitations where token = p_token and accepted_at is null and revoked_at is null and expires_at > now() for update;
  if not found then raise exception 'Invitation is invalid or expired'; end if;
  if lower(v_inv.email) <> v_email then raise exception 'Invitation email does not match the signed-in account'; end if;
  if exists (select 1 from public.organization_members where user_id = auth.uid() and status = 'active' and organization_id <> v_inv.organization_id) then raise exception 'This account already belongs to another workspace'; end if;
  if exists (select 1 from public.organization_members where organization_id = v_inv.organization_id and user_id = auth.uid()) then
    update public.organization_members set role = v_inv.role, status = 'active'
    where organization_id = v_inv.organization_id and user_id = auth.uid();
  else
    insert into public.organization_members (organization_id, user_id, role, status)
    values (v_inv.organization_id, auth.uid(), v_inv.role, 'active');
  end if;
  insert into public.team_profiles (organization_id, user_id, display_name, email, job_title)
    values (v_inv.organization_id, auth.uid(), v_inv.display_name, v_inv.email, v_inv.job_title)
    on conflict (organization_id, user_id) do update set display_name = excluded.display_name, email = excluded.email, job_title = excluded.job_title, updated_at = now();
  update public.organization_invitations set accepted_at = now(), accepted_by = auth.uid() where id = v_inv.id;
  return true;
end; $$;
revoke all on function public.accept_team_invitation(text) from public;
grant execute on function public.accept_team_invitation(text) to authenticated;

create or replace view public.team_directory with (security_invoker = true) as
select m.organization_id, m.user_id, coalesce(p.display_name, 'Team member') as display_name,
       p.email, p.job_title, m.role, m.status, p.created_at as joined_at
from public.organization_members m
left join public.team_profiles p on p.organization_id = m.organization_id and p.user_id = m.user_id
where m.status = 'active';
grant select on public.team_directory to authenticated;

-- Backfill current users so existing owners are named in future evidence.
insert into public.team_profiles (organization_id, user_id, display_name, email)
select m.organization_id, m.user_id,
       coalesce(nullif(u.raw_user_meta_data->>'display_name',''), split_part(u.email, '@', 1), 'Team member'), u.email
from public.organization_members m join auth.users u on u.id = m.user_id
on conflict (organization_id, user_id) do nothing;
