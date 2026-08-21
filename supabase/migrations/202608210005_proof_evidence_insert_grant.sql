-- Restore the minimum table privilege required to append Proof of Work.
-- RLS continues to enforce organization, operational-event, role, and actor
-- ownership checks through the "Operations can create proof of work" policy.

revoke insert, update, delete
  on table public.proof_of_work_evidence
  from public, anon;

revoke update, delete
  on table public.proof_of_work_evidence
  from authenticated;

grant insert
  on table public.proof_of_work_evidence
  to authenticated;

