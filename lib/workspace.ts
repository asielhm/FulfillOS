import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function getWorkspaceContext() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (authError || !userId) redirect("/auth/login");

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", String(userId))
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membershipError) throw new Error(membershipError.message);
  if (!membership) redirect("/onboarding");

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", membership.organization_id)
    .single();

  if (organizationError || !organization) {
    throw new Error(organizationError?.message ?? "Workspace could not be loaded.");
  }

  return {
    supabase,
    organization,
    membership,
    email: typeof authData.claims.email === "string" ? authData.claims.email : "Authenticated user",
  };
}
