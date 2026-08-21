-- FulfillOS security hardening.
-- Additive/data-preserving: narrows anonymous privileges and strengthens
-- organization-scoped Proof of Work object policies.

-- This function already uses qualified application/auth relations. An empty
-- search_path prevents object-shadowing attacks against SECURITY DEFINER code.
alter function public.accept_team_invitation(text) set search_path = '';

-- Supabase grants EXECUTE to PUBLIC for new functions by default. Preserve the
-- authenticated application behavior while removing anonymous invocation of
-- every privileged application function currently installed in public.
do $$
declare
  privileged_function record;
begin
  for privileged_function in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace namespace on namespace.oid = p.pronamespace
    where namespace.nspname = 'public'
      and p.prosecdef
  loop
    execute format(
      'revoke all on function %s from public, anon',
      privileged_function.signature
    );
    execute format(
      'grant execute on function %s to authenticated',
      privileged_function.signature
    );
  end loop;
end
$$;

-- Trigger functions are invoked by PostgreSQL, never as client RPCs.
revoke all on function public.capture_audit_event() from authenticated;
revoke all on function public.handle_new_user() from authenticated;

-- RLS already denies anonymous rows. Removing the table/view grants as well
-- provides defense in depth if a future policy is accidentally broadened.
revoke all on table public.team_profiles from anon;
revoke all on table public.organization_invitations from anon;
revoke all on table public.team_directory from anon;

-- An upload path must now be organization/event/file and the event must belong
-- to the uploader's active organization. Comparing UUIDs as text avoids casts
-- that could turn a malformed client path into a database exception.
drop policy if exists "Operations upload organization proof files"
  on storage.objects;

create policy "Operations upload organization proof files"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'proof-of-work'
    and exists (
      select 1
      from public.organization_members membership
      join public.operational_events event
        on event.organization_id = membership.organization_id
       and event.id::text = (storage.foldername(name))[2]
      where membership.user_id = auth.uid()
        and membership.status = 'active'
        and membership.role in ('owner', 'admin', 'manager', 'operator')
        and membership.organization_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "Uploader removes unlinked proof files"
  on storage.objects;

create policy "Uploader removes unlinked proof files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'proof-of-work'
    and owner_id = auth.uid()::text
    and exists (
      select 1
      from public.organization_members membership
      where membership.user_id = auth.uid()
        and membership.status = 'active'
        and membership.organization_id::text = (storage.foldername(name))[1]
    )
    and not exists (
      select 1
      from public.proof_of_work_evidence evidence
      where evidence.storage_bucket = bucket_id
        and evidence.storage_path = name
    )
  );
