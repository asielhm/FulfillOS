import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient(); const { data: auth } = await supabase.auth.getClaims(); const userId = auth?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: membership } = await supabase.from("organization_members").select("organization_id").eq("user_id", String(userId)).eq("status", "active").limit(1).maybeSingle();
  if (!membership) return NextResponse.json({ error: "Workspace required." }, { status: 403 });
  const code = new URL(request.url).searchParams.get("code")?.trim().replace(/[,%()]/g, " ");
  if (!code) return NextResponse.json({ found: false });
  const lookups = await Promise.all(["sku", "barcode", "asin", "fnsku"].map((field) => supabase.from("products").select("id, customer_id, sku, title, barcode, asin, fnsku").eq("organization_id", membership.organization_id).eq(field, code).limit(1).maybeSingle()));
  const failed = lookups.find((result) => result.error);
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });
  const product = lookups.find((result) => result.data)?.data;
  if (!product) return NextResponse.json({ found: false });
  const { data: customer } = await supabase.from("customers").select("company_name").eq("id", product.customer_id).eq("organization_id", membership.organization_id).maybeSingle();
  return NextResponse.json({ found: true, product: { ...product, customer: customer?.company_name ?? "Customer" } });
}
