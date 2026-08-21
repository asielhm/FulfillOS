import Link from "next/link";

import { MetricCard, ModuleHeading, ModuleShell } from "@/components/module-shell";
import { formatUsd } from "@/lib/revenue";
import { getWorkspaceContext } from "@/lib/workspace";

export default async function ReportsPage() {
  const { supabase, organization, membership, email, locale } = await getWorkspaceContext();
  const es = locale === "es";
  const [customers, products, warehouses, shipments, billableEvents] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("organization_id", organization.id).eq("status", "active"),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("organization_id", organization.id).eq("status", "active"),
    supabase.from("warehouses").select("id", { count: "exact", head: true }).eq("organization_id", organization.id).eq("is_active", true),
    supabase.from("inbound_shipments").select("id, status").eq("organization_id", organization.id).is("deleted_at", null),
    supabase.from("billable_events").select("billing_status, amount").eq("organization_id", organization.id).limit(5000),
  ]);
  const error = customers.error ?? products.error ?? warehouses.error ?? shipments.error ?? billableEvents.error;
  if (error) throw new Error(error.message);
  const shipmentList = shipments.data ?? [];
  const completed = shipmentList.filter((shipment) => shipment.status === "completed").length;
  const open = shipmentList.length - completed;
  const billingList = billableEvents.data ?? [];
  const unpricedWork = billingList.filter((event) => event.billing_status === "unpriced").length;
  const readyRevenue = billingList
    .filter((event) => event.billing_status === "ready")
    .reduce((total, event) => total + Number(event.amount ?? 0), 0);

  return (
    <ModuleShell organizationName={organization.name} email={email} role={membership.role}>
      <ModuleHeading eyebrow={es ? "Inteligencia operativa" : "Operational intelligence"} title={es ? "Reportes" : "Reports"} description={es ? "Una vista ejecutiva de clientes, catálogo, instalaciones y recepciones." : "A concise health view of your customers, catalog, facilities, and receiving flow."} />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label={es ? "Clientes activos" : "Active customers"} value={String(customers.count ?? 0)} detail={es ? "Organizaciones atendidas" : "Organizations being served"} /><MetricCard label={es ? "Productos activos" : "Active products"} value={String(products.count ?? 0)} detail={es ? "SKUs en el catálogo" : "SKUs in the catalog"} /><MetricCard label={es ? "Ingresos listos" : "Ready revenue"} value={formatUsd(readyRevenue, locale)} detail={es ? "Trabajo valorizado listo para facturar" : "Priced work ready for invoicing"} /><MetricCard label={es ? "Trabajo sin precio" : "Unpriced work"} value={String(unpricedWork)} detail={es ? "Eventos que requieren una tarifa" : "Events that require a customer rate"} /></div>
      <section className="mt-8 grid gap-6 lg:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-extrabold text-[#162033]">{es ? "Cobertura operativa" : "Operational coverage"}</h2><div className="mt-6 space-y-5">{[[es ? "Clientes" : "Customer setup", customers.count ?? 0], [es ? "Catálogo" : "Product catalog", products.count ?? 0], [es ? "Almacenes" : "Warehouse network", warehouses.count ?? 0], [es ? "Historial inbound" : "Inbound history", shipmentList.length]].map(([label, value]) => <div key={String(label)}><div className="flex justify-between text-sm"><span className="font-semibold text-slate-600">{label}</span><span className="font-black text-[#162033]">{value}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#f59e0b]" style={{ width: Number(value) > 0 ? "100%" : "0%" }} /></div></div>)}</div><p className="mt-5 text-sm text-slate-500">{shipmentList.length ? `${completed} ${es ? "inbound completados" : "inbound completed"} · ${open} ${es ? "abiertos" : "open"}` : es ? "Todavía no hay inbound registrados." : "No inbound shipments recorded yet."}</p></div><div className="rounded-2xl border border-violet-200 bg-violet-50 p-6"><p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Revenue Protection</p><h2 className="mt-2 text-lg font-extrabold text-[#162033]">{es ? "El trabajo realizado no debe perderse antes de facturar" : "Completed work should never disappear before billing"}</h2><p className="mt-3 text-sm leading-6 text-slate-700">{es ? `${unpricedWork} evento(s) operativo(s) esperan una tarifa aprobada. FulfillOS no inventa valores: calcula el ingreso únicamente desde tarifas configuradas por tu equipo.` : `${unpricedWork} operational event(s) are waiting for an approved customer rate. FulfillOS does not fabricate value: revenue is calculated only from rates your team configures.`}</p><Link href="/revenue-protection" className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-[#162033] px-5 font-bold text-white">{es ? "Abrir Protección de Ingresos" : "Open Revenue Protection"}</Link></div></section>
    </ModuleShell>
  );
}
