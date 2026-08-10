import { createClient } from "@/lib/supabase/server";
import { type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedConditions = new Set([
  "new",
  "used_like_new",
  "used_very_good",
  "used_good",
  "used_acceptable",
  "refurbished",
  "other",
]);

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
    `/products/new?error=${encodeURIComponent(
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

  return value.length > 0
    ? value
    : null;
}

function optionalUppercaseText(
  formData: FormData,
  field: string,
) {
  const value = String(
    formData.get(field) ?? "",
  )
    .trim()
    .toUpperCase();

  return value.length > 0
    ? value
    : null;
}

function optionalNumber(
  formData: FormData,
  field: string,
) {
  const rawValue = String(
    formData.get(field) ?? "",
  ).trim();

  if (!rawValue) {
    return {
      value: null,
      valid: true,
    };
  }

  const value = Number(rawValue);

  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    return {
      value: null,
      valid: false,
    };
  }

  return {
    value,
    valid: true,
  };
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
      "/products?error=You do not have permission to add products.",
    );
  }

  const formData = await request.formData();

  const customerId = String(
    formData.get("customerId") ?? "",
  ).trim();

  const title = String(
    formData.get("title") ?? "",
  ).trim();

  const sku = String(
    formData.get("sku") ?? "",
  ).trim();

  if (!customerId) {
    return redirectWithError(
      "Please select a customer.",
    );
  }

  if (
    title.length < 2 ||
    title.length > 250
  ) {
    return redirectWithError(
      "The product name must contain between 2 and 250 characters.",
    );
  }

  if (
    sku.length < 1 ||
    sku.length > 80
  ) {
    return redirectWithError(
      "The SKU must contain between 1 and 80 characters.",
    );
  }

  const {
    data: customer,
    error: customerError,
  } = await supabase
    .from("customers")
    .select("id, status")
    .eq("id", customerId)
    .eq(
      "organization_id",
      membership.organization_id,
    )
    .maybeSingle();

  if (customerError) {
    return redirectWithError(
      customerError.message,
    );
  }

  if (!customer) {
    return redirectWithError(
      "The selected customer could not be found.",
    );
  }

  if (customer.status !== "active") {
    return redirectWithError(
      "Products can only be added to active customers.",
    );
  }

  const condition = String(
    formData.get("condition") ?? "new",
  ).trim();

  if (!allowedConditions.has(condition)) {
    return redirectWithError(
      "Please select a valid product condition.",
    );
  }

  const [
    lengthResult,
    widthResult,
    heightResult,
    weightResult,
  ] = [
    optionalNumber(
      formData,
      "lengthIn",
    ),

    optionalNumber(
      formData,
      "widthIn",
    ),

    optionalNumber(
      formData,
      "heightIn",
    ),

    optionalNumber(
      formData,
      "weightLb",
    ),
  ];

  if (
    !lengthResult.valid ||
    !widthResult.valid ||
    !heightResult.valid ||
    !weightResult.valid
  ) {
    return redirectWithError(
      "Dimensions and weight must be positive numbers.",
    );
  }

  const {
    data: duplicateSku,
    error: duplicateError,
  } = await supabase
    .from("products")
    .select("id")
    .eq("customer_id", customerId)
    .eq("sku", sku)
    .limit(1)
    .maybeSingle();

  if (duplicateError) {
    return redirectWithError(
      duplicateError.message,
    );
  }

  if (duplicateSku) {
    return redirectWithError(
      `SKU "${sku}" already exists for this customer.`,
    );
  }

  const {
    data: product,
    error: insertError,
  } = await supabase
    .from("products")
    .insert({
      organization_id:
        membership.organization_id,

      customer_id:
        customerId,

      sku,
      title,

      asin: optionalUppercaseText(
        formData,
        "asin",
      ),

      fnsku: optionalUppercaseText(
        formData,
        "fnsku",
      ),

      barcode: optionalText(
        formData,
        "barcode",
      ),

      condition,

      status: "active",

      length_in:
        lengthResult.value,

      width_in:
        widthResult.value,

      height_in:
        heightResult.value,

      weight_lb:
        weightResult.value,

      prep_notes: optionalText(
        formData,
        "prepNotes",
      ),
    })
    .select("id")
    .single();

  if (
    insertError ||
    !product
  ) {
    return redirectWithError(
      insertError?.message ??
        "The product could not be created.",
    );
  }

  return redirectResponse(
    `/products/${product.id}?created=1`,
  );
}