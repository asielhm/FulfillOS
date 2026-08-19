import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { trialFromClaims } from "@/lib/plans";
import { signOut } from "./actions";

const operationCards = [
  {
    icon: "📥",
    label: "Inbound shipments",
    value: "0",
    detail: "No shipments expected",
  },
  {
    icon: "🛠️",
    label: "Active work orders",
    value: "0",
    detail: "No work currently queued",
  },
  {
    icon: "📦",
    label: "Units in inventory",
    value: "0",
    detail: "No inventory recorded yet",
  },
  {
    icon: "🚚",
    label: "Outbound shipments",
    value: "0",
    detail: "No shipments pending",
  },
];

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const supabase = await createClient();

  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getClaims();

  const userId = authData?.claims?.sub;

  if (authError || !userId) {
    redirect("/auth/login");
  }

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", String(userId))
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error(
      `Your workspace could not be loaded: ${membershipError.message}`,
    );
  }

  if (!membership) {
    redirect("/onboarding");
  }

  const [
    organizationResult,
    warehouseCountResult,
    warehousesResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("id", membership.organization_id)
      .single(),

    supabase
      .from("warehouses")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "organization_id",
        membership.organization_id,
      )
      .eq("is_active", true),

    supabase
      .from("warehouses")
      .select(
        `
          id,
          name,
          code,
          city,
          state_region,
          is_primary,
          is_active
        `,
      )
      .eq(
        "organization_id",
        membership.organization_id,
      )
      .eq("is_active", true)
      .order("is_primary", {
        ascending: false,
      })
      .order("name", {
        ascending: true,
      })
      .limit(3),
  ]);

  if (
    organizationResult.error ||
    !organizationResult.data
  ) {
    throw new Error(
      organizationResult.error?.message ??
        "The organization could not be loaded.",
    );
  }

  if (warehouseCountResult.error) {
    throw new Error(
      `Warehouses could not be counted: ${warehouseCountResult.error.message}`,
    );
  }

  if (warehousesResult.error) {
    throw new Error(
      `Warehouses could not be loaded: ${warehousesResult.error.message}`,
    );
  }

  const organization =
    organizationResult.data;

  const warehouses =
    warehousesResult.data ?? [];

  const warehouseCount =
    warehouseCountResult.count ?? 0;

  const hasWarehouse =
    warehouseCount > 0;

  const completedSetupSteps =
    1 + (hasWarehouse ? 1 : 0);

  const totalSetupSteps = 5;

  const setupProgress = Math.round(
    (completedSetupSteps /
      totalSetupSteps) *
      100,
  );

  const email =
    typeof authData.claims.email === "string"
      ? authData.claims.email
      : "Authenticated user";
  const trial = trialFromClaims(authData.claims);

  return (
    <main className="min-h-screen bg-[#f5f7fa] text-[#111827]">
      {/* Top header */}

      <header className="border-b border-white/10 bg-[#162033] text-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f59e0b] text-xl font-black text-[#162033]">
              F
            </div>

            <div className="min-w-0">
              <p className="font-extrabold">
                FulfillOS
              </p>

              <p className="truncate text-xs text-slate-300">
                {organization.name}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden text-right md:block">
              <p className="max-w-60 truncate text-sm font-semibold">
                {email}
              </p>

              <p className="text-xs capitalize text-slate-300">
                {membership.role}
              </p>
            </div>

            <form action={signOut}>
              <button
                type="submit"
                className="rounded-xl border border-slate-500 px-4 py-2 text-sm font-semibold transition hover:border-white hover:bg-white/10"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Mobile navigation */}

      <div className="border-b border-slate-200 bg-white lg:hidden">
        <div className="flex gap-2 overflow-x-auto px-4 py-3">
          <MobileNavItem
            label="Overview"
            href="/dashboard"
            active
          />

          <MobileNavItem
            label="Inbound"
            href="/inbound"
          />

          <MobileNavItem
            label="Customers"
            href="/customers"
          />

          <MobileNavItem label="Products" href="/products" />

          <MobileNavItem
            label="Inventory"
            href="/inventory"
          />
        </div>
      </div>

      <div className="mx-auto flex max-w-[1600px]">
        {/* Desktop sidebar */}

        <aside className="hidden min-h-[calc(100vh-76px)] w-64 shrink-0 border-r border-slate-200 bg-white p-5 lg:block">
          <div className="sticky top-5">
            <nav>
              <p className="mb-3 px-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Operations
              </p>

              <div className="space-y-1">
                <NavigationItem
                  label="Overview"
                  icon="⌂"
                  href="/dashboard"
                  active
                />

                <NavigationItem
  label="Inbound"
  icon="↓"
  href="/inbound"
