import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type CustomersPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    created?: string | string[];
    error?: string | string[];
  }>;
};

export default function CustomersPage({
  searchParams,
}: CustomersPageProps) {
  return (
    <Suspense fallback={<CustomersLoading />}>
      <CustomersContent searchParams={searchParams} />
    </Suspense>
  );
}

async function CustomersContent({
  searchParams,
}: CustomersPageProps) {
  const parameters = await searchParams;

  const rawSearch = Array.isArray(parameters.q)
    ? parameters.q[0]
    : parameters.q;

  const created = Array.isArray(parameters.created)
    ? parameters.created[0]
    : parameters.created;

  const pageError = Array.isArray(parameters.error)
    ? parameters.error[0]
    : parameters.error;

  const search = rawSearch?.trim() ?? "";

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
    data: organization,
    error: organizationError,
  } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", membership.organization_id)
    .single();

  if (organizationError || !organization) {
    throw new Error(
      organizationError?.message ??
        "The organization could not be loaded.",
    );
  }

  let customersQuery = supabase
    .from("customers")
    .select(
      `
        id,
        company_name,
        reference_code,
        contact_name,
        contact_email,
        contact_phone,
        city,
        state_region,
        country_code,
        status,
        created_at
      `,
    )
    .eq(
      "organization_id",
      membership.organization_id,
    )
    .order("company_name", {
      ascending: true,
    });

  if (search) {
    customersQuery = customersQuery.ilike(
      "company_name",
      `%${search}%`,
    );
  }

  const {
    data: customers,
    error: customersError,
  } = await customersQuery;

  if (customersError) {
    throw new Error(
      `Customers could not be loaded: ${customersError.message}`,
    );
  }

  const customerList = customers ?? [];

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
                {organization.name}
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
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#c7511f]">
              Client management
            </p>

            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-[#162033]">
              Customers
            </h1>

            <p className="mt-3 max-w-2xl text-slate-600">
              Manage the companies whose products you
              receive, prepare, store and ship.
            </p>
          </div>

          {canManage && (
            <Link
              href="/customers/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f59e0b] px-5 py-3 font-bold text-[#162033] shadow-sm transition hover:bg-[#fdba2d]"
            >
              <span className="text-xl">
                +
              </span>
              Add customer
            </Link>
          )}
        </div>

        {created === "1" && (
          <div
            role="status"
            className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800"
          >
            Customer created successfully.
          </div>
        )}

        {pageError && (
          <div
            role="alert"
            className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
          >
            {pageError}
          </div>
        )}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <form
            method="get"
            action="/customers"
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative min-w-0 flex-1">
              <input
                type="search"
                name="q"
                defaultValue={search}
                placeholder="Search by company name..."
                aria-label="Search customers"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-[#162033] outline-none transition focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-[#162033] px-5 py-3 font-bold text-white transition hover:bg-[#243247]"
            >
              Search
            </button>

            {search && (
              <Link
                href="/customers"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 font-bold text-[#162033] transition hover:bg-slate-50"
              >
                Clear
              </Link>
            )}
          </form>
        </section>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-500">
            {customerList.length}{" "}
            {customerList.length === 1
              ? "customer"
              : "customers"}
            {search
              ? ` matching "${search}"`
              : ""}
          </p>
        </div>

        {customerList.length === 0 ? (
          <section className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white">
            <div className="mx-auto max-w-2xl px-6 py-16 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 text-4xl">
                👥
              </div>

              <h2 className="mt-6 text-2xl font-extrabold text-[#162033]">
                {search
                  ? "No customers found"
                  : "Add your first customer"}
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                {search
                  ? "Try another company name or clear the search."
                  : "Customers are the companies whose products your team will receive, prep, store and ship."}
              </p>

              {!search && canManage && (
                <Link
                  href="/customers/new"
                  className="mt-8 inline-flex items-center justify-center rounded-xl bg-[#f59e0b] px-6 py-3 font-bold text-[#162033] transition hover:bg-[#fdba2d]"
                >
                  Add first customer
                </Link>
              )}
            </div>
          </section>
        ) : (
          <section className="mt-6 grid gap-5 lg:grid-cols-2">
            {customerList.map((customer) => {
              const location = [
                customer.city,
                customer.state_region,
              ]
                .filter(Boolean)
                .join(", ");

              return (
                <Link
                  key={customer.id}
                  href={`/customers/${customer.id}`}
                  className="group block rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#162033] text-xl font-black text-white">
                        {getInitials(
                          customer.company_name,
                        )}
                      </div>

                      <div className="min-w-0">
                        <h2 className="truncate text-xl font-extrabold text-[#162033] transition group-hover:text-[#c7511f]">
                          {customer.company_name}
                        </h2>

                        <p className="mt-1 text-sm font-medium text-slate-500">
                          Customer code:{" "}
                          {customer.reference_code}
                        </p>
                      </div>
                    </div>

                    <CustomerStatus
                      status={customer.status}
                    />
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <CustomerDetail
                      label="Contact"
                      value={
                        customer.contact_name ||
                        "Not added yet"
                      }
                    />

                    <CustomerDetail
                      label="Location"
                      value={
                        location ||
                        "Not added yet"
                      }
                    />

                    <CustomerDetail
                      label="Email"
                      value={
                        customer.contact_email ||
                        "Not added yet"
                      }
                    />

                    <CustomerDetail
                      label="Phone"
                      value={
                        customer.contact_phone ||
                        "Not added yet"
                      }
                    />
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                    <p className="text-sm text-slate-500">
                      Products and inventory will be
                      linked to this customer.
                    </p>

                    <span className="shrink-0 font-bold text-[#c7511f] transition group-hover:translate-x-1">
                      Open →
                    </span>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

function CustomerStatus({
  status,
}: {
  status: string;
}) {
  if (status === "active") {
    return (
      <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
        Active
      </span>
    );
  }

  if (status === "on_hold") {
    return (
      <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
        On hold
      </span>
    );
  }

  return (
    <span className="shrink-0 rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600">
      Inactive
    </span>
  );
}

function CustomerDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-[#162033]">
        {value}
      </p>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

function CustomersLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-6">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-xl bg-[#f59e0b] text-2xl font-black text-[#162033]">
          F
        </div>

        <p className="mt-5 font-bold text-[#162033]">
          Loading customers...
        </p>
      </div>
    </main>
  );
}