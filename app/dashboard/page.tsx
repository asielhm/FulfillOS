import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

const dashboardCards = [
  {
    label: "Inbound shipments",
    value: "0",
    detail: "No shipments expected",
  },
  {
    label: "Active work orders",
    value: "0",
    detail: "No work currently queued",
  },
  {
    label: "Units in inventory",
    value: "0",
    detail: "Inventory module ready",
  },
  {
    label: "Outbound shipments",
    value: "0",
    detail: "No shipments pending",
  },
];

export default async function DashboardPage() {
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
    error: membershipError,
  } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (!membership) {
    redirect("/onboarding");
  }

  const {
    data: organization,
    error: organizationError,
  } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", membership.organization_id)
    .single();

  if (organizationError || !organization) {
    throw new Error(
      organizationError?.message ??
        "The organization could not be loaded.",
    );
  }

  const email =
    typeof authData.claims.email === "string"
      ? authData.claims.email
      : "Authenticated user";

  return (
    <main className="min-h-screen bg-[#f5f7fa] text-[#111827]">
      <header className="border-b border-white/10 bg-[#162033] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f59e0b] text-lg font-black text-[#162033]">
              F
            </div>

            <div>
              <p className="font-bold">FulfillOS</p>
              <p className="text-xs text-slate-300">
                {organization.name}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">
                {email}
              </p>

              <p className="text-xs capitalize text-slate-300">
                {membership.role}
              </p>
            </div>

            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-slate-500 px-4 py-2 text-sm font-semibold transition hover:border-white hover:bg-white/10"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden min-h-[calc(100vh-73px)] w-64 border-r border-slate-200 bg-white p-5 lg:block">
          <nav className="space-y-2">
            <NavigationItem
              label="Dashboard"
              href="/dashboard"
              active
            />

            <NavigationItem
              label="Inbound"
              href="/dashboard"
            />

            <NavigationItem
              label="Work orders"
              href="/dashboard"
            />

            <NavigationItem
              label="Inventory"
              href="/dashboard"
            />

            <NavigationItem
              label="Outbound"
              href="/dashboard"
            />

            <NavigationItem
              label="Customers"
              href="/dashboard"
            />

            <NavigationItem
              label="Settings"
              href="/dashboard"
            />
          </nav>
        </aside>

        <section className="min-w-0 flex-1 px-5 py-8 sm:px-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#c7511f]">
                Operations overview
              </p>

              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#162033] sm:text-4xl">
                Welcome to {organization.name}
              </h1>

              <p className="mt-3 text-slate-600">
                Your workspace has been created successfully.
              </p>
            </div>

            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-[#067d62]">
              Workspace active
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {dashboardCards.map((card) => (
              <article
                key={card.label}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <p className="text-sm font-semibold text-slate-500">
                  {card.label}
                </p>

                <p className="mt-3 text-4xl font-black text-[#162033]">
                  {card.value}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  {card.detail}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#162033]">
                    Recent activity
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Operational changes will appear here.
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                <p className="font-bold text-[#162033]">
                  No activity yet
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  The first receiving, customer or work order
                  will appear in this section.
                </p>
              </div>
            </section>

            <aside className="rounded-2xl bg-[#243247] p-6 text-white shadow-sm">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#fdba2d]">
                Workspace details
              </p>

              <dl className="mt-6 space-y-5">
                <Detail
                  label="Company"
                  value={organization.name}
                />

                <Detail
                  label="Workspace ID"
                  value={organization.slug}
                />

                <Detail
                  label="Your role"
                  value={membership.role}
                />

                <Detail
                  label="Plan"
                  value="Development"
                />
              </dl>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function NavigationItem({
  label,
  href,
  active = false,
}: {
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "block rounded-xl bg-[#162033] px-4 py-3 text-sm font-bold text-white"
          : "block rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-[#162033]"
      }
    >
      {label}
    </Link>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </dt>

      <dd className="mt-1 capitalize font-semibold">
        {value}
      </dd>
    </div>
  );
}