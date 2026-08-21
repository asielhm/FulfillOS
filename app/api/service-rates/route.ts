import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { billingUnits } from "@/lib/revenue";
import { isUnsafeCrossSiteMutation } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const identifierPattern = /^[a-z][a-z0-9_]{1,79}$/;
const allowedCategories = new Set(["reception_storage", "labeling", "preparation", "inventory", "outbound", "special_jobs", "custom"]);
const allowedPricingModels = new Set(["flat", "volume_tier", "monthly_base"]);
const allowedUnits = new Set<string>(billingUnits);

type SubmittedRate = {
  key?: unknown;
  serviceCode?: unknown;
  name?: unknown;
  category?: unknown;
  description?: unknown;
  unit?: unknown;
  pricingModel?: unknown;
  price?: unknown;
  minimumQuantity?: unknown;
  maximumQuantity?: unknown;
  featured?: unknown;
};

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

  const parsed = parseRatePayload(String(formData.get("ratesJson") ?? ""));
  if ("error" in parsed) return redirectWithError(request, parsed.error);

  const { data, error } = await supabase.rpc("configure_organization_service_rates", {
    p_rates: parsed.rates,
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
  url.searchParams.set("archived", String(safeCount(result.archived_count)));
  return NextResponse.redirect(url, { status: 303 });
}

function parseRatePayload(raw: string): { rates: Array<Record<string, unknown>> } | { error: string } {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { error: "The price list is invalid. Reload the page and try again." };
  }

  if (!Array.isArray(value) || value.length < 1 || value.length > 100) {
    return { error: "Create between 1 and 100 pricing rules." };
  }

  const keys = new Set<string>();
  const rates: Array<Record<string, unknown>> = [];

  for (const [index, item] of value.entries()) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { error: `Pricing rule ${index + 1} is invalid.` };
    }

    const submitted = item as SubmittedRate;
    const rateKey = cleanIdentifier(submitted.key);
    const serviceCode = cleanIdentifier(submitted.serviceCode);
    const serviceName = cleanText(submitted.name);
    const category = cleanIdentifier(submitted.category);
    const description = cleanText(submitted.description);
    const unit = cleanIdentifier(submitted.unit);
    const pricingModel = cleanIdentifier(submitted.pricingModel);
    const unitPrice = numericValue(submitted.price);
    const minimumQuantity = nullableNumericValue(submitted.minimumQuantity);
    const maximumQuantity = nullableNumericValue(submitted.maximumQuantity);

    if (!identifierPattern.test(rateKey) || keys.has(rateKey)) {
      return { error: `Pricing rule ${index + 1} has an invalid or duplicated identifier.` };
    }
    if (!identifierPattern.test(serviceCode)) {
      return { error: `Choose a valid service name for pricing rule ${index + 1}.` };
    }
    if (serviceName.length < 2 || serviceName.length > 120) {
      return { error: `Service name ${index + 1} must contain between 2 and 120 characters.` };
    }
    if (description.length > 240) {
      return { error: `Description ${index + 1} cannot exceed 240 characters.` };
    }
    if (!allowedCategories.has(category)) {
      return { error: `Choose a valid category for ${serviceName}.` };
    }
    if (!allowedUnits.has(unit)) {
      return { error: `Choose a valid billing unit for ${serviceName}.` };
    }
    if (!allowedPricingModels.has(pricingModel)) {
      return { error: `Choose a valid pricing model for ${serviceName}.` };
    }
    if (unitPrice === null || unitPrice < 0 || unitPrice > 1_000_000) {
      return { error: `Enter a valid price between 0 and 1,000,000 for ${serviceName}.` };
    }
    if (minimumQuantity === "invalid" || maximumQuantity === "invalid") {
      return { error: `Enter valid volume limits for ${serviceName}.` };
    }
    if (pricingModel === "volume_tier" && minimumQuantity === null) {
      return { error: `Enter a minimum quantity for the ${serviceName} volume tier.` };
    }
    if (typeof minimumQuantity === "number" && typeof maximumQuantity === "number" && maximumQuantity < minimumQuantity) {
      return { error: `The maximum quantity for ${serviceName} cannot be below its minimum.` };
    }

    keys.add(rateKey);
    rates.push({
      rate_key: rateKey,
      service_code: serviceCode,
      service_name: serviceName,
      category,
      description: description || null,
      unit,
      pricing_model: pricingModel,
      unit_price: unitPrice,
      currency_code: "USD",
      minimum_quantity: pricingModel === "volume_tier" ? minimumQuantity : null,
      maximum_quantity: pricingModel === "volume_tier" ? maximumQuantity : null,
      is_featured: pricingModel === "volume_tier" && submitted.featured === true,
    });
  }

  for (let leftIndex = 0; leftIndex < rates.length; leftIndex += 1) {
    const left = rates[leftIndex];
    if (left.pricing_model !== "volume_tier") continue;
    for (let rightIndex = leftIndex + 1; rightIndex < rates.length; rightIndex += 1) {
      const right = rates[rightIndex];
      if (right.pricing_model !== "volume_tier" || right.service_code !== left.service_code || right.unit !== left.unit) continue;
      const leftMinimum = Number(left.minimum_quantity);
      const leftMaximum = left.maximum_quantity === null ? Number.POSITIVE_INFINITY : Number(left.maximum_quantity);
      const rightMinimum = Number(right.minimum_quantity);
      const rightMaximum = right.maximum_quantity === null ? Number.POSITIVE_INFINITY : Number(right.maximum_quantity);
      if (leftMinimum <= rightMaximum && rightMinimum <= leftMaximum) {
        return { error: `Volume tiers for ${String(left.service_name)} cannot overlap.` };
      }
      if (left.is_featured === true && right.is_featured === true) {
        return { error: `Choose only one most-common tier for ${String(left.service_name)}.` };
      }
    }
  }

  return { rates };
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanIdentifier(value: unknown) {
  return cleanText(value).toLowerCase();
}

function numericValue(value: unknown) {
  if ((typeof value !== "number" && typeof value !== "string") || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nullableNumericValue(value: unknown): number | null | "invalid" {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : "invalid";
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
