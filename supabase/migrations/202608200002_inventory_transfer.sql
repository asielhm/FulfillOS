-- Atomic, organization-scoped inventory transfers for Floor Mode.
-- Every move creates one operational event, two immutable stock movements,
-- scan evidence, and an unpriced billing candidate for Revenue Protection.

create or replace function public.move_inventory_units(
  p_warehouse_id uuid,
  p_source_scan text,
  p_product_scan text,
  p_destination_scan text,
  p_quantity integer,
  p_idempotency_key text,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_organization_id uuid;
  v_role text;
  v_source record;
  v_destination record;
  v_product record;
  v_product_matches integer;
  v_balance_before bigint;
  v_event_id uuid;
  v_existing_event_id uuid;
  v_existing_metadata jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select membership.organization_id, membership.role
    into v_organization_id, v_role
  from public.organization_members membership
  where membership.user_id = v_user_id
    and membership.status = 'active'
  limit 1;

  if v_organization_id is null then
    raise exception 'Active workspace required';
  end if;
  if v_role not in ('owner', 'admin', 'manager', 'operator') then
    raise exception 'Your role cannot move inventory';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be a positive whole number';
  end if;
  if p_idempotency_key is null or char_length(trim(p_idempotency_key)) not between 8 and 120 then
    raise exception 'A valid idempotency key is required';
  end if;
  if p_source_scan is null or trim(p_source_scan) = ''
    or p_product_scan is null or trim(p_product_scan) = ''
    or p_destination_scan is null or trim(p_destination_scan) = '' then
    raise exception 'Source, product, and destination scans are required';
  end if;
  if p_note is not null and char_length(p_note) > 500 then
    raise exception 'Note must be 500 characters or fewer';
  end if;

  select event.id, event.metadata
    into v_existing_event_id, v_existing_metadata
  from public.operational_events event
  where event.organization_id = v_organization_id
    and event.idempotency_key = trim(p_idempotency_key);

  if v_existing_event_id is not null then
    return jsonb_build_object(
      'event_id', v_existing_event_id,
      'duplicate', true,
      'quantity', coalesce((v_existing_metadata ->> 'quantity')::integer, p_quantity),
      'from_location', v_existing_metadata ->> 'from_location_code',
      'to_location', v_existing_metadata ->> 'to_location_code',
      'balance_after', (v_existing_metadata ->> 'balance_after')::bigint
    );
  end if;

  if not exists (
    select 1
    from public.warehouses warehouse
    where warehouse.id = p_warehouse_id
      and warehouse.organization_id = v_organization_id
      and warehouse.is_active = true
  ) then
    raise exception 'Active warehouse was not found';
  end if;

  select location.id, location.name, location.code, location.barcode, location.purpose
    into v_source
  from public.warehouse_locations location
  where location.organization_id = v_organization_id
    and location.warehouse_id = p_warehouse_id
    and location.is_active = true
    and (
      lower(location.code) = lower(trim(p_source_scan))
      or location.barcode = trim(p_source_scan)
    )
  limit 1;

  if v_source.id is null then
    raise exception 'Source location was not found in this warehouse';
  end if;

  select count(*)
    into v_product_matches
  from public.products product
  where product.organization_id = v_organization_id
    and product.status = 'active'
    and (
      lower(product.sku) = lower(trim(p_product_scan))
      or product.barcode = trim(p_product_scan)
      or lower(coalesce(product.asin, '')) = lower(trim(p_product_scan))
      or lower(coalesce(product.fnsku, '')) = lower(trim(p_product_scan))
    )
    and (
      select coalesce(sum(movement.quantity_delta), 0)
      from public.inventory_movements movement
      where movement.organization_id = v_organization_id
        and movement.product_id = product.id
        and movement.location_id = v_source.id
        and movement.stock_status = 'available'
    ) > 0;

  if v_product_matches = 0 then
    raise exception 'No available inventory matches that product at the source location';
  end if;
  if v_product_matches > 1 then
    raise exception 'This product code matches multiple inventory records at the source location';
  end if;

  select product.id, product.customer_id, product.sku, product.title
    into v_product
  from public.products product
  where product.organization_id = v_organization_id
    and product.status = 'active'
    and (
      lower(product.sku) = lower(trim(p_product_scan))
      or product.barcode = trim(p_product_scan)
      or lower(coalesce(product.asin, '')) = lower(trim(p_product_scan))
      or lower(coalesce(product.fnsku, '')) = lower(trim(p_product_scan))
    )
    and (
      select coalesce(sum(movement.quantity_delta), 0)
      from public.inventory_movements movement
      where movement.organization_id = v_organization_id
        and movement.product_id = product.id
        and movement.location_id = v_source.id
        and movement.stock_status = 'available'
    ) > 0
  limit 1;

  select location.id, location.name, location.code, location.barcode, location.purpose
    into v_destination
  from public.warehouse_locations location
  where location.organization_id = v_organization_id
    and location.warehouse_id = p_warehouse_id
    and location.is_active = true
    and (
      lower(location.code) = lower(trim(p_destination_scan))
      or location.barcode = trim(p_destination_scan)
    )
  limit 1;

  if v_destination.id is null then
    raise exception 'Destination location was not found in this warehouse';
  end if;
  if v_destination.id = v_source.id then
    raise exception 'Source and destination locations must be different';
  end if;
  if v_destination.purpose = 'quarantine' then
    raise exception 'Use the quarantine workflow when moving stock into quarantine';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      v_organization_id::text || ':' || v_product.id::text || ':' || v_source.id::text || ':available',
      0
    )
  );

  -- Recheck after the lock so concurrent moves cannot overspend stock.
  select event.id, event.metadata
    into v_existing_event_id, v_existing_metadata
  from public.operational_events event
  where event.organization_id = v_organization_id
    and event.idempotency_key = trim(p_idempotency_key);

  if v_existing_event_id is not null then
    return jsonb_build_object(
      'event_id', v_existing_event_id,
      'duplicate', true,
      'quantity', coalesce((v_existing_metadata ->> 'quantity')::integer, p_quantity),
      'from_location', v_existing_metadata ->> 'from_location_code',
      'to_location', v_existing_metadata ->> 'to_location_code',
      'balance_after', (v_existing_metadata ->> 'balance_after')::bigint
    );
  end if;

  select coalesce(sum(movement.quantity_delta), 0)
    into v_balance_before
  from public.inventory_movements movement
  where movement.organization_id = v_organization_id
    and movement.product_id = v_product.id
    and movement.location_id = v_source.id
    and movement.stock_status = 'available';

  if v_balance_before < p_quantity then
    raise exception 'Only % available units remain at the source location', v_balance_before;
  end if;

  insert into public.operational_events (
    organization_id,
    event_type,
    entity_type,
    entity_id,
    actor_type,
    actor_user_id,
    idempotency_key,
    metadata
  ) values (
    v_organization_id,
    'inventory_transferred',
    'products',
    v_product.id,
    'user',
    v_user_id,
    trim(p_idempotency_key),
    jsonb_build_object(
      'customer_id', v_product.customer_id,
      'warehouse_id', p_warehouse_id,
      'product_id', v_product.id,
      'sku', v_product.sku,
      'quantity', p_quantity,
      'stock_status', 'available',
      'from_location_id', v_source.id,
      'from_location_code', v_source.code,
      'to_location_id', v_destination.id,
      'to_location_code', v_destination.code,
      'balance_before', v_balance_before,
      'balance_after', v_balance_before - p_quantity,
      'note', nullif(trim(coalesce(p_note, '')), '')
    )
  ) returning id into v_event_id;

  insert into public.inventory_movements (
    organization_id,
    customer_id,
    product_id,
    warehouse_id,
    location_id,
    operational_event_id,
    movement_type,
    stock_status,
    quantity_delta,
    notes,
    created_by
  ) values
    (
      v_organization_id, v_product.customer_id, v_product.id, p_warehouse_id,
      v_source.id, v_event_id, 'transfer_out', 'available', -p_quantity,
      nullif(trim(coalesce(p_note, '')), ''), v_user_id
    ),
    (
      v_organization_id, v_product.customer_id, v_product.id, p_warehouse_id,
      v_destination.id, v_event_id, 'transfer_in', 'available', p_quantity,
      nullif(trim(coalesce(p_note, '')), ''), v_user_id
    );

  insert into public.proof_of_work_evidence (
    organization_id,
    operational_event_id,
    evidence_type,
    text_value,
    metadata,
    captured_by
  ) values
    (
      v_organization_id, v_event_id, 'barcode_scan', trim(p_source_scan),
      jsonb_build_object('step', 'source_location', 'location_id', v_source.id, 'location_code', v_source.code),
      v_user_id
    ),
    (
      v_organization_id, v_event_id, 'barcode_scan', trim(p_product_scan),
      jsonb_build_object('step', 'product', 'product_id', v_product.id, 'sku', v_product.sku),
      v_user_id
    ),
    (
      v_organization_id, v_event_id, 'barcode_scan', trim(p_destination_scan),
      jsonb_build_object('step', 'destination_location', 'location_id', v_destination.id, 'location_code', v_destination.code),
      v_user_id
    );

  insert into public.billable_events (
    organization_id,
    customer_id,
    product_id,
    operational_event_id,
    service_code,
    quantity,
    unit,
    billing_status,
    metadata
  ) values (
    v_organization_id,
    v_product.customer_id,
    v_product.id,
    v_event_id,
    'inventory_transfer',
    p_quantity,
    'unit',
    'unpriced',
    jsonb_build_object(
      'warehouse_id', p_warehouse_id,
      'from_location_id', v_source.id,
      'to_location_id', v_destination.id,
      'captured_by', v_user_id
    )
  );

  return jsonb_build_object(
    'event_id', v_event_id,
    'duplicate', false,
    'product_id', v_product.id,
    'sku', v_product.sku,
    'quantity', p_quantity,
    'from_location', v_source.code,
    'to_location', v_destination.code,
    'balance_after', v_balance_before - p_quantity,
    'billing_status', 'unpriced'
  );
end;
$$;

revoke all on function public.move_inventory_units(uuid, text, text, text, integer, text, text) from public;
grant execute on function public.move_inventory_units(uuid, text, text, text, integer, text, text) to authenticated;
