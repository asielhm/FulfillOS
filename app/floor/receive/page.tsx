import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, PackageCheck, Plus } from "lucide-react";

import { FloorShell } from "@/components/floor/floor-shell";
import { getFloorContext } from "@/lib/floor";

export default async function FloorReceivePage() {
  const {
    supabase,
    organization,
    membership,
    locale,
    worker,
    defaultWarehouse,
  } = await getFloorContext();
  const es = locale === "es";

  if (membership.role === "viewer") redirect("/dashboard");

  const [shipmentsResult, customersResult, warehousesResult] = await Promise.all([
    supabase
      .from("inbound_shipments")
      .select("id, customer_id, warehouse_id, inbound_number, status, expected_at, created_at")
      .eq("organization_id", organization.id)
      .in("status", ["expected", "arrived", "receiving"])
      .is("deleted_at", null)
      .order("expected_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("customers")
      .select("id, company_name")
      .eq("organization_id", organization.id),
    supabase
      .from("warehouses")
      .select("id, name, code")
      .eq("organization_id", organization.id)
      .eq("is_active", true),
  ]);

  const baseError =
    shipmentsResult.error ?? customersResult.error ?? warehousesResult.error;
  if (baseError) throw new Error(baseError.message);

  const shipments = shipmentsResult.data ?? [];
  const shipmentIds = shipments.map((shipment) => shipment.id);
  const itemsResult = shipmentIds.length
    ? await supabase
        .from("inbound_shipment_items")
        .select("shipment_id, expected_quantity, received_quantity, damaged_quantity")
        .in("shipment_id", shipmentIds)
    : { data: [], error: null };
  if (itemsResult.error) throw new Error(itemsResult.error.message);

  const customers = new Map(
    (customersResult.data ?? []).map((customer) => [customer.id, customer.company_name]),
  );
  const warehouses = new Map(
    (warehousesResult.data ?? []).map((warehouse) => [warehouse.id, warehouse]),
  );
  const totals = new Map<
    string,
    { expected: number; received: number; damaged: number }
  >();
  for (const item of itemsResult.data ?? []) {
    const current = totals.get(item.shipment_id) ?? {
      expected: 0,
      received: 0,
      damaged: 0,
    };
    current.expected += item.expected_quantity;
    current.received += item.received_quantity;
    current.damaged += item.damaged_quantity;
    totals.set(item.shipment_id, current);
  }

  const canCreate = ["owner", "admin", "manager"].includes(membership.role);

  return (
    <FloorShell
      organizationName={organization.name}
      workerName={worker.displayName}
      warehouseName={defaultWarehouse?.name}
      role={membership.role}
      locale={locale}
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#c7511f]">
            {es ? "Recepción móvil" : "Mobile receiving"}
          </p>
          <h1 className="mt-2 text-3xl font-black text-[#162033]">
            {es ? "Elegí un inbound" : "Choose an inbound"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {es
              ? "Abrí una recepción y comenzá a escanear ubicación y producto."
              : "Open a receipt and start scanning the location and product."}
          </p>
        </div>
        {canCreate ? (
          <Link
            href="/inbound/new"
            aria-label={es ? "Crear inbound" : "Create inbound"}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f59e0b] text-[#162033] shadow-sm"
          >
            <Plus className="h-6 w-6" />
          </Link>
        ) : null}
      </div>

      {shipments.length === 0 ? (
        <section className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <PackageCheck className="mx-auto h-12 w-12 text-slate-400" />
          <h2 className="mt-4 text-xl font-black text-[#162033]">
            {es ? "No hay recepciones abiertas" : "No open receipts"}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {es
              ? "Los inbounds esperados, arribados o en recepción aparecerán aquí."
              : "Expected, arrived, or receiving inbound shipments will appear here."}
          </p>
          {canCreate ? (
            <Link href="/inbound/new" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-[#162033] px-5 font-black text-white">
              {es ? "Crear inbound" : "Create inbound"}
            </Link>
          ) : null}
        </section>
      ) : (
        <section className="mt-6 space-y-4" aria-label={es ? "Recepciones abiertas" : "Open receipts"}>
          {shipments.map((shipment) => {
            const total = totals.get(shipment.id) ?? {
              expected: 0,
              received: 0,
              damaged: 0,
            };
            const warehouse = warehouses.get(shipment.warehouse_id);
            const remaining = Math.max(total.expected - total.received, 0);
            return (
              <Link
                key={shipment.id}
                href={`/floor/receive/${shipment.id}`}
                className="flex min-h-32 items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition active:bg-amber-50"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase text-amber-800">
                      {shipment.status.replaceAll("_", " ")}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {remaining} {es ? "restantes" : "remaining"}
                    </span>
                  </div>
                  <h2 className="mt-3 truncate text-xl font-black text-[#162033]">
                    {shipment.inbound_number}
                  </h2>
                  <p className="mt-1 truncate font-semibold text-slate-700">
                    {customers.get(shipment.customer_id) ?? (es ? "Cliente" : "Customer")}
                  </p>
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {warehouse ? `${warehouse.name} · ${warehouse.code}` : es ? "Almacén" : "Warehouse"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <p className="text-2xl font-black text-[#067d62]">{total.received}</p>
                    <p className="text-xs font-bold text-slate-400">/ {total.expected}</p>
                  </div>
                  <ChevronRight className="h-6 w-6 text-slate-400" />
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </FloorShell>
  );
}
