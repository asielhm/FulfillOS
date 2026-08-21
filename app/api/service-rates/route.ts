import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { organizationRateTemplate } from "@/lib/revenue";
import { isUnsafeCrossSiteMutation } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pricePattern = /^\d{1,7}(?:\.\d{1,4})?$/;

export async function POST(request: NextRequest) {
  if (isUnsafeCrossSiteMutation(request)) {
    return NextResponse.json({ error: "Cross-site requests are not allowed." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();

  if (authError || !authData?.claims?.sub) {
    return redirectTo(request, "/auth/login");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return redirectWithError(request, "The service rate request is invalid.");
  }

  const rates = [];
  for (const definition of organizationRateTemplate) {
    const rawPrice = String(formData.get(`price-${definition.key}`) ?? "").trim();
    if (!pricePattern.test(rawPrice)) {
      return redirectWithError(request, `Enter a valid price for ${definition.name.en}.`);
    }

    const unitPrice = Number(rawPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 1_000_000) {
      return redirectWithError(request, `The price for ${definition.name.en} must be between 0 and 1,000,000.`);
    }

    rates.push({
      service_code: definition.serviceCode,
      service_name: definition.name.en,
      category: definition.category,
      description: definition.description.en,
      unit: definition.unit,
      pricing_model: definition.pricingModel,
      unit_price: unitPrice,
      currency_code: "USD",
      minimum_quantity: definition.minimumQuantity,
      maximum_quantity: definition.maximumQuantity,
      is_featured: definition.featured,
    });
  }

  const { data, error } = await supabase.rpc("configure_organization_service_rates", {
    p_rates: rates,
  });

  if (error) {
    console.error("Organization service rate configuration failed", error);
    return redirectWithError(request, "The service rate card could not be saved. Check your billing access and try again.");
  }

  const result = asRecord(data);
  revalidatePath("/service-rates");
  revalidatePath("/revenue-protection");
  revalidatePath("/control-tower");

  const url = new URL("/service-rates", request.url);
  url.searchParams.set("saved", "1");
  url.searchParams.set("scope", "organization");
  url.searchParams.set("updated", String(safeCount(result.saved_count)));
  url.searchParams.set("unchanged", String(safeCount(result.unchanged_count)));
  return NextResponse.redirect(url, { status: 303 });
}

function redirectWithError(request: NextRequest, message: string) {
  const url = new URL("/service-rates", request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url, { status: 303 });
}

function redirectTo(request: NextRequest, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url), { status: 303 });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function safeCount(value: unknown) {
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 ? count : 0;
}
