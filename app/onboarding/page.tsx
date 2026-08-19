import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { trialFromClaims } from "@/lib/plans";

type OnboardingPageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

export default function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  return (
    <Suspense fallback={<OnboardingLoading />}>
      <OnboardingContent searchParams={searchParams} />
    </Suspense>
  );
}

async function OnboardingContent({
  searchParams,
}: OnboardingPageProps) {
  const parameters = await searchParams;

  const errorMessage = Array.isArray(parameters.error)
    ? parameters.error[0]
    : parameters.error;

  const supabase = await createClient();

  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getClaims();

  const userId = authData?.claims?.sub;

  if (authError || !userId) {
    redirect("/auth/login");
  }

  const metadata = authData.claims.user_metadata as { invite_token?: unknown } | undefined;
  const inviteToken = typeof metadata?.invite_token === "string" ? metadata.invite_token : null;
  if (inviteToken) {
    const { data: accepted, error: invitationError } = await supabase.rpc("accept_team_invitation", { p_token: inviteToken });
    if (invitationError) throw new Error(`The team invitation could not be accepted: ${invitationError.message}`);
    if (accepted) redirect("/dashboard");
  }

  const {
    data: existingMembership,
    error: membershipError,
  } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", String(userId))
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error(
      `The workspace membership could not be checked: ${membershipError.message}`,
    );
  }

  /*
   * A user who already belongs to an organization
   * should never see the onboarding form again.
   */
  if (existingMembership) {
    redirect("/dashboard");
  }
  const trial = trialFromClaims(authData.claims);

  return (
    <main className="min-h-screen bg-[#f5f7fa] px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f59e0b] text-xl font-black text-[#162033]">
            F
          </div>

          <div>
            <p className="text-xl font-bold text-[#162033]">
              FulfillOS
            </p>

            <p className="text-sm text-slate-500">
              Workspace setup
            </p>
          </div>
        </header>

        <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-[0.9fr_1.1fr]">
          <section className="bg-[#162033] p-8 text-white sm:p-12">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#fdba2d]">
              Welcome to FulfillOS
            </p>

            <h1 className="mt-5 text-4xl font-extrabold tracking-tight">
              Create your first company workspace
            </h1>

            <p className="mt-5 leading-7 text-slate-300">
              Each company has its own employees, customers,
              inventory, warehouse locations and operational
              records.
            </p>

            <div className="mt-10 space-y-4 text-sm text-slate-200">
              <Feature text="Secure company data separation" />
              <Feature text="Configurable employees and permissions" />
              <Feature text="Warehouse and inventory management" />
              <Feature text="Customer portal ready" />
            </div>
          </section>

          <section className="p-8 sm:p-12">
            <div className="mb-8">
              <p className="text-sm font-bold text-[#c7511f]">
                STEP 1 OF 4
              </p>

              <h2 className="mt-2 text-3xl font-extrabold text-[#162033]">
                Company information
              </h2>

              <p className="mt-3 text-slate-600">
                This information can be modified later from
                your workspace settings.
              </p>
              {trial?.active && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>30-day Control trial active.</strong> No credit card required · {trial.daysRemaining} days remaining.</div>}
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
              >
                {errorMessage}
              </div>
            )}

            <form
              action="/api/onboarding"
              method="post"
            >
              <div>
                <label
                  htmlFor="organizationName"
                  className="block text-sm font-bold text-[#162033]"
                >
                  Company name
                </label>

                <input
                  id="organizationName"
                  name="organizationName"
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="organization"
                  placeholder="Example: Treemoon Prep"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#111827] outline-none transition focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
                />

                <p className="mt-2 text-sm text-slate-500">
                  Use the real commercial name of the company.
                </p>
              </div>

              <button
                type="submit"
                className="mt-8 w-full rounded-xl bg-[#f59e0b] px-6 py-4 font-bold text-[#162033] transition hover:bg-[#fdba2d]"
              >
                Create workspace
              </button>
            </form>

            <p className="mt-6 text-center text-xs leading-5 text-slate-500">
              You will become the owner of this workspace and
              can invite other employees later.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

function OnboardingLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-6">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-xl bg-[#f59e0b] text-2xl font-black text-[#162033]">
          F
        </div>

        <p className="mt-5 font-bold text-[#162033]">
          Loading workspace setup...
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Verifying your account and organization.
        </p>
      </div>
    </main>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#067d62] text-xs font-bold">
        ✓
      </span>

      <span>{text}</span>
    </div>
  );
}
