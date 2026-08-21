-- Allow the current floor-worker role to attach Proof of Work evidence.
-- The original foundation used the legacy `employee` role. FulfillOS now uses
-- `operator`, while retaining employee compatibility for existing memberships.

drop policy if exists "Operations can create proof of work"
  on public.proof_of_work_evidence;

create policy "Operations can create proof of work"
  on public.proof_of_work_evidence
  for insert
  to authenticated
  with check (
    public.has_organization_role(
      organization_id,
      array['owner', 'admin', 'manager', 'operator', 'employee']
    )
    and (captured_by is null or captured_by = auth.uid())
    and exists (
      select 1
      from public.operational_events event
      where event.id = proof_of_work_evidence.operational_event_id
        and event.organization_id = proof_of_work_evidence.organization_id
    )
  );
