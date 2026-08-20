import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LookupBody = {
  mode?: unknown;
  warehouseId?: unknown;
  scan?: unknown;
  kind?: unknown;
  sourceLocationId?: unknown;
  productScan?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function candidates(value: string) {
  return [...new Set([value, value.toUpperCase(), value.toLowerCase()])];
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (authError || !userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", String(userId))
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }
  if (!membership || !["owner", "admin", "manager", "operator"].includes(membership.role)) {
    return NextResponse.json({ error: "Your role cannot move inventory." }, { status: 403 });
  }

  let body: LookupBody;
  try {
    body = (await request.json()) as LookupBody;
  } catch {
    return NextResponse.json({ error: "Invalid scan request." }, { status: 400 });
  }

  const mode = text(body.mode);
  const warehouseId = text(body.warehouseId);
  if (!warehouseId || !["location", "source-product"].includes(mode)) {
    return NextResponse.json({ error: "Warehouse and lookup mode are required." }, { status: 400 });
  }

  const { data: warehouse, error: warehouseError } = await supabase
    .from("warehouses")
    .select("id")
    .eq("id", warehouseId)
    .eq("organization_id", membership.organization_id)
    .eq("is_active", true)
    .maybeSingle();

  if (warehouseError) {
    return NextResponse.json({ error: warehouseError.message }, { status: 500 });
  }
  if (!warehouse) {
    return NextResponse.json({ error: "Active warehouse was not found." }, { status: 404 });
  }

  if (mode === "location") {
    const scan = text(body.scan);
    const kind = text(body.kind);
    const sourceLocationId = text(body.sourceLocationId);
    if (!scan || !["source", "destination"].includes(kind)) {
      return NextResponse.json({ error: "Location scan and kind are required." }, { status: 400 });
    }

    const scanCandidates = candidates(scan);
    const [codeResult, barcodeResult] = await Promise.all([
      supabase
        .from("warehouse_locations")
        .select("id, name, code, barcode, purpose")
        .eq("organization_id", membership.organization_id)
        .eq("warehouse_id", warehouseId)
        .eq("is_active", true)
        .in("code", scanCandidates),
      supabase
        .from("warehouse_locations")
        .select("id, name, code, barcode, purpose")
        .eq("organization_id", membership.organization_id)
        .eq("warehouse_id", warehouseId)
        .eq("is_active", true)
        .eq("barcode", scan),
    ]);

    const locationError = codeResult.error ?? barcodeResult.error;
    if (locationError) {
      return NextResponse.json({ error: locationError.message }, { status: 500 });
    }
    const locations = new Map(
      [...(codeResult.data ?? []), ...(barcodeResult.data ?? [])].map((location) => [
        location.id,
        location,
      ]),
    );
    if (locations.size !== 1) {
      return NextResponse.json(
        {
          error:
            locations.size > 1
              ? "This code matches multiple locations. Use the unique location barcode."
              : "Location was not found in this warehouse.",
        },
        { status: locations.size > 1 ? 409 : 404 },
      );
    }

    const location = [...locations.values()][0];
    if (kind === "destination" && location.id === sourceLocationId) {
      return NextResponse.json(
        { error: "Source and destination locations must be different." },
        { status: 409 },
      );
    }
    if (kind === "destination" && location.purpose === "quarantine") {
      return NextResponse.json(
        { error: "Use the quarantine workflow when moving stock into quarantine." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { ok: true, location },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const sourceLocationId = text(body.sourceLocationId);
  const productScan = text(body.productScan);
  if (!sourceLocationId || !productScan) {
    return NextResponse.json(
      { error: "Source location and product scan are required." },
      { status: 400 },
    );
  }

  const { data: sourceLocation, error: sourceError } = await supabase
    .from("warehouse_locations")
    .select("id, name, code")
    .eq("id", sourceLocationId)
    .eq("organization_id", membership.organization_id)
    .eq("warehouse_id", warehouseId)
    .eq("is_active", true)
    .maybeSingle();
  if (sourceError) {
    return NextResponse.json({ error: sourceError.message }, { status: 500 });
  }
  if (!sourceLocation) {
    return NextResponse.json({ error: "Source location was not found." }, { status: 404 });
  }

  const productCandidates = candidates(productScan);
  const productLookups = await Promise.all(
    ["sku", "barcode", "asin", "fnsku"].map((field) =>
      supabase
        .from("products")
        .select("id, customer_id, sku, title")
        .eq("organization_id", membership.organization_id)
        .eq("status", "active")
        .in(field, field === "barcode" ? [productScan] : productCandidates),
    ),
  );
  const productError = productLookups.find((result) => result.error)?.error;
  if (productError) {
    return NextResponse.json({ error: productError.message }, { status: 500 });
  }
  const products = new Map(
    productLookups
      .flatMap((result) => result.data ?? [])
      .map((product) => [product.id, product]),
  );
  if (products.size === 0) {
    return NextResponse.json({ error: "Product code was not found." }, { status: 404 });
  }

  const productIds = [...products.keys()];
  const { data: movements, error: movementsError } = await supabase
    .from("inventory_movements")
    .select("product_id, quantity_delta")
    .eq("organization_id", membership.organization_id)
    .eq("warehouse_id", warehouseId)
    .eq("location_id", sourceLocationId)
    .eq("stock_status", "available")
    .in("product_id", productIds);
  if (movementsError) {
    return NextResponse.json({ error: movementsError.message }, { status: 500 });
  }

  const balances = new Map<string, number>();
  for (const movement of movements ?? []) {
    balances.set(
      movement.product_id,
      (balances.get(movement.product_id) ?? 0) + Number(movement.quantity_delta),
    );
  }
  const availableProducts = [...products.values()].filter(
    (product) => (balances.get(product.id) ?? 0) > 0,
  );
  if (availableProducts.length !== 1) {
    return NextResponse.json(
      {
        error:
          availableProducts.length > 1
            ? "This code matches multiple products at the source location. Scan a unique barcode."
            : "No available inventory matches that product at the source location.",
      },
      { status: 409 },
    );
  }

  const product = availableProducts[0];
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("company_name")
    .eq("id", product.customer_id)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();
  if (customerError) {
    return NextResponse.json({ error: customerError.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      ok: true,
      sourceLocation,
      product: {
        id: product.id,
        sku: product.sku,
        title: product.title,
        customer: customer?.company_name ?? "Customer",
      },
      available: balances.get(product.id) ?? 0,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
