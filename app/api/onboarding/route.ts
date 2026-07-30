import { randomUUID } from "node:crypto";

import { createClient } from "@/lib/supabase/server";
import { type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function createSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/*
 * A relative Location header prevents Codespaces or another
 * reverse proxy from adding an incorrect host or port.
 */
function redirectResponse(path: string) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: path,
      "Cache-Control": "no-store",
    },
  });
}

function redirectWithError(message: string) {
  return redirectResponse(
    `/onboarding?error=${encodeURIComponent(message)}`,
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getClaims();

  const userId = authData?.claims?.sub;

  if (authError || !userId) {
    return redirectResponse("/auth/login");
  }

  /*
   * If the user already belongs to a company,
   * do not create another workspace.
   */
  const {
    data: existingMembership,
    error: membershipError,
  } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", String(userId))
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return redirectWithError(membershipError.message);
  }

  if (existingMembership) {
    return redirectResponse("/dashboard");
  }

  const formData = await request.formData();

  const organizationName = String(
    formData.get("organizationName") ?? "",
  ).trim();

  if (
    organizationName.length < 2 ||
    organizationName.length > 120
  ) {
    return redirectWithError(
      "The company name must contain between 2 and 120 characters.",
    );
  }

  const baseSlug =
    createSlug(organizationName) || "workspace";

  const uniqueSuffix = randomUUID()
    .replaceAll("-", "")
    .slice(0, 6);

  const organizationSlug =
    `${baseSlug}-${uniqueSuffix}`;

  const { error: creationError } =
    await supabase.rpc("create_organization", {
      p_name: organizationName,
      p_slug: organizationSlug,
    });

  if (creationError) {
    return redirectWithError(creationError.message);
  }

  return redirectResponse("/dashboard");
}