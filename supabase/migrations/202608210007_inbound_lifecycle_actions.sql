-- Controlled inbound lifecycle operations.
-- Inventory history remains immutable and cancellation is prohibited once any
-- units have been received. Existing audit triggers capture every change.

create or replace function public.reschedule_inbound_shipment(
  p_shipment_id uuid,
  p_expected_at timestamptz,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  user_id uuid := auth.uid();
  shipment public.inbound_shipments%rowtype;
  normalized_reason text := trim(coalesce(p_reason, ''));
begin
  if user_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_expected_at is null then
    raise exception 'Choose a new expected date.';
  end if;

  if p_expected_at < date_trunc('day', now()) then
    raise exception 'The new expected date cannot be in the past.';
  end if;

  if char_length(normalized_reason) < 3 then
    raise exception 'A reschedule reason is required.';
  end if;

  select inbound.*
    into shipment
  from public.inbound_shipments inbound
  where inbound.id = p_shipment_id
  for update;

  if not found then
    raise exception 'Inbound shipment was not found.';
  end if;

  if not public.has_organization_role(
    shipment.organization_id,
    array['owner', 'admin', 'manager']::text[]
  ) then
    raise exception 'You do not have permission to reschedule this inbound shipment.';
  end if;

  if shipment.deleted_at is not null then
    raise exception 'A deleted inbound shipment cannot be rescheduled.';
  end if;

  if shipment.status not in ('draft', 'expected') then
    raise exception 'Only an expected inbound shipment can be rescheduled.';
  end if;

  perform set_config('fulfillos.audit_reason', normalized_reason, true);

  update public.inbound_shipments
     set expected_at = p_expected_at
   where id = shipment.id;

  return jsonb_build_object(
    'success', true,
    'shipment_id', shipment.id,
    'status', shipment.status,
    'expected_at', p_expected_at
  );
end
$function$;

create or replace function public.mark_inbound_arrived(
  p_shipment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  user_id uuid := auth.uid();
  shipment public.inbound_shipments%rowtype;
begin
  if user_id is null then
    raise exception 'Authentication required.';
  end if;

  select inbound.*
    into shipment
  from public.inbound_shipments inbound
  where inbound.id = p_shipment_id
  for update;

  if not found then
    raise exception 'Inbound shipment was not found.';
  end if;

  if not public.has_organization_role(
    shipment.organization_id,
    array['owner', 'admin', 'manager', 'operator', 'employee']::text[]
  ) then
    raise exception 'You do not have permission to mark this inbound shipment as arrived.';
  end if;

  if shipment.deleted_at is not null then
    raise exception 'A deleted inbound shipment cannot be marked as arrived.';
  end if;

  if shipment.status = 'cancelled' then
    raise exception 'A cancelled inbound shipment cannot be marked as arrived.';
  end if;

  if shipment.status in ('arrived', 'receiving', 'completed') then
    return jsonb_build_object(
      'success', true,
      'already_arrived', true,
      'shipment_id', shipment.id,
      'status', shipment.status
    );
  end if;

  if shipment.status <> 'expected' then
    raise exception 'Only an expected inbound shipment can be marked as arrived.';
  end if;

  perform set_config('fulfillos.audit_reason', 'Inbound physically arrived.', true);

  update public.inbound_shipments
     set status = 'arrived',
         arrived_at = coalesce(arrived_at, now())
   where id = shipment.id;

  return jsonb_build_object(
    'success', true,
    'shipment_id', shipment.id,
    'status', 'arrived'
  );
end
$function$;

-- Keep the existing protected cancellation semantics and close only stale
-- inbound exceptions. Revenue, damage, and Proof of Work cases stay open.
create or replace function public.cancel_inbound_shipment(
  p_shipment_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  user_id uuid := auth.uid();
  shipment public.inbound_shipments%rowtype;
  received_units integer;
  exception_id uuid;
  normalized_reason text := trim(coalesce(p_reason, ''));
begin
  if user_id is null then
    raise exception 'Authentication required.';
  end if;

  if char_length(normalized_reason) < 3 then
    raise exception 'A cancellation reason is required.';
  end if;

  select inbound.*
    into shipment
  from public.inbound_shipments inbound
  where inbound.id = p_shipment_id
  for update;

  if not found then
    raise exception 'Inbound shipment was not found.';
  end if;

  if not public.has_organization_role(
    shipment.organization_id,
    array['owner', 'admin', 'manager']::text[]
  ) then
    raise exception 'You do not have permission to cancel this inbound shipment.';
  end if;

  if shipment.deleted_at is not null then
    raise exception 'A deleted inbound shipment cannot be cancelled.';
  end if;

  if shipment.status = 'completed' then
    raise exception 'A completed inbound shipment cannot be cancelled.';
  end if;

  if shipment.status = 'cancelled' then
    return jsonb_build_object(
      'success', true,
      'already_cancelled', true,
      'shipment_id', shipment.id,
      'status', 'cancelled'
    );
  end if;

  select coalesce(sum(item.received_quantity), 0)
    into received_units
  from public.inbound_shipment_items item
  where item.shipment_id = shipment.id;

  if received_units > 0 then
    raise exception 'This shipment already has received inventory and cannot be cancelled directly.';
  end if;

  perform set_config('fulfillos.lifecycle_write', '1', true);
  perform set_config('fulfillos.audit_reason', normalized_reason, true);

  update public.inbound_shipments
     set status = 'cancelled',
         cancelled_at = now(),
         cancelled_by = user_id,
         cancel_reason = normalized_reason
   where id = shipment.id;

  for exception_id in
    select exception_case.id
    from public.exception_cases exception_case
    where exception_case.organization_id = shipment.organization_id
      and exception_case.status in ('open', 'reviewing')
      and exception_case.exception_type in (
        'inbound_stalled',
        'inbound_open_too_long',
        'inbound_overdue'
      )
      and (
        (
          exception_case.entity_type = 'inbound_shipment'
          and exception_case.entity_id = shipment.id
        )
        or exception_case.details ->> 'shipment_id' = shipment.id::text
      )
  loop
    perform public.update_exception_case(
      exception_id,
      'dismiss',
      'Inbound cancelled: ' || normalized_reason,
      null
    );
  end loop;

  return jsonb_build_object(
    'success', true,
    'shipment_id', shipment.id,
    'status', 'cancelled'
  );
end
$function$;

revoke all on function public.reschedule_inbound_shipment(uuid, timestamptz, text)
  from public, anon;
revoke all on function public.mark_inbound_arrived(uuid)
  from public, anon;
revoke all on function public.cancel_inbound_shipment(uuid, text)
  from public, anon;

grant execute on function public.reschedule_inbound_shipment(uuid, timestamptz, text)
  to authenticated;
grant execute on function public.mark_inbound_arrived(uuid)
  to authenticated;
grant execute on function public.cancel_inbound_shipment(uuid, text)
  to authenticated;

