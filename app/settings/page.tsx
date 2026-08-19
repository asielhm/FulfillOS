import { ModuleHeading, ModuleShell } from "@/components/module-shell";
import { getWorkspaceContext } from "@/lib/workspace";

type SettingsPageProps = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const { organization, membership, email, locale } = await getWorkspaceContext();
  const es = locale === "es";
  const parameters = await searchParams;
  const canManage = ["owner", "admin"].includes(membership.role);

  return (
    <ModuleShell organizationName={organization.name} email={email} role={membership.role}>
      <ModuleHeading eyebrow={es ? "Administración del workspace" : "Workspace administration"} title={es ? "Configuración" : "Settings"} description={es ? "Administra la identidad y el contexto operativo utilizado en FulfillOS." : "Manage the identity and operating context used across FulfillOS."} />
      {parameters.saved ? <div className="mt-7 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-[#067d62]">Workspace settings saved.</div> : null}
      {parameters.error ? <div className="mt-7 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{parameters.error}</div> : null}
      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <form action="/api/settings" method="post" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-extrabold text-[#162033]">Workspace profile</h2><p className="mt-1 text-sm text-slate-500">This name appears in navigation and operational records.</p>
          <label htmlFor="organizationName" className="mt-7 block text-sm font-bold text-[#162033]">Company name</label><input id="organizationName" name="organizationName" defaultValue={organization.name} minLength={2} maxLength={120} disabled={!canManage} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#f59e0b] disabled:bg-slate-100" />
          <label htmlFor="slug" className="mt-5 block text-sm font-bold text-[#162033]">Workspace slug</label><input id="slug" value={organization.slug} readOnly className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-500" />
          {canManage ? <button type="submit" className="mt-6 rounded-xl bg-[#f59e0b] px-5 py-3 font-bold text-[#162033] hover:bg-[#fdba2d]">Save settings</button> : <p className="mt-6 text-sm text-slate-500">Only owners and admins can update workspace settings.</p>}
        </form>
        <aside className="rounded-2xl bg-[#162033] p-6 text-white"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#fdba2d]">Your access</p><dl className="mt-6 space-y-5"><div><dt className="text-xs uppercase text-slate-400">Email</dt><dd className="mt-1 break-all font-semibold">{email}</dd></div><div><dt className="text-xs uppercase text-slate-400">Role</dt><dd className="mt-1 font-semibold capitalize">{membership.role}</dd></div><div><dt className="text-xs uppercase text-slate-400">Organization ID</dt><dd className="mt-1 break-all font-mono text-xs text-slate-300">{organization.id}</dd></div></dl></aside>
      </div>
    </ModuleShell>
  );
}
