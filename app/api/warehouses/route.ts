import { randomUUID } from "node:crypto";

import { createClient } from "@/lib/supabase/server";
import { type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    `/warehouses/new?error=${encodeURIComponent(
      message,
    )}`,
  );
}

function optionalText(
  formData: FormData,
  field: string,
) {
  const value = String(
    formData.get(field) ?? "",
  ).trim();

  return value.length > 0 ? value : null;
}

function normalizeCode(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

export async function POST(
  request: NextRequest,
) {
  const supabase = await createClient();

  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getClaims();

  const userId = authData?.claims?.sub;

  if (authError || !userId) {
    return redirectResponse("/auth/login");
  }

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", String(userId))
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return redirectWithError(
      membershipError.message,
    );
  }

  if (!membership) {
    return redirectResponse("/onboarding");
  }

  const canManage = [
    "owner",
    "admin",
    "manager",
  ].includes(membership.role);

  if (!canManage) {
    return redirectResponse(
      "/warehouses?error=You do not have permission to add warehouses.",
    );
  }

  const formData = await request.formData();

  const name = String(
    formData.get("name") ?? "",
  ).trim();

  if (name.length < 2 || name.length > 120) {
    return redirectWithError(
      "The warehouse name must contain between 2 and 120 characters.",
    );
  }

  const suppliedCode = String(
    formData.get("code") ?? "",
  ).trim();

  let code =
    normalizeCode(suppliedCode) ||
    normalizeCode(name) ||
    "WAREHOUSE";

  const {
    data: existingCode,
    error: codeCheckError,
  } = await supabase
    .from("warehouses")
    .select("id")
    .eq(
      "organization_id",
      membership.organization_id,
    )
    .eq("code", code)
    .limit(1)
    .maybeSingle();

  if (codeCheckError) {
    return redirectWithError(
      codeCheckError.message,
    );
  }

  if (existingCode) {
    const suffix = randomUUID()
      .replaceAll("-", "")
      .slice(0, 6)
      .toUpperCase();

    code = `${code.slice(0, 23)}-${suffix}`;
  }

  const countryCode =
    String(
      formData.get("countryCode") ?? "US",
    )
      .trim()
      .toUpperCase() || "US";

  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return redirectWithError(
      "Please select a valid country.",
    );
  }

  const timezone =
    String(
      formData.get("timezone") ??
        "America/New_York",
    ).trim() || "America/New_York";

  const {
    count: warehouseCount,
    error: countError,
  } = await supabase
    .from("warehouses")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq(
      "organization_id",
      membership.organization_id,
    );

  if (countError) {
    return redirectWithError(
      countError.message,
    );
  }

  const { error: insertError } =
    await supabase.from("warehouses").insert({
      organization_id:
        membership.organization_id,

      name,
      code,

      address_line_1: optionalText(
        formData,
        "addressLine1",
      ),

      address_line_2: optionalText(
        formData,
        "addressLine2",
      ),

      city: optionalText(
        formData,
        "city",
      ),

      state_region: optionalText(
        formData,
        "stateRegion",
      ),

      postal_code: optionalText(
        formData,
        "postalCode",
      ),

      country_code: countryCode,
      timezone,

      /*
       * The first warehouse automatically becomes
       * the primary warehouse.
       */
      is_primary: (warehouseCount ?? 0) === 0,
      is_active: true,
    });

  if (insertError) {
    return redirectWithError(
      insertError.message,
    );
  }

  return redirectResponse(
    "/warehouses?created=1",
  );
}