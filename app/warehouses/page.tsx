import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type WarehousesPageProps = {
  searchParams: Promise<{
    created?: string | string[];
    error?: string | string[];
  }>;
};

export default function WarehousesPage({
  searchParams,
}: WarehousesPageProps) {
  return (
    <Suspense fallback={<WarehousesLoading />}>
      <WarehousesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function WarehousesContent({
  searchParams,
}: WarehousesPageProps) {
  const parameters = await searchParams;

  const created = Array.isArray(parameters.created)
    ? parameters.created[0]
    : parameters.created;

  const pageError = Array.isArray(parameters.error)
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
    warehousesResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("name")
      .eq("id", membership.organization_id)
      .single(),

    supabase
      .from("warehouses")
      .select(
        `
          id,
          name,
          code,
          city,
          state_region,
          country_code,
          timezone,
          is_primary,
          is_active,
          created_at
        `,
      )
      .eq(
        "organization_id",
        membership.organization_id,
      )
      .order("is_primary", {
        ascending: false,
      })
      .order("name", {
        ascending: true,
      }),
  ]);

  if (organizationResult.error) {
    throw new Error(
      `The company information could not be loaded: ${organizationResult.error.message}`,
    );
  }

  if (warehousesResult.error) {
    throw new Error(
      `The warehouses could not be loaded: ${warehousesResult.error.message}`,
    );
  }

  const warehouses = warehousesResult.data ?? [];

  const canManage = [
    "owner",
    "admin",
    "manager",
  ].includes(membership.role);

  return (
    <main className="min-h-screen bg-[#f5f7fa]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f59e0b] text-xl font-black text-[#162033]">
              F
            </div>

            <div>
              <p className="font-extrabold text-[#162033]">
                FulfillOS
              </p>

              <p className="text-sm text-slate-500">
                {organizationResult.data.name}
              </p>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-[#162033] transition hover:border-[#f59e0b] hover:bg-amber-50"
          >
            Back to dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#c7511f]">
              Storage network
            </p>

            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-[#162033]">
              Warehouses
            </h1>

            <p className="mt-3 max-w-2xl text-slate-600">
              Manage the buildings where inventory is
              received, prepared, stored and shipped.
            </p>
          </div>

          {canManage && (
            <Link
              href="/warehouses/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f59e0b] px-5 py-3 font-bold text-[#162033] shadow-sm transition hover:bg-[#fdba2d]"
            >
              <span className="text-xl leading-none">
                +
              </span>
              Add warehouse
            </Link>
          )}
        </div>

        {created === "1" && (
          <div
            role="status"
            className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800"
          >
            Warehouse created successfully. You can now
            start adding its internal locations.
          </div>
        )}

        {pageError && (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
          >
            {pageError}
          </div>
        )}

        {warehouses.length === 0 ? (
          <section className="mt-10 overflow-hidden rounded-3xl border border-dashed border-slate-300 bg-white">
            <div className="mx-auto max-w-2xl px-6 py-16 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 text-4xl">
                🏭
              </div>

              <h2 className="mt-6 text-2xl font-extrabold text-[#162033]">
                Add your first warehouse
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                Start with the building where your team
                receives and prepares products. Internal
                zones, racks, shelves and bins will be added
                afterward.
              </p>

              {canManage ? (
                <Link
                  href="/warehouses/new"
                  className="mt-8 inline-flex items-center justify-center rounded-xl bg-[#f59e0b] px-6 py-3 font-bold text-[#162033] transition hover:bg-[#fdba2d]"
                >
                  Add first warehouse
                </Link>
              ) : (
                <p className="mt-7 rounded-xl bg-slate-100 p-4 text-sm text-slate-600">
                  An owner, administrator or manager must
                  create the first warehouse.
                </p>
              )}
            </div>
          </section>
        ) : (
          <section className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {warehouses.map((warehouse) => {
              const location = [
                warehouse.city,
                warehouse.state_region,
              ]
                .filter(Boolean)
                .join(", ");

              return (
                <article
                  key={warehouse.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#162033] text-2xl">
                      🏭
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      {warehouse.is_primary && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                          Primary
                        </span>
                      )}

                      <span
                        className={
                          warehouse.is_active
                            ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800"
                            : "rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600"
                        }
                      >
                        {warehouse.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>
                  </div>

                  <h2 className="mt-6 text-xl font-extrabold text-[#162033]">
                    {warehouse.name}
                  </h2>

                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Code: {warehouse.code}
                  </p>

                  <div className="mt-5 space-y-2 text-sm text-slate-600">
                    <p>
                      <span className="font-bold text-[#162033]">
                        Location:
                      </span>{" "}
                      {location ||
                        "Address not added yet"}
                    </p>

                    <p>
                      <span className="font-bold text-[#162033]">
                        Time zone:
                      </span>{" "}
                      {warehouse.timezone}
                    </p>
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-5">
                    <p className="text-sm font-medium text-slate-500">
                      Internal locations will be configured
                      in the next step.
                    </p>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

function WarehousesLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-6">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-xl bg-[#f59e0b] text-2xl font-black text-[#162033]">
          F
        </div>

        <p className="mt-5 font-bold text-[#162033]">
          Loading warehouses...
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Preparing your storage network.
        </p>
      </div>
    </main>
  );
}