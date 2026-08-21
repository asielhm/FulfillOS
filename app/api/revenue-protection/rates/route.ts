import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { isUnsafeCrossSiteMutation } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const serviceCodePattern = /^[a-z][a-z0-9_]{1,79}$/;
const unitPattern = /^[a-z][a-z0-9_]{0,39}$/;
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
    return redirectWithError(request, "The rate request is invalid.");
  }

  const customerId = String(formData.get("customerId") ?? "").trim();
  const serviceCode = String(formData.get("serviceCode") ?? "").trim().toLowerCase();
  const unit = String(formData.get("unit") ?? "").trim().toLowerCase();
  const rawPrice = String(formData.get("unitPrice") ?? "").trim();
  const currencyCode = String(formData.get("currencyCode") ?? "USD").trim().toUpperCase();

  if (!isUuid(customerId)) {
    return redirectWithError(request, "Choose a valid customer.");
  }
  if (!serviceCodePattern.test(serviceCode)) {
    return redirectWithError(request, "Choose a valid service.");
  }
  if (!unitPattern.test(unit)) {
    return redirectWithError(request, "Choose a valid billing unit.");
  }
  if (!pricePattern.test(rawPrice)) {
    return redirectWithError(request, "Enter a valid unit price with up to four decimals.");
  }

  const unitPrice = Number(rawPrice);
  if (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 1_000_000) {
    return redirectWithError(request, "Unit price must be between 0 and 1,000,000.");
  }
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    return redirectWithError(request, "Choose a valid currency.");
  }

  const { data, error } = await supabase.rpc("configure_customer_service_rate", {
    p_customer_id: customerId,
    p_service_code: serviceCode,
    p_unit: unit,
    p_unit_price: unitPrice,
    p_currency_code: currencyCode,
  });

  if (error) {
    console.error("Revenue Protection rate configuration failed", error);
    return redirectWithError(
      request,
      "The rate could not be saved. Check your billing access and try again.",
    );
  }

  const result = asRecord(data);
  const eventsPriced = safeCount(result.events_priced);
  const exceptionsResolved = safeCount(result.exceptions_resolved);
  const revenueCaptured = safeAmount(result.revenue_captured);

  revalidatePath("/revenue-protection");
  revalidatePath("/service-rates");
  revalidatePath("/control-tower");

  const url = new URL("/service-rates", request.url);
  url.searchParams.set("saved", "1");
  url.searchParams.set("scope", "customer");
  url.searchParams.set("events", String(eventsPriced));
  url.searchParams.set("exceptions", String(exceptionsResolved));
  url.searchParams.set("value", revenueCaptured.toFixed(2));
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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

function safeAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}
