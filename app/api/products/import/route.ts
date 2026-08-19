import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const conditions = new Set(["new", "used_like_new", "used_very_good", "used_good", "used_acceptable", "refurbished", "other"]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: membership } = await supabase.from("organization_members").select("organization_id, role").eq("user_id", String(userId)).eq("status", "active").limit(1).maybeSingle();
  if (!membership || !["owner", "admin", "manager"].includes(membership.role)) return NextResponse.json({ error: "You do not have permission to import products." }, { status: 403 });

  const body = await request.json().catch(() => null) as { customerId?: unknown; products?: unknown } | null;
  if (!body || typeof body.customerId !== "string" || !Array.isArray(body.products) || body.products.length < 1 || body.products.length > 500) return NextResponse.json({ error: "Select a customer and import between 1 and 500 products." }, { status: 400 });
  const { data: customer } = await supabase.from("customers").select("id").eq("id", body.customerId).eq("organization_id", membership.organization_id).eq("status", "active").maybeSingle();
  if (!customer) return NextResponse.json({ error: "The selected active customer was not found." }, { status: 400 });

  const normalized: Array<Record<string, string | number | null>> = [];
  const incomingSkus = new Set<string>();
  for (let index = 0; index < body.products.length; index++) {
    const source = body.products[index];
    if (!source || typeof source !== "object") return NextResponse.json({ error: `Row ${index + 2} is invalid.` }, { status: 400 });
    const record = source as Record<string, unknown>;
    const sku = clean(record.sku, 80); const title = clean(record.title, 250);
    if (!sku || !title) return NextResponse.json({ error: `Row ${index + 2} needs both SKU and Product name.` }, { status: 400 });
    const skuKey = sku.toLowerCase();
    if (incomingSkus.has(skuKey)) return NextResponse.json({ error: `SKU "${sku}" appears more than once in the file.` }, { status: 400 });
    incomingSkus.add(skuKey);
    const condition = clean(record.condition, 40)?.toLowerCase().replace(/[\s-]+/g, "_") ?? "new";
    if (!conditions.has(condition)) return NextResponse.json({ error: `Row ${index + 2} has an unsupported condition.` }, { status: 400 });
    const numbers = [numberOrNull(record.length_in), numberOrNull(record.width_in), numberOrNull(record.height_in), numberOrNull(record.weight_lb)];
    if (numbers.some((value) => value === "invalid")) return NextResponse.json({ error: `Row ${index + 2} has an invalid dimension or weight.` }, { status: 400 });
    normalized.push({ organization_id: membership.organization_id, customer_id: customer.id, sku, title, asin: upper(record.asin, 30), fnsku: upper(record.fnsku, 50), barcode: clean(record.barcode, 100), condition, status: "active", length_in: numbers[0] as number | null, width_in: numbers[1] as number | null, height_in: numbers[2] as number | null, weight_lb: numbers[3] as number | null, prep_notes: clean(record.prep_notes, 3000) });
  }

  const { data: existing, error: lookupError } = await supabase.from("products").select("sku").eq("customer_id", customer.id).in("sku", normalized.map((product) => String(product.sku)));
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
  if (existing?.length) return NextResponse.json({ error: `These SKUs already exist for this customer: ${existing.slice(0, 8).map((item) => item.sku).join(", ")}` }, { status: 409 });
  const { error } = await supabase.from("products").insert(normalized);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ created: normalized.length });
}

function clean(value: unknown, max: number) { const result = typeof value === "string" ? value.trim() : ""; return result ? result.slice(0, max) : null; }
function upper(value: unknown, max: number) { return clean(value, max)?.toUpperCase() ?? null; }
function numberOrNull(value: unknown): number | null | "invalid" { if (value === "" || value === null || value === undefined) return null; const result = Number(value); return Number.isFinite(result) && result >= 0 ? result : "invalid"; }
