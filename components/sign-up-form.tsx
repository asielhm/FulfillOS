"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { plans, type PlanId } from "@/lib/plans";
import { GoogleIcon } from "@/components/google-icon";

export function SignUpForm({
  className,
  initialPlan = "undecided",
  inviteToken,
  invitedEmail,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { initialPlan?: PlanId | "undecided"; inviteToken?: string; invitedEmail?: string }) {
  const [email, setEmail] = useState(invitedEmail ?? "");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | "undecided">(initialPlan);
  const router = useRouter();

  const handleGoogleSignUp = async () => {
    const supabase = createClient();
    setIsGoogleLoading(true);
    setError(null);
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", "/onboarding");
    callback.searchParams.set("mode", "signup");
    callback.searchParams.set("plan", selectedPlan);
    if (inviteToken) callback.searchParams.set("invite", inviteToken);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString() },
    });
    if (oauthError) {
      setError(oauthError.message);
      setIsGoogleLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const trialStartedAt = new Date();
      const trialExpiresAt = new Date(trialStartedAt.getTime() + 30 * 86_400_000);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/protected`,
          data: {
            selected_plan: selectedPlan === "undecided" ? "starter" : selectedPlan,
            preferred_plan: selectedPlan,
            trial_plan: "control",
            trial_started_at: trialStartedAt.toISOString(),
            trial_expires_at: trialExpiresAt.toISOString(),
            invite_token: inviteToken ?? null,
            display_name: displayName,
          },
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-0 bg-white shadow-2xl shadow-slate-950/20 lg:border lg:border-slate-200 lg:shadow-xl">
        <CardHeader className="space-y-2 pb-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#c7511f]">{inviteToken ? "Team invitation" : "Start free"}</p>
          <CardTitle className="text-3xl font-black tracking-tight text-[#162033]">{inviteToken ? "Join your team" : "Create your workspace"}</CardTitle>
          <CardDescription className="text-slate-600">
            {inviteToken ? "Create your secure employee account to join the warehouse workspace." : "Get 30 days of Control access. No credit card required."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!inviteToken && <div className="mb-6 grid gap-2 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <Label htmlFor="selected-plan">Plan after your trial <span className="font-normal text-slate-500">(optional)</span></Label>
            <select id="selected-plan" value={selectedPlan} onChange={(event) => setSelectedPlan(event.target.value as PlanId | "undecided")} className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-[#162033] focus:outline-none focus:ring-2 focus:ring-[#f59e0b]">
              <option value="undecided">Not sure yet — help me decide</option>
              {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · ${plan.price}/month</option>)}
            </select>
            <p className="text-xs leading-5 text-slate-500">This does not commit you to a purchase. Every trial starts with temporary Control access.</p>
            <Link href="/#pricing" className="text-xs font-bold text-[#067d62] hover:underline">Compare plans</Link>
          </div>}
          <Button type="button" variant="outline" className="h-11 w-full border-slate-300 bg-white font-semibold text-slate-800 hover:bg-slate-50" disabled={isLoading || isGoogleLoading} onClick={handleGoogleSignUp}>
            <GoogleIcon />
            {isGoogleLoading ? "Connecting to Google..." : inviteToken ? "Join with Google" : "Continue with Google"}
          </Button>
          <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200" />or continue with email<span className="h-px flex-1 bg-slate-200" /></div>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="display-name">Full name</Label>
                <Input id="display-name" autoComplete="name" required minLength={2} maxLength={100} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Alex Morgan" className="h-11 border-slate-300 focus-visible:ring-[#f59e0b]" />
                <p className="text-xs text-slate-500">Used in Proof of Work and operational timelines.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sign-up-email">Work email</Label>
                <Input
                  id="sign-up-email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  className="h-11 border-slate-300 focus-visible:ring-[#f59e0b]"
                  required
                  readOnly={Boolean(invitedEmail)}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="sign-up-password">Password</Label>
                </div>
                <Input
                  id="sign-up-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  className="h-11 border-slate-300 focus-visible:ring-[#f59e0b]"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">Confirm password</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  className="h-11 border-slate-300 focus-visible:ring-[#f59e0b]"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
              <p className="-mt-3 text-xs text-slate-500">Use at least 8 characters.</p>
              {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <Button type="submit" className="h-11 w-full bg-[#f59e0b] font-bold text-[#162033] shadow-sm hover:bg-[#fdba2d]" disabled={isLoading || isGoogleLoading}>
                {isLoading ? "Creating your account..." : inviteToken ? "Accept invitation" : "Create workspace"}
              </Button>
            </div>
            <p className="mt-4 text-center text-xs leading-5 text-slate-500">
              By continuing, you agree to use FulfillOS for legitimate warehouse operations.
            </p>
            <div className="mt-5 text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link href="/auth/login" className="font-bold text-[#067d62] underline-offset-4 hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
