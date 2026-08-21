-- Revenue Protection: versioned customer rates and transactional pricing.
-- This migration is additive. It preserves every billable and operational event.

create table if not exists public.customer_service_rates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null,
  service_code text not null,
  service_name text not null,
  unit text not null default 'unit',
  unit_price numeric(14,4) not null,
  currency_code text not null default 'USD',
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_service_rates_customer_fkey
    foreign key (customer_id, organization_id)
    references public.customers(id, organization_id)
    on delete restrict,
  constraint customer_service_rates_service_code_check
    check (service_code ~ '^[a-z][a-z0-9_]{1,79}$'),
  constraint customer_service_rates_service_name_check
    check (char_length(trim(service_name)) between 2 and 120),
  constraint customer_service_rates_unit_check
    check (unit ~ '^[a-z][a-z0-9_]{0,39}$'),
  constraint customer_service_rates_price_check
    check (unit_price >= 0 and unit_price <= 1000000),
  constraint customer_service_rates_currency_check
    check (currency_code ~ '^[A-Z]{3}$'),
  constraint customer_service_rates_effective_range_check
    check (effective_to is null or effective_to > effective_from)
);

create unique index if not exists customer_service_rates_active_unique
  on public.customer_service_rates (
    organization_id,
    customer_id,
    service_code,
    unit
  )
  where effective_to is null;

create index if not exists customer_service_rates_org_customer_idx
  on public.customer_service_rates (
    organization_id,
    customer_id,
    effective_from desc
  );

alter table public.customer_service_rates enable row level security;

drop policy if exists "Billing roles view customer service rates"
  on public.customer_service_rates;

create policy "Billing roles view customer service rates"
  on public.customer_service_rates
  for select
  to authenticated
  using (
    public.has_organization_role(
      organization_id,
      array['owner', 'admin', 'manager', 'billing']::text[]
    )
  );

-- Rates can only be changed through the controlled, audited function below.
revoke all on table public.customer_service_rates
  from public, anon, authenticated;
grant select on table public.customer_service_rates to authenticated;

-- Keep one active Revenue Protection exception per unpriced billing event.
create unique index if not exists exception_cases_open_unpriced_event_unique
  on public.exception_cases (organization_id, entity_id, exception_type)
  where entity_type = 'billable_event'
    and status in ('open', 'reviewing');

create or replace function public.capture_unpriced_billable_exception()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.billing_status <> 'unpriced' then
    return new;
  end if;

  insert into public.exception_cases (
    organization_id,
    source_event_id,
    entity_type,
    entity_id,
    exception_type,
    severity,
    status,
    summary,
    details,
    detected_by,
    confidence
  ) values (
    new.organization_id,
    new.operational_event_id,
    'billable_event',
    new.id,
    'unpriced_billable_work',
    'medium',
    'open',
    initcap(replace(new.service_code, '_', ' ')) || ' work has no configured rate.',
    coalesce(new.metadata, '{}'::jsonb) || jsonb_build_object(
      'billable_event_id', new.id,
      'customer_id', new.customer_id,
      'product_id', new.product_id,
      'service_code', new.service_code,
      'quantity', new.quantity,
      'unit', new.unit,
      'currency_code', new.currency_code
    ),
    'rule',
    1
  )
  on conflict (organization_id, entity_id, exception_type)
    where entity_type = 'billable_event'
      and status in ('open', 'reviewing')
    do nothing;

  return new;
end
$function$;

revoke all on function public.capture_unpriced_billable_exception()
  from public, anon, authenticated;

drop trigger if exists billable_events_capture_unpriced_exception
  on public.billable_events;

create trigger billable_events_capture_unpriced_exception
after insert or update of billing_status, unit_price
on public.billable_events
for each row
execute function public.capture_unpriced_billable_exception();

-- Backfill any unpriced work created before the trigger existed.
insert into public.exception_cases (
  organization_id,
  source_event_id,
  entity_type,
  entity_id,
  exception_type,
  severity,
  status,
  summary,
  details,
  detected_by,
  confidence
)
select
  event.organization_id,
  event.operational_event_id,
  'billable_event',
  event.id,
  'unpriced_billable_work',
  'medium',
  'open',
  initcap(replace(event.service_code, '_', ' ')) || ' work has no configured rate.',
  coalesce(event.metadata, '{}'::jsonb) || jsonb_build_object(
    'billable_event_id', event.id,
    'customer_id', event.customer_id,
    'product_id', event.product_id,
    'service_code', event.service_code,
    'quantity', event.quantity,
    'unit', event.unit,
    'currency_code', event.currency_code
  ),
  'rule',
  1
from public.billable_events event
where event.billing_status = 'unpriced'
on conflict (organization_id, entity_id, exception_type)
  where entity_type = 'billable_event'
    and status in ('open', 'reviewing')
  do nothing;

