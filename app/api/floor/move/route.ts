import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MoveBody = {
  warehouseId?: unknown;
  sourceScan?: unknown;
  productScan?: unknown;
  destinationScan?: unknown;
  quantity?: unknown;
  idempotencyKey?: unknown;
  note?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

  let body: MoveBody;
  try {
    body = (await request.json()) as MoveBody;
  } catch {
    return NextResponse.json({ error: "The move request is invalid." }, { status: 400 });
  }

  const warehouseId = text(body.warehouseId);
  const sourceScan = text(body.sourceScan);
  const productScan = text(body.productScan);
  const destinationScan = text(body.destinationScan);
  const idempotencyKey = text(body.idempotencyKey);
  const note = text(body.note);
  const quantity = Number(body.quantity);

  if (!warehouseId || !sourceScan || !productScan || !destinationScan || !idempotencyKey) {
    return NextResponse.json(
      { error: "Warehouse, three scans, and idempotency key are required." },
      { status: 400 },
    );
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return NextResponse.json(
      { error: "Quantity must be a positive whole number." },
      { status: 400 },
    );
  }
  if (note.length > 500) {
    return NextResponse.json({ error: "Note must be 500 characters or fewer." }, { status: 400 });
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

  const { data, error } = await supabase.rpc("move_inventory_units", {
    p_warehouse_id: warehouseId,
    p_source_scan: sourceScan,
    p_product_scan: productScan,
    p_destination_scan: destinationScan,
    p_quantity: quantity,
    p_idempotency_key: idempotencyKey,
    p_note: note || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  return NextResponse.json(
    { ok: true, result: data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
