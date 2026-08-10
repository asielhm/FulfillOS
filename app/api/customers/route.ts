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
    `/customers/new?error=${encodeURIComponent(
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
      "/customers?error=You do not have permission to add customers.",
    );
  }

  const formData = await request.formData();

  const companyName = String(
    formData.get("companyName") ?? "",
  ).trim();

  if (
    companyName.length < 2 ||
    companyName.length > 150
  ) {
    return redirectWithError(
      "The company name must contain between 2 and 150 characters.",
    );
  }

  const contactEmail = optionalText(
    formData,
    "contactEmail",
  );

  if (
    contactEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      contactEmail,
    )
  ) {
    return redirectWithError(
      "Please enter a valid email address.",
    );
  }

  let referenceCode =
    normalizeCode(companyName) ||
    "CUSTOMER";

  const {
    data: existingCode,
    error: codeCheckError,
  } = await supabase
    .from("customers")
    .select("id")
    .eq(
      "organization_id",
      membership.organization_id,
    )
    .eq(
      "reference_code",
      referenceCode,
    )
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
      .slice(0, 5)
      .toUpperCase();

    referenceCode =
      `${referenceCode.slice(
        0,
        24,
      )}-${suffix}`;
  }

  const countryCode = String(
    formData.get("countryCode") ?? "US",
  )
    .trim()
    .toUpperCase();

  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return redirectWithError(
      "Please select a valid country.",
    );
  }

  const {
    data: createdCustomer,
    error: insertError,
  } = await supabase
    .from("customers")
    .insert({
      organization_id:
        membership.organization_id,

      company_name: companyName,

      reference_code:
        referenceCode,

      contact_name: optionalText(
        formData,
        "contactName",
      ),

      contact_email:
        contactEmail,

      contact_phone: optionalText(
        formData,
        "contactPhone",
      ),

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

      country_code:
        countryCode,

      status: "active",

      notes: optionalText(
        formData,
        "notes",
      ),
    })
    .select("id")
    .single();

  if (
    insertError ||
    !createdCustomer
  ) {
    return redirectWithError(
      insertError?.message ??
        "The customer could not be created.",
    );
  }

  return redirectResponse(
    `/customers/${createdCustomer.id}?created=1`,
  );
}