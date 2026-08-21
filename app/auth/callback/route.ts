import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import { isPlanId } from "@/lib/plans";
import { safeInternalPath } from "@/lib/security";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requestedPath = request.nextUrl.searchParams.get("next") ?? "/dashboard";
  const mode = request.nextUrl.searchParams.get("mode");
  const requestedPlan = request.nextUrl.searchParams.get("plan");
  const inviteToken = request.nextUrl.searchParams.get("invite");
  const nextPath = safeInternalPath(requestedPath);

  if (!code) {
    return NextResponse.redirect(
      new URL("/auth/login?error=Google%20did%20not%20return%20an%20authorization%20code.", request.url),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth code exchange failed", error);
    return NextResponse.redirect(
      new URL("/auth/login?error=Google%20sign-in%20could%20not%20be%20completed.", request.url),
    );
  }

  if (mode === "signup") {
    const trialStartedAt = new Date();
    const trialExpiresAt = new Date(trialStartedAt.getTime() + 30 * 86_400_000);
    const preferredPlan = isPlanId(requestedPlan) ? requestedPlan : "undecided";
    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        selected_plan: preferredPlan === "undecided" ? "starter" : preferredPlan,
        preferred_plan: preferredPlan,
        trial_plan: "control",
        trial_started_at: trialStartedAt.toISOString(),
        trial_expires_at: trialExpiresAt.toISOString(),
        invite_token: inviteToken ?? null,
      },
    });
    if (metadataError) {
      console.error("OAuth signup metadata update failed", metadataError);
      return NextResponse.redirect(new URL("/auth/login?error=Your%20account%20could%20not%20be%20prepared.", request.url));
    }
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
