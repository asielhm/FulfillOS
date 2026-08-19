import Link from "next/link";

import { MetricCard, ModuleHeading, ModuleShell } from "@/components/module-shell";
import { getWorkspaceContext } from "@/lib/workspace";

export default async function InventoryPage() {
  const { supabase, organization, membership, email, locale } = await getWorkspaceContext();
  const copy = locale === "es" ? {
    eyebrow: "Visibilidad de stock", title: "Inventario", description: "Unidades disponibles calculadas desde recepciones reales, agrupadas por SKU y almacén.", action: "Ver recepciones", available: "Unidades disponibles", availableDetail: "Recibidas menos dañadas", locations: "Ubicaciones de SKU", locationsDetail: "Balances por producto y almacén", damaged: "Unidades dañadas", damagedDetail: "Excluidas del stock disponible", empty: "Aún no hay inventario", emptyDetail: "Recibe unidades en un inbound para crear el primer balance.", product: "Producto", customer: "Cliente", warehouse: "Almacén",
  } : {
    eyebrow: "Stock visibility", title: "Inventory", description: "Available units derived from completed receiving activity, grouped by SKU and warehouse.", action: "Review inbound", available: "Available units", availableDetail: "Received minus damaged", locations: "SKU locations", locationsDetail: "Product and warehouse balances", damaged: "Damaged units", damagedDetail: "Excluded from available stock", empty: "No inventory recorded yet", emptyDetail: "Receive units on an inbound shipment to create your first balance.", product: "Product", customer: "Customer", warehouse: "Warehouse",
  };

  const [productsResult, customersResult, warehousesResult, shipmentsResult] = await Promise.all([
    supabase.from("products").select("id, customer_id, sku, title, status").eq("organization_id", organization.id),
    supabase.from("customers").select("id, company_name").eq("organization_id", organization.id),
    supabase.from("warehouses").select("id, name, code").eq("organization_id", organization.id),
    supabase.from("inbound_shipments").select("id, warehouse_id, status").eq("organization_id", organization.id).is("deleted_at", null),
  ]);

  const baseError = productsResult.error ?? customersResult.error ?? warehousesResult.error ?? shipmentsResult.error;
  if (baseError) throw new Error(baseError.message);

  const shipments = shipmentsResult.data ?? [];
  const shipmentIds = shipments.map((shipment) => shipment.id);
  const itemsResult = shipmentIds.length > 0
    ? await supabase.from("inbound_shipment_items").select("shipment_id, product_id, received_quantity, damaged_quantity").in("shipment_id", shipmentIds)
    : { data: [], error: null };

  if (itemsResult.error) throw new Error(itemsResult.error.message);

  const products = new Map((productsResult.data ?? []).map((product) => [product.id, product]));
  const customers = new Map((customersResult.data ?? []).map((customer) => [customer.id, customer.company_name]));
  const warehouses = new Map((warehousesResult.data ?? []).map((warehouse) => [warehouse.id, warehouse]));
  const shipmentMap = new Map(shipments.map((shipment) => [shipment.id, shipment]));
  const balances = new Map<string, { productId: string; warehouseId: string; available: number; damaged: number }>();

  for (const item of itemsResult.data ?? []) {
    const shipment = shipmentMap.get(item.shipment_id);
    if (!shipment) continue;
    const key = `${item.product_id}:${shipment.warehouse_id}`;
    const current = balances.get(key) ?? { productId: item.product_id, warehouseId: shipment.warehouse_id, available: 0, damaged: 0 };
    current.available += Math.max(0, item.received_quantity - item.damaged_quantity);
    current.damaged += item.damaged_quantity;
    balances.set(key, current);
  }

  const rows = [...balances.values()]
    .filter((balance) => balance.available > 0 || balance.damaged > 0)
    .sort((a, b) => (products.get(a.productId)?.title ?? "").localeCompare(products.get(b.productId)?.title ?? ""));
  const availableUnits = rows.reduce((sum, row) => sum + row.available, 0);
  const damagedUnits = rows.reduce((sum, row) => sum + row.damaged, 0);

  return (
    <ModuleShell organizationName={organization.name} email={email} role={membership.role}>
      <ModuleHeading
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        action={<Link href="/inbound" className="rounded-xl bg-[#f59e0b] px-5 py-3 font-bold text-[#162033]">{copy.action}</Link>}
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <MetricCard label={copy.available} value={availableUnits.toLocaleString()} detail={copy.availableDetail} />
        <MetricCard label={copy.locations} value={String(rows.length)} detail={copy.locationsDetail} />
        <MetricCard label={copy.damaged} value={damagedUnits.toLocaleString()} detail={copy.damagedDetail} />
      </div>

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-lg font-bold text-[#162033]">{copy.empty}</p>
            <p className="mt-2 text-sm text-slate-500">{copy.emptyDetail}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-6 py-4">{copy.product}</th><th className="px-6 py-4">{copy.customer}</th><th className="px-6 py-4">{copy.warehouse}</th><th className="px-6 py-4 text-right">{copy.available}</th><th className="px-6 py-4 text-right">{copy.damaged}</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const product = products.get(row.productId);
                  const warehouse = warehouses.get(row.warehouseId);
                  return (
                    <tr key={`${row.productId}:${row.warehouseId}`} className="hover:bg-slate-50/70">
                      <td className="px-6 py-4"><Link href={`/products/${row.productId}`} className="font-bold text-[#162033] hover:underline">{product?.title ?? "Unknown product"}</Link><p className="mt-1 font-mono text-xs text-slate-500">{product?.sku ?? "—"}</p></td>
                      <td className="px-6 py-4 text-slate-600">{product ? customers.get(product.customer_id) ?? "—" : "—"}</td>
                      <td className="px-6 py-4 text-slate-600">{warehouse ? `${warehouse.name} · ${warehouse.code}` : "—"}</td>
                      <td className="px-6 py-4 text-right text-lg font-black text-[#067d62]">{row.available.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right font-bold text-[#c7511f]">{row.damaged.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="mt-4 text-xs text-slate-500">Inventory is currently calculated from inbound receiving. Location-level movements and outbound deductions are the next ledger upgrade.</p>
    </ModuleShell>
  );
}