/>

                <NavigationItem
                  label="Inventory"
                  icon="□"
                  href="/inventory"
                />

                <NavigationItem
                  label="Prep & Orders"
                  icon="✓"
                  href="/work-orders"
                />

                <NavigationItem
                  label="Outbound"
                  icon="→"
                  href="/outbound"
                />
              </div>

              <p className="mb-3 mt-8 px-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Management
              </p>

              <div className="space-y-1">
                <NavigationItem
  label="Customers"
  icon="♙"
  href="/customers"
/>

                <NavigationItem
                  label="Products"
                  icon="▦"
                  href="/products"
                />

                <NavigationItem
                  label="Warehouses"
                  icon="⌂"
                  href="/warehouses"
                />
              </div>

              <p className="mb-3 mt-8 px-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Workspace
              </p>

              <div className="space-y-1">
                <NavigationItem
                  label="Reports"
                  icon="▥"
                  href="/reports"
                />

                <NavigationItem
                  label="Settings"
                  icon="⚙"
                  href="/settings"
                />
              </div>
            </nav>
          </div>
        </aside>

        {/* Main content */}

        <section className="min-w-0 flex-1 px-5 py-7 sm:px-8 sm:py-9 xl:px-10">
          {/* Welcome */}

          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#c7511f]">
                Operations overview
              </p>

              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#162033] sm:text-4xl">
                Welcome back to{" "}
                {organization.name}
              </h1>

              <p className="mt-3 max-w-2xl text-slate-600">
                Everything you need to run your
                fulfillment operation will be
                available from here.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-[#067d62]">
                ● Workspace active
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#162033]">
                {warehouseCount}{" "}
                {warehouseCount === 1
                  ? "warehouse"
                  : "warehouses"}
              </div>
            </div>
          </div>

          {trial?.active && <section className="mt-6 rounded-3xl bg-[#162033] p-6 text-white shadow-sm"><div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#fdba2d]">Your FulfillOS Impact · Control trial</p><h2 className="mt-2 text-2xl font-black">{trial.daysRemaining} days remaining to prove operational value</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Use real inbound activity and the Control Tower to surface exceptions. Revenue protected will appear only after billing events and rates are configured.</p></div><div className="flex flex-wrap gap-3"><Link href="/control-tower" className="inline-flex min-h-12 items-center rounded-xl bg-[#f59e0b] px-5 font-bold text-[#162033]">Open Control Tower</Link><a href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "asielhernandezmartinez@gmail.com"}?subject=FulfillOS%2014-day%20trial%20extension`} className="inline-flex min-h-12 items-center rounded-xl border border-white/20 px-5 font-bold text-white">Request extension</a></div></div></section>}

          {/* Quick actions */}

          <section className="mt-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-[#162033]">
                  Quick actions
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Common tasks, one click away.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <QuickAction
                icon="🏭"
                title={
                  hasWarehouse
                    ? "Manage warehouses"
                    : "Add warehouse"
                }
                description={
                  hasWarehouse
                    ? "Areas, zones and locations"
                    : "Configure your first facility"
                }
                href={
                  hasWarehouse
                    ? "/warehouses"
                    : "/warehouses/new"
                }
                primary
              />

              <QuickAction
                icon="+"
                title="Add warehouse"
                description="Add another facility"
                href="/warehouses/new"
              />

              <QuickAction
  icon="👤"
  title="Add customer"
  description="Create a new client"
  href="/customers/new"
/>

              <QuickAction
                icon="📥"
                title="Receive shipment"
                description="Register an expected inbound"
                href="/inbound/new"
              />
            </div>
          </section>

          {/* Operational cards */}

          <section className="mt-9">
            <div>
              <h2 className="text-lg font-extrabold text-[#162033]">
                Today&apos;s operations
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Live operational totals will appear
                here as modules are activated.
              </p>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              {operationCards.map((card) => (
                <article
                  key={card.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xl">
                      {card.icon}
                    </div>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                      Live
                    </span>
                  </div>

                  <p className="mt-5 text-sm font-semibold text-slate-500">
                    {card.label}
                  </p>

                  <p className="mt-1 text-4xl font-black text-[#162033]">
                    {card.value}
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    {card.detail}
                  </p>
                </article>
              ))}
            </div>
          </section>

          {/* Main lower area */}

          <div className="mt-8 grid gap-6 2xl:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-6">
              {/* Warehouses */}

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-xl font-extrabold text-[#162033]">
                      Warehouses
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Your active fulfillment
                      facilities.
                    </p>
                  </div>

                  <Link
                    href="/warehouses"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-[#162033] transition hover:border-[#f59e0b] hover:bg-amber-50"
                  >
                    View all
                  </Link>
                </div>

                {warehouses.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                    <div className="text-3xl">
                      🏭
                    </div>

                    <h3 className="mt-3 font-extrabold text-[#162033]">
                      No warehouse configured
                    </h3>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                      Add your first fulfillment
                      facility before receiving
                      inventory.
                    </p>

                    <Link
                      href="/warehouses/new"
                      className="mt-5 inline-flex rounded-xl bg-[#f59e0b] px-5 py-3 text-sm font-bold text-[#162033] transition hover:bg-[#fdba2d]"
                    >
                      Add warehouse
                    </Link>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {warehouses.map(
                      (warehouse) => {
                        const location = [
                          warehouse.city,
                          warehouse.state_region,
                        ]
                          .filter(Boolean)
                          .join(", ");

                        return (
                          <Link
                            key={warehouse.id}
                            href={`/warehouses/${warehouse.id}`}
                            className="group flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-amber-300 hover:bg-amber-50/40 sm:flex-row sm:items-center"
                          >
                            <div className="flex min-w-0 items-center gap-4">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#162033] text-xl">
                                🏭
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate font-extrabold text-[#162033]">
                                    {
                                      warehouse.name
                                    }
                                  </p>

                                  {warehouse.is_primary && (
                                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                                      Primary
                                    </span>
                                  )}
                                </div>

                                <p className="mt-1 text-sm text-slate-500">
                                  {warehouse.code}
                                  {location
                                    ? ` · ${location}`
                                    : ""}
                                </p>
                              </div>
                            </div>

                            <span className="shrink-0 text-sm font-bold text-[#c7511f] transition group-hover:translate-x-1">
                              Manage →
                            </span>
                          </Link>
                        );
                      },
                    )}
                  </div>
                )}
              </section>

              {/* Recent activity */}

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                  <h2 className="text-xl font-extrabold text-[#162033]">
                    Recent activity
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Receiving, inventory and
                    fulfillment activity will appear
                    here.
                  </p>
                </div>

                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                  <div className="text-3xl">
                    ✨
                  </div>

                  <p className="mt-3 font-extrabold text-[#162033]">
                    Nothing to show yet
                  </p>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Your workspace is ready. The next
                    step is adding your first customer.
                  </p>
                </div>
              </section>
            </div>

            <div className="space-y-6">
              {/* Getting started */}

              <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#c7511f]">
                      Getting started
                    </p>

                    <h2 className="mt-2 text-xl font-extrabold text-[#162033]">
                      Workspace setup
                    </h2>
                  </div>

                  <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-extrabold text-amber-800">
                    {setupProgress}%
                  </span>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#f59e0b]"
                    style={{
                      width: `${setupProgress}%`,
                    }}
                  />
                </div>

                <div className="mt-6 space-y-3">
                  <SetupItem
                    title="Company workspace"
                    description="Organization created"
                    complete
                  />

                  <SetupItem
                    title="Warehouse"
                    description={
                      hasWarehouse
                        ? `${warehouseCount} active ${
                            warehouseCount === 1
                              ? "warehouse"
                              : "warehouses"
                          }`
                        : "Add your first facility"
                    }
                    complete={hasWarehouse}
                    href={
                      hasWarehouse
                        ? "/warehouses"
                        : "/warehouses/new"
                    }
                  />

                  <SetupItem
  title="Customer"
  description="Manage your clients"
  href="/customers"
/>

                  <SetupItem
                    title="Product"
                    description="Create the first SKU"
                    href="/products/new"
                  />

                  <SetupItem
                    title="Inbound shipment"
                    description="Receive your first inventory"
                    href="/inbound/new"
                  />
                </div>

                <div className="mt-6 rounded-2xl bg-[#162033] p-5 text-white">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#fdba2d]">
                    Next step
                  </p>

                  <p className="mt-2 font-extrabold">
                    Add your first customer
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Customers will own products,
                    inventory, shipments and work
                    orders.
                  </p>

                  <Link href="/customers/new" className="mt-4 inline-flex rounded-lg bg-[#f59e0b] px-4 py-2 text-xs font-bold text-[#162033] transition hover:bg-[#fdba2d]">Add customer →</Link>
                </div>
              </aside>

              {/* Workspace details */}

              <aside className="rounded-3xl bg-[#243247] p-6 text-white shadow-sm">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#fdba2d]">
                  Workspace
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
                    capitalize
                  />

                  <Detail
                    label="Active warehouses"
                    value={String(
                      warehouseCount,
                    )}
                  />
                </dl>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function NavigationItem({
  label,
  icon,
  href,
  active = false,
  badge,
}: {
  label: string;
  icon: string;
  href?: string;
  active?: boolean;
  badge?: string;
}) {
  const content = (
    <>
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex w-5 shrink-0 justify-center text-base">
          {icon}
        </span>

        <span className="truncate">
          {label}
        </span>
      </span>

      {badge && (
        <span
          className={
            badge === "Next"
              ? "rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-800"
              : "rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400"
          }
        >
          {badge}
        </span>
      )}
    </>
  );

  if (!href) {
    return (
      <div
        className="flex cursor-default items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-400"
        title={
          badge === "Next"
            ? "This is the next module we are setting up."
            : "Coming soon"
        }
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={
        active
          ? "flex items-center justify-between gap-3 rounded-xl bg-[#162033] px-4 py-3 text-sm font-bold text-white"
          : "flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-[#162033]"
      }
    >
      {content}
    </Link>
  );
}

function MobileNavItem({
  label,
  href,
  active = false,
  badge,
}: {
  label: string;
  href?: string;
  active?: boolean;
  badge?: string;
}) {
  if (!href) {
    return (
      <div className="flex shrink-0 items-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-400">
        {label}

        {badge && (
          <span className="text-[10px] font-bold uppercase text-amber-700">
            {badge}
          </span>
        )}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={
        active
          ? "shrink-0 rounded-xl bg-[#162033] px-4 py-2 text-sm font-bold text-white"
          : "shrink-0 rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600"
      }
    >
      {label}
    </Link>
  );
}

function QuickAction({
  icon,
  title,
  description,
  href,
  primary = false,
  badge,
}: {
  icon: string;
  title: string;
  description: string;
  href?: string;
  primary?: boolean;
  badge?: string;
}) {
  const content = (
    <>
      <div
        className={
          primary
            ? "flex h-11 w-11 items-center justify-center rounded-xl bg-[#162033] text-xl text-white"
            : "flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xl text-[#162033]"
        }
      >
        {icon}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <p className="font-extrabold text-[#162033]">
          {title}
        </p>

        {badge && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-amber-800">
            {badge}
          </span>
        )}
      </div>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </>
  );

  if (!href) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 opacity-75 shadow-sm">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={
        primary
          ? "rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          : "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
      }
    >
      {content}
    </Link>
  );
}

function SetupItem({
  title,
  description,
  complete = false,
  href,
  badge,
}: {
  title: string;
  description: string;
  complete?: boolean;
  href?: string;
  badge?: string;
}) {
  const content = (
    <div className="flex items-center gap-3">
      <span
        className={
          complete
            ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-[#067d62]"
            : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-sm font-bold text-slate-300"
        }
      >
        {complete ? "✓" : "○"}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-[#162033]">
            {title}
          </p>

          {badge && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-amber-800">
              {badge}
            </span>
          )}
        </div>

        <p className="mt-0.5 text-xs text-slate-500">
          {description}
        </p>
      </div>

      {href && (
        <span className="text-sm font-bold text-[#c7511f]">
          →
        </span>
      )}
    </div>
  );

  if (!href) {
    return (
      <div className="rounded-xl p-2">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="block rounded-xl p-2 transition hover:bg-slate-50"
    >
      {content}
    </Link>
  );
}

function Detail({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </dt>

      <dd
        className={
          capitalize
            ? "mt-1 font-semibold capitalize"
            : "mt-1 break-words font-semibold"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function DashboardLoading() {
  return (
    <main className="min-h-screen bg-[#f5f7fa]">
      <div className="h-[76px] bg-[#162033]" />

      <div className="mx-auto max-w-[1600px] px-5 py-9 sm:px-8">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />

        <div className="mt-4 h-10 max-w-lg animate-pulse rounded-xl bg-slate-200" />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-40 animate-pulse rounded-2xl bg-white"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
