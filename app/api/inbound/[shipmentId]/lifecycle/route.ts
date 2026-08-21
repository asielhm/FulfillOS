import { NextResponse } from "next/server";

import { isUnsafeCrossSiteMutation } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ shipmentId: string }>;
};

type LifecycleBody = {
  action?: unknown;
  expectedDate?: unknown;
  reason?: unknown;
};

const supportedActions = new Set([
  "reschedule",
  "mark_arrived",
  "cancel",
]);

const safeDatabaseErrors = new Set([
  "A cancellation reason is required.",
  "A completed inbound shipment cannot be cancelled.",
  "A deleted inbound shipment cannot be cancelled.",
  "A deleted inbound shipment cannot be marked as arrived.",
  "A deleted inbound shipment cannot be rescheduled.",
  "A reschedule reason is required.",
  "A cancelled inbound shipment cannot be marked as arrived.",
  "Choose a new expected date.",
  "Inbound shipment was not found.",
  "Only an expected inbound shipment can be marked as arrived.",
  "Only an expected inbound shipment can be rescheduled.",
  "The new expected date cannot be in the past.",
  "This shipment already has received inventory and cannot be cancelled directly.",
  "You do not have permission to cancel this inbound shipment.",
  "You do not have permission to mark this inbound shipment as arrived.",
  "You do not have permission to reschedule this inbound shipment.",
]);

export async function POST(request: Request, context: RouteContext) {
  if (isUnsafeCrossSiteMutation(request)) {
    return NextResponse.json(
      { error: "Cross-site inbound requests are not allowed." },
      { status: 403 },
    );
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { shipmentId } = await context.params;
  if (!isUuid(shipmentId)) {
    return NextResponse.json({ error: "The inbound shipment ID is invalid." }, { status: 400 });
  }

  let body: LifecycleBody;
  try {
    body = (await request.json()) as LifecycleBody;
  } catch {
    return NextResponse.json({ error: "The inbound request is invalid." }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action.trim() : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const expectedDate =
    typeof body.expectedDate === "string" ? body.expectedDate.trim() : "";

  if (!supportedActions.has(action)) {
    return NextResponse.json({ error: "Choose a supported inbound action." }, { status: 400 });
  }

  let result: { data: unknown; error: { message: string } | null };

  if (action === "reschedule") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expectedDate)) {
      return NextResponse.json({ error: "Choose a valid expected date." }, { status: 400 });
    }
    if (reason.length < 3) {
      return NextResponse.json({ error: "Add a reason for the schedule change." }, { status: 400 });
    }

    result = await supabase.rpc("reschedule_inbound_shipment", {
      p_shipment_id: shipmentId,
      p_expected_at: `${expectedDate}T12:00:00.000Z`,
      p_reason: reason,
    });
  } else if (action === "mark_arrived") {
    result = await supabase.rpc("mark_inbound_arrived", {
      p_shipment_id: shipmentId,
    });
  } else {
    if (reason.length < 3) {
      return NextResponse.json({ error: "Add a cancellation reason." }, { status: 400 });
    }

    result = await supabase.rpc("cancel_inbound_shipment", {
      p_shipment_id: shipmentId,
      p_reason: reason,
    });
  }

  if (result.error) {
    console.error("Inbound lifecycle action failed", {
      action,
      message: result.error.message,
      shipmentId,
    });

    return NextResponse.json(
      {
        error: safeDatabaseErrors.has(result.error.message)
          ? result.error.message
          : "The inbound shipment could not be updated.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json(
    { ok: true, shipment: result.data },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

