import { notFound, redirect } from "next/navigation";

import { FloorShell } from "@/components/floor/floor-shell";
import { getFloorContext } from "@/lib/floor";
import { ReceivingWorkflow } from "./receiving-workflow";

type PageProps = { params: Promise<{ shipmentId: string }> };

export default async function FloorReceivingWorkflowPage({ params }: PageProps) {
  const { shipmentId } = await params;
  const context = await getFloorContext();
  const {
    supabase,
    organization,
    membership,
    locale,
    worker,
    defaultWarehouse,
  } = context;

  if (!["owner", "admin", "manager", "operator"].includes(membership.role)) {
    redirect("/floor");
  }

  const { data: shipment, error: shipmentError } = await supabase
    .from("inbound_shipments")
    .select("id, customer_id, warehouse_id, inbound_number, status")
    .eq("id", shipmentId)
    .eq("organization_id", organization.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (shipmentError) throw new Error(shipmentError.message);
  if (!shipment) notFound();
  if (["completed", "cancelled"].includes(shipment.status)) {
    redirect(`/inbound/${shipment.id}`);
  }

  const [customerResult, warehouseResult, itemsResult, locationsResult] =
    await Promise.all([
      supabase
        .from("customers")
        .select("company_name")
        .eq("id", shipment.customer_id)
        .eq("organization_id", organization.id)
        .single(),
      supabase
        .from("warehouses")
        .select("name, code")
        .eq("id", shipment.warehouse_id)
        .eq("organization_id", organization.id)
        .single(),
      supabase
        .from("inbound_shipment_items")
        .select("id, product_id, expected_quantity, received_quantity, damaged_quantity")
        .eq("shipment_id", shipment.id)
        .eq("organization_id", organization.id)
        .order("created_at"),
      supabase
        .from("warehouse_locations")
        .select("id, name, code, barcode, purpose")
        .eq("warehouse_id", shipment.warehouse_id)
        .eq("organization_id", organization.id)
        .eq("is_active", true)
        .order("sort_order")
        .order("name"),
    ]);

  const loadError =
    customerResult.error ??
    warehouseResult.error ??
    itemsResult.error ??
    locationsResult.error;
  if (loadError || !customerResult.data || !warehouseResult.data) {
    throw new Error(loadError?.message ?? "Inbound context could not be loaded.");
  }

  const items = itemsResult.data ?? [];
  const productIds = items.map((item) => item.product_id);
  const productsResult = productIds.length
    ? await supabase
        .from("products")
        .select("id, title, sku, barcode, asin, fnsku")
        .eq("organization_id", organization.id)
        .in("id", productIds)
    : { data: [], error: null };
  if (productsResult.error) throw new Error(productsResult.error.message);

  const products = new Map(
    (productsResult.data ?? []).map((product) => [product.id, product]),
  );
  const workflowItems = items.map((item) => ({
    ...item,
    product: products.get(item.product_id) ?? {
      id: item.product_id,
      title: "Product",
      sku: "—",
      barcode: null,
      asin: null,
      fnsku: null,
    },
  }));

  return (
    <FloorShell
      organizationName={organization.name}
      workerName={worker.displayName}
      warehouseName={warehouseResult.data.name ?? defaultWarehouse?.name}
      role={membership.role}
      locale={locale}
    >
      <ReceivingWorkflow
        locale={locale}
        shipment={{
          id: shipment.id,
          inboundNumber: shipment.inbound_number,
          customer: customerResult.data.company_name,
          warehouse: warehouseResult.data.name,
          warehouseCode: warehouseResult.data.code,
        }}
        initialItems={workflowItems}
        locations={locationsResult.data ?? []}
      />
    </FloorShell>
  );
}