create or replace function public.configure_customer_service_rate(
  p_customer_id uuid,
  p_service_code text,
  p_unit text,
  p_unit_price numeric,
  p_currency_code text default 'USD'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := auth.uid();
  current_organization_id uuid;
  current_role text;
  normalized_service_code text := lower(trim(coalesce(p_service_code, '')));
  normalized_unit text := lower(trim(coalesce(p_unit, '')));
  normalized_currency text := upper(trim(coalesce(p_currency_code, 'USD')));
  normalized_service_name text;
  existing_rate public.customer_service_rates%rowtype;
  saved_rate public.customer_service_rates%rowtype;
  priced_event_ids uuid[] := '{}'::uuid[];
  events_priced integer := 0;
  revenue_captured numeric := 0;
  exceptions_resolved integer := 0;
  exception_record record;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select membership.organization_id, membership.role
    into current_organization_id, current_role
  from public.organization_members membership
  where membership.user_id = current_user_id
    and membership.status = 'active'
  limit 1;

  if current_organization_id is null then
    raise exception 'An active organization membership is required.';
  end if;

  if current_role not in ('owner', 'admin', 'manager', 'billing') then
    raise exception 'Billing access is required.';
  end if;

  if normalized_service_code !~ '^[a-z][a-z0-9_]{1,79}$' then
    raise exception 'Service code is invalid.';
  end if;

  if normalized_unit !~ '^[a-z][a-z0-9_]{0,39}$' then
    raise exception 'Billing unit is invalid.';
  end if;

  if p_unit_price is null or p_unit_price < 0 or p_unit_price > 1000000 then
    raise exception 'Unit price must be between 0 and 1000000.';
  end if;

  if normalized_currency !~ '^[A-Z]{3}$' then
    raise exception 'Currency code is invalid.';
  end if;

  if not exists (
    select 1
    from public.customers customer
    where customer.id = p_customer_id
      and customer.organization_id = current_organization_id
      and customer.status <> 'inactive'
  ) then
    raise exception 'Customer was not found or is inactive.';
  end if;

  normalized_service_name := initcap(replace(normalized_service_code, '_', ' '));

  select rate.*
    into existing_rate
  from public.customer_service_rates rate
  where rate.organization_id = current_organization_id
    and rate.customer_id = p_customer_id
    and rate.service_code = normalized_service_code
    and rate.unit = normalized_unit
    and rate.effective_to is null
  order by rate.effective_from desc
  limit 1
  for update;

  if existing_rate.id is not null
     and existing_rate.unit_price = p_unit_price
     and existing_rate.currency_code = normalized_currency then
    saved_rate := existing_rate;
  else
    if existing_rate.id is not null then
      update public.customer_service_rates
         set effective_to = now(),
             updated_at = now()
       where id = existing_rate.id;
    end if;

    insert into public.customer_service_rates (
      organization_id,
      customer_id,
      service_code,
      service_name,
      unit,
      unit_price,
      currency_code,
      created_by
    ) values (
      current_organization_id,
      p_customer_id,
      normalized_service_code,
      normalized_service_name,
      normalized_unit,
      p_unit_price,
      normalized_currency,
      current_user_id
    )
    returning * into saved_rate;
  end if;

  with priced as (
    update public.billable_events event
       set unit_price = saved_rate.unit_price,
           amount = round((event.quantity * saved_rate.unit_price)::numeric, 2),
           currency_code = saved_rate.currency_code,
           billing_status = 'ready',
           metadata = coalesce(event.metadata, '{}'::jsonb) || jsonb_build_object(
             'rate_id', saved_rate.id,
             'priced_by', current_user_id,
             'priced_at', now()
           ),
           updated_at = now()
     where event.organization_id = current_organization_id
       and event.customer_id = p_customer_id
       and event.service_code = normalized_service_code
       and event.unit = normalized_unit
       and event.billing_status = 'unpriced'
    returning event.id, event.amount
  )
  select
    count(*)::integer,
    coalesce(sum(priced.amount), 0),
    coalesce(array_agg(priced.id), '{}'::uuid[])
  into events_priced, revenue_captured, priced_event_ids
  from priced;

  for exception_record in
    select exception_case.id, exception_case.status
    from public.exception_cases exception_case
    where exception_case.organization_id = current_organization_id
      and exception_case.entity_type = 'billable_event'
      and exception_case.entity_id = any(priced_event_ids)
      and exception_case.exception_type = 'unpriced_billable_work'
      and exception_case.status in ('open', 'reviewing')
    for update
  loop
    update public.exception_cases
       set status = 'resolved',
           resolution_reason = 'Customer service rate configured.',
           resolved_by = current_user_id,
           resolved_at = now(),
           updated_at = now()
     where id = exception_record.id;

    insert into public.exception_case_activity (
      organization_id,
      exception_case_id,
      action,
      note,
      actor_user_id,
      metadata
    ) values (
      current_organization_id,
      exception_record.id,
      'resolved',
      'Customer service rate configured.',
      current_user_id,
      jsonb_build_object(
        'previous_status', exception_record.status,
        'new_status', 'resolved',
        'rate_id', saved_rate.id
      )
    );

    exceptions_resolved := exceptions_resolved + 1;
  end loop;

  insert into public.audit_events (
    organization_id,
    actor_user_id,
    actor_type,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data,
    changed_fields,
    reason,
    metadata
  ) values (
    current_organization_id,
    current_user_id,
    'user',
    case when existing_rate.id is null then 'created' else 'updated' end,
    'customer_service_rate',
    saved_rate.id,
    case when existing_rate.id is null then null else to_jsonb(existing_rate) end,
    to_jsonb(saved_rate),
    array['unit_price', 'currency_code', 'effective_from']::text[],
    'Configured through Revenue Protection.',
    jsonb_build_object(
      'customer_id', p_customer_id,
      'service_code', normalized_service_code,
      'unit', normalized_unit,
      'events_priced', events_priced,
      'revenue_captured', revenue_captured,
      'exceptions_resolved', exceptions_resolved
    )
  );

  return jsonb_build_object(
    'rate_id', saved_rate.id,
    'events_priced', events_priced,
    'revenue_captured', revenue_captured,
    'exceptions_resolved', exceptions_resolved,
    'currency_code', saved_rate.currency_code
  );
end
$function$;

revoke all on function public.configure_customer_service_rate(
  uuid,
  text,
  text,
  numeric,
  text
) from public, anon;

grant execute on function public.configure_customer_service_rate(
  uuid,
  text,
  text,
  numeric,
  text
) to authenticated;
