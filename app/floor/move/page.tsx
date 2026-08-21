import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftRight, Warehouse } from "lucide-react";

import { FloorShell } from "@/components/floor/floor-shell";
import { getFloorContext } from "@/lib/floor";
import { InventoryMoveWorkflow } from "./inventory-move-workflow";

type PageProps = {
  searchParams: Promise<{ warehouse?: string }>;
};

export default async function FloorMovePage({ searchParams }: PageProps) {
  const { warehouse: requestedWarehouseId } = await searchParams;
  const context = await getFloorContext();
  const { supabase, organization, membership, locale, worker, defaultWarehouse } = context;
  const es = locale === "es";

  if (!["owner", "admin", "manager", "operator"].includes(membership.role)) {
    redirect("/dashboard");
  }

  const { data: warehouses, error } = await supabase
    .from("warehouses")
    .select("id, name, code, is_primary")
    .eq("organization_id", organization.id)
    .eq("is_active", true)
    .order("is_primary", { ascending: false })
    .order("name");
  if (error) throw new Error(error.message);

  const warehouseList = warehouses ?? [];
  const selectedWarehouse =
    warehouseList.find((warehouse) => warehouse.id === requestedWarehouseId) ??
    warehouseList.find((warehouse) => warehouse.id === defaultWarehouse?.id) ??
    warehouseList[0] ??
    null;

  const locationsResult = selectedWarehouse
    ? await supabase
        .from("warehouse_locations")
        .select("id, name, code, barcode, purpose")
        .eq("organization_id", organization.id)
        .eq("warehouse_id", selectedWarehouse.id)
        .eq("is_active", true)
        .order("sort_order")
        .order("name")
    : { data: [], error: null };
  if (locationsResult.error) throw new Error(locationsResult.error.message);

  return (
    <FloorShell
      organizationName={organization.name}
      workerName={worker.displayName}
      warehouseName={selectedWarehouse?.name ?? defaultWarehouse?.name}
      role={membership.role}
      locale={locale}
    >
      <div>
        <p className="text-sm font-black uppercase tracking-[0.16em] text-[#c7511f]">
          {es ? "Movimiento móvil" : "Mobile inventory move"}
        </p>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-[#162033]">
          <ArrowLeftRight className="h-8 w-8 text-[#f59e0b]" />
          {es ? "Mover inventario" : "Move inventory"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          {es
            ? "Escaneá o elegí las ubicaciones y escaneá el producto. FulfillOS conserva cada confirmación como Proof of Work."
            : "Scan or choose locations and scan the product. FulfillOS keeps every confirmation as Proof of Work."}
        </p>
      </div>

      {warehouseList.length > 1 ? (
        <section className="mt-6" aria-label={es ? "Elegir almacén" : "Choose warehouse"}>
          <p className="text-sm font-black text-[#162033]">
            {es ? "Almacén" : "Warehouse"}
          </p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {warehouseList.map((warehouse) => (
              <Link
                key={warehouse.id}
                href={`/floor/move?warehouse=${warehouse.id}`}
                aria-current={warehouse.id === selectedWarehouse?.id ? "true" : undefined}
                className={
                  warehouse.id === selectedWarehouse?.id
                    ? "inline-flex min-h-12 shrink-0 items-center gap-2 rounded-2xl bg-[#162033] px-4 text-sm font-black text-white"
                    : "inline-flex min-h-12 shrink-0 items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700"
                }
              >
                <Warehouse className="h-4 w-4" />
                {warehouse.name} · {warehouse.code}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {selectedWarehouse && (locationsResult.data?.length ?? 0) >= 2 ? (
        <InventoryMoveWorkflow
          key={selectedWarehouse.id}
          locale={locale}
          warehouse={{
            id: selectedWarehouse.id,
            name: selectedWarehouse.name,
            code: selectedWarehouse.code,
          }}
          locations={locationsResult.data ?? []}
        />
      ) : (
        <section className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <Warehouse className="mx-auto h-12 w-12 text-slate-400" />
          <h2 className="mt-4 text-xl font-black text-[#162033]">
            {selectedWarehouse
              ? es
                ? "Configurá dos ubicaciones"
                : "Set up two locations"
              : es
                ? "Primero configurá un almacén"
                : "Set up a warehouse first"}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {selectedWarehouse
              ? es
                ? "Mover inventario requiere al menos una ubicación de origen y otra de destino."
                : "Moving inventory requires at least one source and one destination location."
              : es
                ? "Necesitás un almacén activo y al menos dos ubicaciones para mover inventario."
                : "You need an active warehouse and at least two locations to move inventory."}
          </p>
          <Link
            href="/warehouses"
            className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-[#162033] px-5 font-black text-white"
          >
            {es ? "Abrir almacenes" : "Open warehouses"}
          </Link>
        </section>
      )}
    </FloorShell>
  );
}
