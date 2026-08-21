import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actions = new Set([
  "start_review",
  "assign",
  "resolve",
  "dismiss",
  "reopen",
  "add_note",
]);

type RouteContext = {
  params: Promise<{ exceptionId: string }>;
};

type ActionBody = {
  action?: unknown;
  note?: unknown;
  assignedTo?: unknown;
};

export async function POST(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { exceptionId } = await context.params;
  if (!isUuid(exceptionId)) {
    return NextResponse.json({ error: "The exception ID is invalid." }, { status: 400 });
  }

  let body: ActionBody;
  try {
    body = (await request.json()) as ActionBody;
  } catch {
    return NextResponse.json({ error: "The exception request is invalid." }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action.trim() : "";
  const note = typeof body.note === "string" ? body.note.trim() : "";
  const assignedTo = typeof body.assignedTo === "string" ? body.assignedTo.trim() : "";

  if (!actions.has(action)) {
    return NextResponse.json({ error: "Choose a supported exception action." }, { status: 400 });
  }
  if (note.length > 2000) {
    return NextResponse.json({ error: "Notes cannot exceed 2000 characters." }, { status: 400 });
  }
  if (["resolve", "dismiss"].includes(action) && note.length < 3) {
    return NextResponse.json({ error: "Add a resolution reason." }, { status: 400 });
  }
  if (assignedTo && !isUuid(assignedTo)) {
    return NextResponse.json({ error: "The selected assignee is invalid." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("update_exception_case", {
    p_exception_id: exceptionId,
    p_action: action,
    p_note: note || null,
    p_assigned_to: assignedTo || null,
  });

  if (error) {
    console.error("Exception action failed", error);
    return NextResponse.json(
      { error: "The exception could not be updated. Check its current status and your role." },
      { status: 409 },
    );
  }

  return NextResponse.json(
    { ok: true, exception: data },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
