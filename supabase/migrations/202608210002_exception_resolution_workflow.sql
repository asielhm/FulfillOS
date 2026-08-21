-- Actionable, auditable exception resolution workflow.
-- Existing exceptions and RLS remain intact; changes are additive.

alter table public.exception_cases
  add column if not exists resolution_reason text,
  add column if not exists review_started_at timestamptz,
  add column if not exists review_started_by uuid references auth.users(id) on delete set null;

create table if not exists public.exception_case_activity (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  exception_case_id uuid not null references public.exception_cases(id) on delete cascade,
  action text not null check (action in (
    'review_started',
    'assigned',
    'resolved',
    'dismissed',
    'reopened',
    'note_added'
  )),
  note text,
  actor_user_id uuid not null references auth.users(id),
  metadata jsonb not null default '{}'::jsonb,
  happened_at timestamptz not null default now()
);

create index if not exists exception_case_activity_case_time_idx
  on public.exception_case_activity (exception_case_id, happened_at desc);

create index if not exists exception_case_activity_org_time_idx
  on public.exception_case_activity (organization_id, happened_at desc);

alter table public.exception_case_activity enable row level security;

drop policy if exists "Members view exception activity"
  on public.exception_case_activity;

create policy "Members view exception activity"
  on public.exception_case_activity
  for select
  to authenticated
  using (public.is_organization_member(organization_id));

revoke select, insert, update, delete on table public.exception_case_activity
  from public, anon, authenticated;
grant select on table public.exception_case_activity to authenticated;

-- Keep the older employee role working while recognizing the current operator
-- role used by Team and Floor Mode.
drop policy if exists "Operations can create exceptions"
  on public.exception_cases;

create policy "Operations can create exceptions"
  on public.exception_cases
  for insert
  to authenticated
  with check (
    public.has_organization_role(
      organization_id,
      array['owner', 'admin', 'manager', 'operator', 'employee']::text[]
    )
  );

create or replace function public.update_exception_case(
  p_exception_id uuid,
  p_action text,
  p_note text default null,
  p_assigned_to uuid default null
)
returns public.exception_cases
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := auth.uid();
  current_role text;
  current_case public.exception_cases%rowtype;
  updated_case public.exception_cases%rowtype;
  normalized_action text := lower(trim(coalesce(p_action, '')));
  normalized_note text := nullif(trim(coalesce(p_note, '')), '');
  target_user_id uuid;
  activity_action text;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if normalized_action not in (
    'start_review',
    'assign',
    'resolve',
    'dismiss',
    'reopen',
    'add_note'
  ) then
    raise exception 'Unsupported exception action.';
  end if;

  if normalized_note is not null and char_length(normalized_note) > 2000 then
    raise exception 'Exception notes cannot exceed 2000 characters.';
  end if;

  select exception_case.*
    into current_case
  from public.exception_cases exception_case
  join public.organization_members membership
    on membership.organization_id = exception_case.organization_id
   and membership.user_id = current_user_id
   and membership.status = 'active'
  where exception_case.id = p_exception_id
  for update of exception_case;

  if not found then
    raise exception 'Exception was not found or is not accessible.';
  end if;

  select membership.role
    into current_role
  from public.organization_members membership
  where membership.organization_id = current_case.organization_id
    and membership.user_id = current_user_id
    and membership.status = 'active';

  if current_role not in ('owner', 'admin', 'manager', 'operator', 'employee') then
    raise exception 'Your role cannot update operational exceptions.';
  end if;

  if normalized_action in ('assign', 'resolve', 'dismiss', 'reopen')
     and current_role not in ('owner', 'admin', 'manager') then
    raise exception 'Manager access is required for this action.';
  end if;

  if normalized_action in ('resolve', 'dismiss')
     and (normalized_note is null or char_length(normalized_note) < 3) then
    raise exception 'A resolution reason is required.';
  end if;

  if normalized_action = 'start_review' then
    if current_case.status in ('resolved', 'dismissed') then
      raise exception 'Closed exceptions must be reopened by a manager.';
    end if;

    update public.exception_cases
       set status = 'reviewing',
           assigned_to = coalesce(assigned_to, current_user_id),
           review_started_at = coalesce(review_started_at, now()),
           review_started_by = coalesce(review_started_by, current_user_id),
           updated_at = now()
     where id = current_case.id
     returning * into updated_case;

    activity_action := 'review_started';

  elsif normalized_action = 'assign' then
    if current_case.status in ('resolved', 'dismissed') then
      raise exception 'A closed exception cannot be assigned.';
    end if;

    target_user_id := coalesce(p_assigned_to, current_user_id);

    if not exists (
      select 1
      from public.organization_members membership
      where membership.organization_id = current_case.organization_id
        and membership.user_id = target_user_id
        and membership.status = 'active'
    ) then
      raise exception 'Assignee must be an active member of this organization.';
    end if;

    update public.exception_cases
       set assigned_to = target_user_id,
           status = case when status = 'open' then 'reviewing' else status end,
           review_started_at = coalesce(review_started_at, now()),
           review_started_by = coalesce(review_started_by, current_user_id),
           updated_at = now()
     where id = current_case.id
     returning * into updated_case;

    activity_action := 'assigned';

  elsif normalized_action = 'resolve' then
    if current_case.status <> 'reviewing' then
      raise exception 'Start a review before resolving this exception.';
    end if;

    update public.exception_cases
       set status = 'resolved',
           resolution_reason = normalized_note,
           resolved_by = current_user_id,
           resolved_at = now(),
           updated_at = now()
     where id = current_case.id
     returning * into updated_case;

    activity_action := 'resolved';

  elsif normalized_action = 'dismiss' then
    if current_case.status <> 'reviewing' then
      raise exception 'Start a review before dismissing this exception.';
    end if;

    update public.exception_cases
       set status = 'dismissed',
           resolution_reason = normalized_note,
           resolved_by = current_user_id,
           resolved_at = now(),
           updated_at = now()
     where id = current_case.id
     returning * into updated_case;

    activity_action := 'dismissed';

  elsif normalized_action = 'reopen' then
    if current_case.status not in ('resolved', 'dismissed') then
      raise exception 'Only closed exceptions can be reopened.';
    end if;

    update public.exception_cases
       set status = 'reviewing',
           resolution_reason = null,
           resolved_by = null,
           resolved_at = null,
           assigned_to = coalesce(assigned_to, current_user_id),
           review_started_at = now(),
           review_started_by = current_user_id,
           updated_at = now()
     where id = current_case.id
     returning * into updated_case;

    activity_action := 'reopened';

  else
    if normalized_note is null or char_length(normalized_note) < 2 then
      raise exception 'Add a note before saving.';
    end if;

    updated_case := current_case;
    activity_action := 'note_added';
  end if;

  insert into public.exception_case_activity (
    organization_id,
    exception_case_id,
    action,
    note,
    actor_user_id,
    metadata
  ) values (
    current_case.organization_id,
    current_case.id,
    activity_action,
    normalized_note,
    current_user_id,
    jsonb_build_object(
      'previous_status', current_case.status,
      'new_status', updated_case.status,
      'assigned_to', updated_case.assigned_to
    )
  );

  return updated_case;
end
$function$;

revoke all on function public.update_exception_case(uuid, text, text, uuid)
  from public, anon;
grant execute on function public.update_exception_case(uuid, text, text, uuid)
  to authenticated;
