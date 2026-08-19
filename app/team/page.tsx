import { ModuleHeading, ModuleShell } from "@/components/module-shell";
import { getWorkspaceContext } from "@/lib/workspace";
import { InviteLink } from "./invite-link";

type TeamPageProps = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function TeamPage({ searchParams }: TeamPageProps) {
  const { supabase, organization, membership, email, locale } = await getWorkspaceContext();
  const es = locale === "es";
  const params = await searchParams;
  const canManage = ["owner", "admin"].includes(membership.role);
  const [{ data: members, error: membersError }, { data: invitations, error: invitationsError }] = await Promise.all([
    supabase.from("team_directory").select("user_id, display_name, email, job_title, role, status, joined_at").eq("organization_id", organization.id).order("display_name"),
    canManage ? supabase.from("organization_invitations").select("id, email, display_name, job_title, role, token, expires_at, accepted_at, revoked_at, created_at").eq("organization_id", organization.id).is("accepted_at", null).is("revoked_at", null).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
  ]);
  const setupError = membersError || invitationsError;

  return <ModuleShell organizationName={organization.name} email={email} role={membership.role}>
    <ModuleHeading eyebrow={es ? "Personas y permisos" : "People and permissions"} title={es ? "Personal" : "Team"} description={es ? "Identifica quién realiza cada tarea y controla su nivel de acceso. Esta identidad alimenta Proof of Work." : "Identify who performs every task and control their access. This identity powers Proof of Work."} />
    {params.saved ? <div className="mt-7 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Invitation created. Copy the secure link and send it to the employee.</div> : null}
    {params.error ? <div className="mt-7 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{params.error}</div> : null}
    {setupError ? <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Database setup required.</strong> Apply the new team migration in Supabase to activate staff invitations and the Proof of Work directory.</div> : null}

    <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6"><h2 className="text-xl font-extrabold text-[#162033]">{es ? "Directorio del equipo" : "Team directory"}</h2><p className="mt-1 text-sm text-slate-500">{members?.length ?? 0} active team members</p></div>
        <div className="divide-y divide-slate-100">
          {members?.map((member) => <div key={member.user_id} className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center"><div className="flex items-center gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#162033] font-black text-[#fdba2d]">{(member.display_name || member.email || "T").slice(0, 1).toUpperCase()}</div><div><p className="font-bold text-[#162033]">{member.display_name || "Team member"}</p><p className="text-sm text-slate-500">{member.email || "Email unavailable"}{member.job_title ? ` · ${member.job_title}` : ""}</p></div></div><span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold capitalize text-emerald-700">{member.role}</span></div>)}
          {!members?.length && !setupError ? <div className="p-10 text-center text-sm text-slate-500">No team members found.</div> : null}
        </div>
        {invitations && invitations.length > 0 ? <div className="border-t border-slate-200 bg-slate-50 p-6"><h3 className="font-bold text-[#162033]">Pending invitations</h3><div className="mt-4 space-y-3">{invitations.map((invite) => <div key={invite.id} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"><div><p className="font-semibold text-[#162033]">{invite.display_name || invite.email}</p><p className="text-xs text-slate-500">{invite.email} · <span className="capitalize">{invite.role}</span></p></div><InviteLink token={invite.token} email={invite.email} /></div>)}</div></div> : null}
      </section>

      <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#c7511f]">Proof of Work identity</p><h2 className="mt-2 text-xl font-extrabold text-[#162033]">Invite a team member</h2><p className="mt-2 text-sm leading-6 text-slate-500">Each employee uses an individual login. Never share floor accounts: personal identity makes evidence defensible.</p>
        {canManage && !setupError ? <form action="/api/team/invitations" method="post" className="mt-6 space-y-4">
          <label className="block text-sm font-bold text-[#162033]">Full name<input name="displayName" required minLength={2} maxLength={100} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" placeholder="Alex Morgan" /></label>
          <label className="block text-sm font-bold text-[#162033]">Work email<input name="email" required type="email" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" placeholder="alex@company.com" /></label>
          <label className="block text-sm font-bold text-[#162033]">Job title<input name="jobTitle" maxLength={100} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal" placeholder="Receiving associate" /></label>
          <label className="block text-sm font-bold text-[#162033]">Access role<select name="role" defaultValue="operator" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"><option value="operator">Operator — floor workflows</option><option value="manager">Manager — operations and exceptions</option><option value="admin">Admin — team and workspace</option><option value="viewer">Viewer — read only</option></select></label>
          <button className="w-full rounded-xl bg-[#f59e0b] px-5 py-3 font-bold text-[#162033] hover:bg-[#fdba2d]">Create secure invitation</button>
        </form> : <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Only owners and admins can invite or manage personnel.</p>}
      </aside>
    </div>
  </ModuleShell>;
}
