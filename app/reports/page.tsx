import { MetricCard, ModuleHeading, ModuleShell } from "@/components/module-shell";
import { getWorkspaceContext } from "@/lib/workspace";

export default async function ReportsPage() {
  const { supabase, organization, membership, email } = await getWorkspaceContext();
  const [customers, products, warehouses, shipments] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("organization_id", organization.id).eq("status", "active"),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("organization_id", organization.id).eq("status", "active"),
    supabase.from("warehouses").select("id", { count: "exact", head: true }).eq("organization_id", organization.id).eq("is_active", true),
    supabase.from("inbound_shipments").select("id, status").eq("organization_id", organization.id).is("deleted_at", null),
  ]);
  const error = customers.error ?? products.error ?? warehouses.error ?? shipments.error;
  if (error) throw new Error(error.message);
  const shipmentList = shipments.data ?? [];
  const completed = shipmentList.filter((shipment) => shipment.status === "completed").length;
  const open = shipmentList.length - completed;

  return (
    <ModuleShell organizationName={organization.name} email={email} role={membership.role}>
      <ModuleHeading eyebrow="Operational intelligence" title="Reports" description="A concise health view of your customers, catalog, facilities, and receiving flow." />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Active customers" value={String(customers.count ?? 0)} detail="Organizations being served" /><MetricCard label="Active products" value={String(products.count ?? 0)} detail="SKUs in the catalog" /><MetricCard label="Warehouses" value={String(warehouses.count ?? 0)} detail="Active facilities" /><MetricCard label="Inbound completion" value={shipmentList.length ? `${Math.round((completed / shipmentList.length) * 100)}%` : "—"} detail={`${completed} completed · ${open} open`} /></div>
      <section className="mt-8 grid gap-6 lg:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-extrabold text-[#162033]">Operational coverage</h2><div className="mt-6 space-y-5">{[["Customer setup", customers.count ?? 0], ["Product catalog", products.count ?? 0], ["Warehouse network", warehouses.count ?? 0], ["Inbound history", shipmentList.length]].map(([label, value]) => <div key={String(label)}><div className="flex justify-between text-sm"><span className="font-semibold text-slate-600">{label}</span><span className="font-black text-[#162033]">{value}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#f59e0b]" style={{ width: Number(value) > 0 ? "100%" : "0%" }} /></div></div>)}</div></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><h2 className="text-lg font-extrabold text-[#162033]">Revenue protection readiness</h2><p className="mt-3 text-sm leading-6 text-slate-700">Receiving quantities and audit events are already captured. Prep, storage, outbound, and exception events will extend this report into a complete billable-activity reconciliation.</p><div className="mt-5 rounded-xl bg-white/80 p-4 text-sm font-semibold text-amber-900">Current focus: never let completed operational work disappear before billing.</div></div></section>
    </ModuleShell>
  );
}
