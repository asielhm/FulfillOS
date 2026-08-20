import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReceiveBody = {
  inboundItemId?: unknown;
  locationId?: unknown;
  receivedQuantity?: unknown;
  damagedQuantity?: unknown;
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
  if (!membership) {
    return NextResponse.json({ error: "Active workspace required." }, { status: 403 });
  }
  if (!["owner", "admin", "manager", "operator"].includes(membership.role)) {
    return NextResponse.json({ error: "Your role cannot receive inventory." }, { status: 403 });
  }

  let body: ReceiveBody;
  try {
    body = (await request.json()) as ReceiveBody;
  } catch {
    return NextResponse.json({ error: "The receiving request is invalid." }, { status: 400 });
  }

  const inboundItemId = text(body.inboundItemId);
  const locationId = text(body.locationId);
  const idempotencyKey = text(body.idempotencyKey);
  const note = text(body.note);
  const receivedQuantity = Number(body.receivedQuantity);
  const damagedQuantity = Number(body.damagedQuantity ?? 0);

  if (!inboundItemId || !locationId || !idempotencyKey) {
    return NextResponse.json(
      { error: "Item, location, and idempotency key are required." },
      { status: 400 },
    );
  }
  if (!Number.isInteger(receivedQuantity) || receivedQuantity <= 0) {
    return NextResponse.json(
      { error: "Received quantity must be a positive whole number." },
      { status: 400 },
    );
  }
  if (
    !Number.isInteger(damagedQuantity) ||
    damagedQuantity < 0 ||
    damagedQuantity > receivedQuantity
  ) {
    return NextResponse.json(
      { error: "Damaged quantity must be between zero and the total received." },
      { status: 400 },
    );
  }
  if (damagedQuantity > 0 && note.length < 3) {
    return NextResponse.json(
      { error: "Add a short damage note before receiving damaged units." },
      { status: 400 },
    );
  }

  const { data: item, error: itemError } = await supabase
    .from("inbound_shipment_items")
    .select("id, shipment_id")
    .eq("id", inboundItemId)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();
  if (itemError) {
    return NextResponse.json({ error: itemError.message }, { status: 500 });
  }
  if (!item) {
    return NextResponse.json({ error: "Inbound product was not found." }, { status: 404 });
  }

  const [{ data: shipment, error: shipmentError }, { data: location, error: locationError }] =
    await Promise.all([
      supabase
        .from("inbound_shipments")
        .select("id, warehouse_id, status")
        .eq("id", item.shipment_id)
        .eq("organization_id", membership.organization_id)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .from("warehouse_locations")
        .select("id, warehouse_id, is_active")
        .eq("id", locationId)
        .eq("organization_id", membership.organization_id)
        .maybeSingle(),
    ]);

  const validationError = shipmentError ?? locationError;
  if (validationError) {
    return NextResponse.json({ error: validationError.message }, { status: 500 });
  }
  if (!shipment || ["completed", "cancelled"].includes(shipment.status)) {
    return NextResponse.json({ error: "This inbound is not open for receiving." }, { status: 409 });
  }
  if (!location?.is_active || location.warehouse_id !== shipment.warehouse_id) {
    return NextResponse.json(
      { error: "Scan an active location in the inbound warehouse." },
      { status: 409 },
    );
  }

  const { data, error } = await supabase.rpc("receive_inbound_units", {
    p_inbound_item_id: inboundItemId,
    p_location_id: locationId,
    p_received_quantity: receivedQuantity,
    p_damaged_quantity: damagedQuantity,
    p_idempotency_key: idempotencyKey,
    p_note: note || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  const [
    { data: updatedItem, error: updatedItemError },
    { data: operationalEvent },
  ] = await Promise.all([
    supabase
      .from("inbound_shipment_items")
      .select("id, expected_quantity, received_quantity, damaged_quantity")
      .eq("id", inboundItemId)
      .eq("organization_id", membership.organization_id)
      .single(),
    supabase
      .from("operational_events")
      .select("id")
      .eq("organization_id", membership.organization_id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle(),
  ]);

  if (updatedItemError) {
    return NextResponse.json({ error: updatedItemError.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      ok: true,
      result: data,
      item: updatedItem,
      operationalEventId: operationalEvent?.id ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
