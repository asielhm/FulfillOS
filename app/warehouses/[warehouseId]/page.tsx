import Link from "next/link";
import { Suspense } from "react";
import {
  notFound,
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { LocationForm } from "./location-form";

type WarehouseDetailPageProps = {
  params: Promise<{
    warehouseId: string;
  }>;

  searchParams: Promise<{
    created?: string | string[];
    error?: string | string[];
  }>;
};

export default function WarehouseDetailPage({
  params,
  searchParams,
}: WarehouseDetailPageProps) {
  return (
    <Suspense fallback={<WarehouseDetailLoading />}>
      <WarehouseDetailContent
        params={params}
        searchParams={searchParams}
      />
    </Suspense>
  );
}

async function WarehouseDetailContent({
  params,
  searchParams,
}: WarehouseDetailPageProps) {
  const { warehouseId } = await params;
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

  const {
    data: warehouse,
    error: warehouseError,
  } = await supabase
    .from("warehouses")
    .select(
      `
        id,
        name,
        code,
        address_line_1,
        address_line_2,
        city,
        state_region,
        postal_code,
        country_code,
        timezone,
        is_primary,
        is_active
      `,
    )
    .eq("id", warehouseId)
    .eq(
      "organization_id",
      membership.organization_id,
    )
    .maybeSingle();

  if (warehouseError) {
    throw new Error(
      `The warehouse could not be loaded: ${warehouseError.message}`,
    );
  }

  if (!warehouse) {
    notFound();
  }

  const {
    data: locations,
    error: locationsError,
  } = await supabase
    .from("warehouse_locations")
    .select(
      `
        id,
        name,
        code,
        location_kind,
        purpose,
        description,
        is_active,
        sort_order
      `,
    )
    .eq("warehouse_id", warehouse.id)
    .eq(
      "organization_id",
      membership.organization_id,
    )
    .order("sort_order", {
      ascending: true,
    })
    .order("name", {
      ascending: true,
    });

  if (locationsError) {
    throw new Error(
      `The warehouse areas could not be loaded: ${locationsError.message}`,
    );
  }

  const warehouseLocations = locations ?? [];

  const canManage = [
    "owner",
    "admin",
    "manager",
  ].includes(membership.role);

  const address = [
    warehouse.address_line_1,
    warehouse.address_line_2,
    warehouse.city,
    warehouse.state_region,
    warehouse.postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="min-h-screen bg-[#f5f7fa]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/warehouses"
            className="text-sm font-bold text-[#162033] transition hover:text-[#c7511f]"
          >
            ← All warehouses
          </Link>

          <Link
            href="/dashboard"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-[#162033] transition hover:border-[#f59e0b] hover:bg-amber-50"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <section className="rounded-3xl bg-[#162033] p-7 text-white shadow-xl sm:p-10">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
            <div>
              <div className="flex flex-wrap gap-2">
                {warehouse.is_primary && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                    Primary warehouse
                  </span>
                )}

                <span
                  className={
                    warehouse.is_active
                      ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800"
                      : "rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700"
                  }
                >
                  {warehouse.is_active
                    ? "Active"
                    : "Inactive"}
                </span>
              </div>

              <h1 className="mt-5 text-4xl font-extrabold tracking-tight">
                {warehouse.name}
              </h1>

              <p className="mt-2 text-slate-300">
                Warehouse code: {warehouse.code}
              </p>

              <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-300">
                {address || "No address has been added yet."}
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Time zone: {warehouse.timezone}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 px-6 py-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#fdba2d]">
                Internal areas
              </p>

              <p className="mt-2 text-3xl font-extrabold">
                {warehouseLocations.length}
              </p>
            </div>
          </div>
        </section>

        {created === "1" && (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800"
          >
            Area added successfully.
          </div>
        )}

        {pageError && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
          >
            {pageError}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          <section>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#c7511f]">
              Warehouse layout
            </p>

            <h2 className="mt-2 text-2xl font-extrabold text-[#162033]">
              Areas and work zones
            </h2>

            <p className="mt-2 text-slate-600">
              Organize the warehouse according to the actual
              flow of products.
            </p>

            {warehouseLocations.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-3xl">
                  📦
                </div>

                <h3 className="mt-5 text-xl font-extrabold text-[#162033]">
                  No areas added yet
                </h3>

                <p className="mx-auto mt-3 max-w-lg leading-7 text-slate-600">
                  A good first setup usually includes a
                  receiving area, storage area, preparation
                  area and outbound area.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {warehouseLocations.map((location) => {
                  const display = getLocationDisplay(
                    location.purpose,
                  );

                  return (
                    <article
                      key={location.id}
                      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-amber-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                          {display.icon}
                        </div>

                        <span
                          className={
                            location.is_active
                              ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800"
                              : "rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600"
                          }
                        >
                          {location.is_active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </div>

                      <h3 className="mt-5 text-lg font-extrabold text-[#162033]">
                        {location.name}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {display.label} ·{" "}
                        {formatKind(location.location_kind)}
                      </p>

                      <p className="mt-3 text-sm font-medium text-slate-600">
                        Code: {location.code}
                      </p>

                      {location.description && (
                        <p className="mt-4 text-sm leading-6 text-slate-600">
                          {location.description}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {canManage ? (
            <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#c7511f]">
                Quick setup
              </p>

              <h2 className="mt-2 text-2xl font-extrabold text-[#162033]">
                Add an area
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Start with the main operational areas. Racks,
                shelves and bins can be added later.
              </p>

              <div className="mt-6">
                <LocationForm warehouseId={warehouse.id} />
              </div>
            </aside>
          ) : (
            <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="font-extrabold text-[#162033]">
                View-only access
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                An owner, administrator or manager can add
                warehouse areas.
              </p>
            </aside>
          )}
        </div>
      </div>
    </main>
  );
}

function getLocationDisplay(purpose: string) {
  const displays: Record<
    string,
    {
      label: string;
      icon: string;
    }
  > = {
    receiving: {
      label: "Receiving",
      icon: "🚚",
    },

    storage: {
      label: "Storage",
      icon: "📦",
    },

    prep: {
      label: "Preparation",
      icon: "🏷️",
    },

    packing: {
      label: "Packing",
      icon: "📋",
    },

    outbound: {
      label: "Outbound",
      icon: "🚛",
    },

    returns: {
      label: "Returns",
      icon: "↩️",
    },

    quarantine: {
      label: "Quarantine",
      icon: "⚠️",
    },

    general: {
      label: "General",
      icon: "🏭",
    },
  };

  return (
    displays[purpose] ?? {
      label: "General",
      icon: "🏭",
    }
  );
}

function formatKind(kind: string) {
  return kind
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function WarehouseDetailLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-6">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-xl bg-[#f59e0b] text-2xl font-black text-[#162033]">
          F
        </div>

        <p className="mt-5 font-bold text-[#162033]">
          Loading warehouse...
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Preparing warehouse administration.
        </p>
      </div>
    </main>
  );
}