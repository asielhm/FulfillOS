-- Flexible, versioned service-rate builder.
-- Adds a stable public-safe key so users can edit, reorder and retire pricing rules
-- without deleting historical rate versions.

alter table public.organization_service_rates
  add column if not exists rate_key text;

update public.organization_service_rates
set rate_key = 'legacy_' || substr(
  md5(
    id::text || '|' || service_code || '|' || unit || '|' || pricing_model || '|'
    || coalesce(minimum_quantity::text, '') || '|' || coalesce(maximum_quantity::text, '')
  ),
  1,
  32
)
where rate_key is null;

alter table public.organization_service_rates
  alter column rate_key set not null;

alter table public.organization_service_rates
  drop constraint if exists organization_service_rates_rate_key_check;

alter table public.organization_service_rates
  add constraint organization_service_rates_rate_key_check
  check (rate_key ~ '^[a-z][a-z0-9_]{1,79}$');

create unique index if not exists organization_service_rates_active_key_unique
  on public.organization_service_rates (organization_id, rate_key)
  where effective_to is null;

create or replace function public.configure_organization_service_rates(
  p_rates jsonb
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
  rate_item jsonb;
  normalized_rate_key text;
  normalized_service_code text;
  normalized_service_name text;
  normalized_category text;
  normalized_description text;
  normalized_unit text;
  normalized_pricing_model text;
  normalized_currency text;
  normalized_price numeric;
  normalized_minimum numeric;
  normalized_maximum numeric;
  normalized_featured boolean;
  incoming_keys text[] := '{}'::text[];
  existing_rate public.organization_service_rates%rowtype;
  saved_count integer := 0;
  unchanged_count integer := 0;
  archived_count integer := 0;
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

  if p_rates is null or jsonb_typeof(p_rates) <> 'array'
     or jsonb_array_length(p_rates) < 1 or jsonb_array_length(p_rates) > 100 then
    raise exception 'Rates must be a JSON array containing between 1 and 100 items.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_rates) item
    group by lower(trim(coalesce(item ->> 'rate_key', '')))
    having count(*) > 1
  ) then
    raise exception 'Every pricing rule must have a unique key.';
  end if;

  for rate_item in select value from jsonb_array_elements(p_rates)
  loop
    normalized_rate_key := lower(trim(coalesce(rate_item ->> 'rate_key', '')));
    normalized_service_code := lower(trim(coalesce(rate_item ->> 'service_code', '')));
    normalized_service_name := trim(coalesce(rate_item ->> 'service_name', ''));
    normalized_category := lower(trim(coalesce(rate_item ->> 'category', '')));
    normalized_description := nullif(trim(coalesce(rate_item ->> 'description', '')), '');
    normalized_unit := lower(trim(coalesce(rate_item ->> 'unit', '')));
    normalized_pricing_model := lower(trim(coalesce(rate_item ->> 'pricing_model', 'flat')));
    normalized_currency := upper(trim(coalesce(rate_item ->> 'currency_code', 'USD')));
    normalized_featured := coalesce((rate_item ->> 'is_featured')::boolean, false);

    begin
      normalized_price := (rate_item ->> 'unit_price')::numeric;
      normalized_minimum := nullif(rate_item ->> 'minimum_quantity', '')::numeric;
      normalized_maximum := nullif(rate_item ->> 'maximum_quantity', '')::numeric;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'A service rate contains an invalid numeric value.';
    end;

    if normalized_rate_key !~ '^[a-z][a-z0-9_]{1,79}$' then
      raise exception 'Rate key is invalid.';
    end if;
    if normalized_service_code !~ '^[a-z][a-z0-9_]{1,79}$' then
      raise exception 'Service code is invalid.';
    end if;
    if char_length(normalized_service_name) < 2 or char_length(normalized_service_name) > 120 then
      raise exception 'Service name is invalid.';
    end if;
    if normalized_category !~ '^[a-z][a-z0-9_]{1,79}$' then
      raise exception 'Service category is invalid.';
    end if;
    if normalized_unit !~ '^[a-z][a-z0-9_]{0,39}$' then
      raise exception 'Billing unit is invalid.';
    end if;
    if normalized_pricing_model not in ('flat', 'volume_tier', 'monthly_base') then
      raise exception 'Pricing model is invalid.';
    end if;
    if normalized_price is null or normalized_price < 0 or normalized_price > 1000000 then
      raise exception 'Unit price must be between 0 and 1000000.';
    end if;
    if normalized_currency !~ '^[A-Z]{3}$' then
      raise exception 'Currency code is invalid.';
    end if;
    if normalized_minimum is not null and normalized_minimum < 0 then
      raise exception 'Minimum quantity cannot be negative.';
    end if;
    if normalized_maximum is not null and normalized_maximum < 0 then
      raise exception 'Maximum quantity cannot be negative.';
    end if;
    if normalized_minimum is not null and normalized_maximum is not null
       and normalized_maximum < normalized_minimum then
      raise exception 'Maximum quantity cannot be below minimum quantity.';
    end if;

    incoming_keys := array_append(incoming_keys, normalized_rate_key);

    select rate.*
      into existing_rate
    from public.organization_service_rates rate
    where rate.organization_id = current_organization_id
      and rate.rate_key = normalized_rate_key
      and rate.effective_to is null
    order by rate.effective_from desc
    limit 1
    for update;

    if existing_rate.id is not null
       and existing_rate.service_code = normalized_service_code
       and existing_rate.service_name = normalized_service_name
       and existing_rate.category = normalized_category
       and existing_rate.description is not distinct from normalized_description
       and existing_rate.unit = normalized_unit
       and existing_rate.pricing_model = normalized_pricing_model
       and existing_rate.unit_price = normalized_price
       and existing_rate.currency_code = normalized_currency
       and existing_rate.minimum_quantity is not distinct from normalized_minimum
       and existing_rate.maximum_quantity is not distinct from normalized_maximum
       and existing_rate.is_featured = normalized_featured then
      unchanged_count := unchanged_count + 1;
    else
      if existing_rate.id is not null then
        update public.organization_service_rates
           set effective_to = now(),
               updated_at = now()
         where id = existing_rate.id;
      end if;

      insert into public.organization_service_rates (
        organization_id,
        rate_key,
        service_code,
        service_name,
        category,
        description,
        unit,
        pricing_model,
        unit_price,
        currency_code,
        minimum_quantity,
        maximum_quantity,
        is_featured,
        created_by
      ) values (
        current_organization_id,
        normalized_rate_key,
        normalized_service_code,
        normalized_service_name,
        normalized_category,
        normalized_description,
        normalized_unit,
        normalized_pricing_model,
        normalized_price,
        normalized_currency,
        normalized_minimum,
        normalized_maximum,
        normalized_featured,
        current_user_id
      );

      saved_count := saved_count + 1;
    end if;
  end loop;

  with archived as (
    update public.organization_service_rates rate
       set effective_to = now(),
           updated_at = now()
     where rate.organization_id = current_organization_id
       and rate.effective_to is null
       and not (rate.rate_key = any(incoming_keys))
    returning rate.id
  )
  select count(*)::integer into archived_count from archived;

  insert into public.audit_events (
    organization_id,
    actor_user_id,
    actor_type,
    action,
    entity_type,
    entity_id,
    new_data,
    changed_fields,
    reason,
    metadata
  ) values (
    current_organization_id,
    current_user_id,
    'user',
    'updated',
    'organization_service_rate_catalog',
    current_organization_id,
    p_rates,
    array['service_rates']::text[],
    'Organization service rate catalog configured.',
    jsonb_build_object(
      'saved_count', saved_count,
      'unchanged_count', unchanged_count,
      'archived_count', archived_count
    )
  );

  return jsonb_build_object(
    'saved_count', saved_count,
    'unchanged_count', unchanged_count,
    'archived_count', archived_count,
    'total_count', jsonb_array_length(p_rates)
  );
end
$function$;
