import { randomUUID } from "node:crypto";

import { createClient } from "@/lib/supabase/server";
import { type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    warehouseId: string;
  }>;
};

const allowedPurposes = new Set([
  "general",
  "receiving",
  "storage",
  "prep",
  "packing",
  "outbound",
  "returns",
  "quarantine",
]);

const allowedKinds = new Set([
  "zone",
  "aisle",
  "rack",
  "shelf",
  "bin",
  "dock",
  "workstation",
  "room",
  "other",
]);

const purposeOrder: Record<string, number> = {
  receiving: 10,
  quarantine: 20,
  storage: 30,
  prep: 40,
  packing: 50,
  outbound: 60,
  returns: 70,
  general: 100,
};

function redirectResponse(path: string) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: path,
      "Cache-Control": "no-store",
    },
  });
}

function redirectWithError(
  warehouseId: string,
  message: string,
) {
  return redirectResponse(
    `/warehouses/${warehouseId}?error=${encodeURIComponent(
      message,
    )}`,
  );
}

function normalizeCode(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  const { warehouseId } =
    await context.params;

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
      warehouseId,
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
    return redirectWithError(
      warehouseId,
      "You do not have permission to add warehouse areas.",
    );
  }

  const {
    data: warehouse,
    error: warehouseError,
  } = await supabase
    .from("warehouses")
    .select("id")
    .eq("id", warehouseId)
    .eq(
      "organization_id",
      membership.organization_id,
    )
    .maybeSingle();

  if (warehouseError) {
    return redirectWithError(
      warehouseId,
      warehouseError.message,
    );
  }

  if (!warehouse) {
    return redirectResponse("/warehouses");
  }

  const formData = await request.formData();

  const name = String(
    formData.get("name") ?? "",
  ).trim();

  if (name.length < 1 || name.length > 120) {
    return redirectWithError(
      warehouseId,
      "The area name must contain between 1 and 120 characters.",
    );
  }

  const purpose = String(
    formData.get("purpose") ?? "general",
  ).trim();

  if (!allowedPurposes.has(purpose)) {
    return redirectWithError(
      warehouseId,
      "Please select a valid operational purpose.",
    );
  }

  const locationKind = String(
    formData.get("locationKind") ?? "zone",
  ).trim();

  if (!allowedKinds.has(locationKind)) {
    return redirectWithError(
      warehouseId,
      "Please select a valid location type.",
    );
  }

  const suppliedCode = String(
    formData.get("code") ?? "",
  ).trim();

  let code =
    normalizeCode(suppliedCode) ||
    normalizeCode(name) ||
    "AREA";

  const {
    data: existingCode,
    error: codeError,
  } = await supabase
    .from("warehouse_locations")
    .select("id")
    .eq("warehouse_id", warehouseId)
    .eq("code", code)
    .limit(1)
    .maybeSingle();

  if (codeError) {
    return redirectWithError(
      warehouseId,
      codeError.message,
    );
  }

  if (existingCode) {
    const suffix = randomUUID()
      .replaceAll("-", "")
      .slice(0, 6)
      .toUpperCase();

    code = `${code.slice(0, 33)}-${suffix}`;
  }

  const descriptionValue = String(
    formData.get("description") ?? "",
  ).trim();

  const { error: insertError } =
    await supabase
      .from("warehouse_locations")
      .insert({
        organization_id:
          membership.organization_id,

        warehouse_id: warehouseId,
        name,
        code,
        location_kind: locationKind,
        purpose,

        description:
          descriptionValue.length > 0
            ? descriptionValue
            : null,

        sort_order:
          purposeOrder[purpose] ?? 100,

        is_active: true,
      });

  if (insertError) {
    return redirectWithError(
      warehouseId,
      insertError.message,
    );
  }

  return redirectResponse(
    `/warehouses/${warehouseId}?created=1`,
  );
}