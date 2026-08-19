import Link from "next/link";

import { MetricCard, ModuleHeading, ModuleShell } from "@/components/module-shell";
import { getWorkspaceContext } from "@/lib/workspace";

export default async function OutboundPage() {
  const { supabase, organization, membership, email, locale } = await getWorkspaceContext();
  const es = locale === "es";
  const [shipmentsResult, customersResult, warehousesResult] = await Promise.all([
    supabase.from("inbound_shipments").select("id, customer_id, warehouse_id, inbound_number, status, completed_at").eq("organization_id", organization.id).is("deleted_at", null).order("completed_at", { ascending: false }),
    supabase.from("customers").select("id, company_name").eq("organization_id", organization.id),
    supabase.from("warehouses").select("id, name").eq("organization_id", organization.id),
  ]);
  const error = shipmentsResult.error ?? customersResult.error ?? warehousesResult.error;
  if (error) throw new Error(error.message);
  const eligible = (shipmentsResult.data ?? []).filter((shipment) => shipment.status === "completed");
  const customers = new Map((customersResult.data ?? []).map((customer) => [customer.id, customer.company_name]));
  const warehouses = new Map((warehousesResult.data ?? []).map((warehouse) => [warehouse.id, warehouse.name]));

  return (
    <ModuleShell organizationName={organization.name} email={email} role={membership.role}>
      <ModuleHeading eyebrow={es ? "Preparación de envíos" : "Shipping readiness"} title={es ? "Despachos" : "Outbound"} description={es ? "Planifica envíos de clientes desde stock recibido y disponible para fulfillment." : "Plan customer shipments from stock that has completed receiving and is available for fulfillment."} action={<Link href="/inventory" className="rounded-xl bg-[#f59e0b] px-5 py-3 font-bold text-[#162033]">{es ? "Ver inventario" : "View inventory"}</Link>} />
      <div className="mt-8 grid gap-4 sm:grid-cols-3"><MetricCard label="Ready sources" value={String(eligible.length)} detail="Completed inbound shipments" /><MetricCard label="Draft shipments" value="0" detail="Outbound ledger not created yet" /><MetricCard label="Dispatched" value="0" detail="Awaiting outbound workflow" /></div>
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-[#162033]">Stock ready for outbound planning</h2><p className="mt-1 text-sm text-slate-500">Completed receiving records that can supply the next outbound workflow.</p>
        {eligible.length === 0 ? <div className="py-14 text-center"><p className="font-bold text-[#162033]">Nothing is ready to ship yet</p><p className="mt-2 text-sm text-slate-500">Complete an inbound reception first.</p></div> : <div className="mt-6 divide-y divide-slate-100">{eligible.map((shipment) => <div key={shipment.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"><div><Link href={`/inbound/${shipment.id}`} className="font-bold text-[#162033] hover:underline">{shipment.inbound_number}</Link><p className="mt-1 text-sm text-slate-500">{customers.get(shipment.customer_id) ?? "Customer"} · {warehouses.get(shipment.warehouse_id) ?? "Warehouse"}</p></div><span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-[#067d62]">Receiving complete</span></div>)}</div>}
      </section>
      <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900"><strong>Next operational layer:</strong> outbound drafts, destinations, carton lines, allocations, labels, dispatch evidence, inventory deductions, and billable handling events.</div>
    </ModuleShell>
  );
}
