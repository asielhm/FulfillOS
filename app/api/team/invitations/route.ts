import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { type NextRequest } from "next/server";

export const runtime = "nodejs";

function redirect(path: string) { return new Response(null, { status: 303, headers: { Location: path, "Cache-Control": "no-store" } }); }

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return redirect("/auth/login");
  const { data: membership } = await supabase.from("organization_members").select("organization_id, role").eq("user_id", String(userId)).eq("status", "active").limit(1).maybeSingle();
  if (!membership || !["owner", "admin"].includes(membership.role)) return redirect("/team?error=Only%20owners%20and%20admins%20can%20invite%20personnel.");
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const displayName = String(form.get("displayName") ?? "").trim();
  const jobTitle = String(form.get("jobTitle") ?? "").trim();
  const role = String(form.get("role") ?? "operator");
  if (!/^\S+@\S+\.\S+$/.test(email) || displayName.length < 2 || !["admin", "manager", "operator", "viewer"].includes(role)) return redirect("/team?error=Check%20the%20name,%20email%20and%20role.");
  const token = randomBytes(32).toString("hex");
  const { error } = await supabase.from("organization_invitations").insert({ organization_id: membership.organization_id, email, display_name: displayName, job_title: jobTitle || null, role, token, invited_by: userId });
  if (error) return redirect(`/team?error=${encodeURIComponent(error.message)}`);
  return redirect("/team?saved=1");
}
