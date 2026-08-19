import { createClient } from "@/lib/supabase/server";
import { type NextRequest } from "next/server";

function redirectResponse(path: string) {
  return new Response(null, { status: 303, headers: { Location: path, "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;
  if (authError || !userId) return redirectResponse("/auth/login");

  const { data: membership, error: membershipError } = await supabase.from("organization_members").select("organization_id, role").eq("user_id", String(userId)).eq("status", "active").limit(1).maybeSingle();
  if (membershipError || !membership) return redirectResponse("/onboarding");
  if (!["owner", "admin"].includes(membership.role)) return redirectResponse("/settings?error=You%20do%20not%20have%20permission%20to%20update%20workspace%20settings.");

  const formData = await request.formData();
  const organizationName = String(formData.get("organizationName") ?? "").trim();
  if (organizationName.length < 2 || organizationName.length > 120) return redirectResponse("/settings?error=The%20company%20name%20must%20contain%20between%202%20and%20120%20characters.");

  const { error } = await supabase.from("organizations").update({ name: organizationName }).eq("id", membership.organization_id);
  if (error) return redirectResponse(`/settings?error=${encodeURIComponent(error.message)}`);
  return redirectResponse("/settings?saved=1");
}
