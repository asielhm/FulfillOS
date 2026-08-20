-- Organization-scoped Proof of Work photo storage.
-- Additive only: operational history and existing storage objects are preserved.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'proof-of-work',
  'proof-of-work',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Members read organization proof files'
  ) then
    create policy "Members read organization proof files"
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'proof-of-work'
        and exists (
          select 1
          from public.organization_members membership
          where membership.user_id = auth.uid()
            and membership.status = 'active'
            and membership.organization_id::text = (storage.foldername(name))[1]
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Operations upload organization proof files'
  ) then
    create policy "Operations upload organization proof files"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'proof-of-work'
        and exists (
          select 1
          from public.organization_members membership
          where membership.user_id = auth.uid()
            and membership.status = 'active'
            and membership.role in ('owner', 'admin', 'manager', 'operator')
            and membership.organization_id::text = (storage.foldername(name))[1]
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Uploader removes unlinked proof files'
  ) then
    create policy "Uploader removes unlinked proof files"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'proof-of-work'
        and owner_id = auth.uid()::text
        and not exists (
          select 1
          from public.proof_of_work_evidence evidence
          where evidence.storage_bucket = bucket_id
            and evidence.storage_path = name
        )
      );
  end if;
end
$$;
