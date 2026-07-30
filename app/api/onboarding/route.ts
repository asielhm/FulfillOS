import { randomUUID } from "node:crypto";

import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function createSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function redirectToOnboardingWithError(
  request: NextRequest,
  message: string,
) {
  const url = new URL("/onboarding", request.url);

  url.searchParams.set("error", message);

  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getClaims();

  const userId = authData?.claims?.sub;

  if (authError || !userId) {
    return NextResponse.redirect(
      new URL("/auth/login", request.url),
      303,
    );
  }

  /*
   * Prevent duplicate organizations.
   * If the user already belongs to a workspace,
   * send them directly to the dashboard.
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
    return redirectToOnboardingWithError(
      request,
      membershipError.message,
    );
  }

  if (existingMembership) {
    return NextResponse.redirect(
      new URL("/dashboard", request.url),
      303,
    );
  }

  const formData = await request.formData();

  const organizationName = String(
    formData.get("organizationName") ?? "",
  ).trim();

  if (
    organizationName.length < 2 ||
    organizationName.length > 120
  ) {
    return redirectToOnboardingWithError(
      request,
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
    return redirectToOnboardingWithError(
      request,
      creationError.message,
    );
  }

  return NextResponse.redirect(
    new URL("/dashboard", request.url),
    303,
  );
}