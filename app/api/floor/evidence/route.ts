import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const maximumBytes = 10 * 1024 * 1024;
const allowedContexts = new Set(["damaged_inbound"]);

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
  if (
    !membership ||
    !["owner", "admin", "manager", "operator"].includes(membership.role)
  ) {
    return NextResponse.json({ error: "Your role cannot attach operational evidence." }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "The evidence request is invalid." }, { status: 400 });
  }

  const operationalEventId = String(formData.get("operationalEventId") ?? "").trim();
  const context = String(formData.get("context") ?? "damaged_inbound").trim();
  const file = formData.get("photo");

  if (!operationalEventId) {
    return NextResponse.json({ error: "An operational event is required." }, { status: 400 });
  }
  if (!allowedContexts.has(context)) {
    return NextResponse.json({ error: "Evidence context is not supported." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a photo to attach." }, { status: 400 });
  }
  const extension = allowedTypes.get(file.type);
  if (!extension) {
    return NextResponse.json(
      { error: "Use a JPEG, PNG, or WebP image." },
      { status: 415 },
    );
  }
  if (file.size > maximumBytes) {
    return NextResponse.json(
      { error: "Photo must be 10 MB or smaller." },
      { status: 413 },
    );
  }

  const { data: event, error: eventError } = await supabase
    .from("operational_events")
    .select("id")
    .eq("id", operationalEventId)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();
  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }
  if (!event) {
    return NextResponse.json({ error: "Operational event was not found." }, { status: 404 });
  }

  const storagePath = `${membership.organization_id}/${event.id}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("proof-of-work")
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 409 });
  }

  const { data: evidence, error: evidenceError } = await supabase
    .from("proof_of_work_evidence")
    .insert({
      organization_id: membership.organization_id,
      operational_event_id: event.id,
      evidence_type: "photo",
      storage_bucket: "proof-of-work",
      storage_path: storagePath,
      metadata: {
        context,
        content_type: file.type,
        size_bytes: file.size,
      },
      captured_by: String(userId),
    })
    .select("id, captured_at")
    .single();

  if (evidenceError) {
    await supabase.storage.from("proof-of-work").remove([storagePath]);
    return NextResponse.json(
      {
        error: "The photo could not be linked to its Proof of Work event. Try again.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { ok: true, evidence },
    { headers: { "Cache-Control": "no-store" } },
  );
}
