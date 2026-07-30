import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function ProtectedPage() {
  const supabase = await createClient();

  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getClaims();

  if (
    authError ||
    !authData?.claims ||
    !authData.claims.sub
  ) {
    redirect("/auth/login");
  }

  const userId = String(authData.claims.sub);

  const {
    data: membership,
  } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membership) {
    redirect("/dashboard");
  }

  redirect("/onboarding");
}