import Link from "next/link";
import { Suspense } from "react";
import {
  notFound,
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type CustomerPageProps = {
  params: Promise<{
    customerId: string;
  }>;

  searchParams: Promise<{
    created?: string | string[];
  }>;
};

export default function CustomerPage({
  params,
  searchParams,
}: CustomerPageProps) {
  return (
    <Suspense fallback={<CustomerLoading />}>
      <CustomerContent
        params={params}
        searchParams={searchParams}
      />
    </Suspense>
  );
}

async function CustomerContent({
  params,
  searchParams,
}: CustomerPageProps) {
  const { customerId } = await params;

  const parameters = await searchParams;

  const created = Array.isArray(parameters.created)
    ? parameters.created[0]
    : parameters.created;

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
    data: customer,
    error: customerError,
  } = await supabase
    .from("customers")
    .select(
      `
        id,
        company_name,
        reference_code,
        contact_name,
        contact_email,
        contact_phone,
        address_line_1,
        address_line_2,
        city,
        state_region,
        postal_code,
        country_code,
        status,
        notes,
        created_at
      `,
    )
    .eq("id", customerId)
    .eq(
      "organization_id",
      membership.organization_id,
    )
    .maybeSingle();

  if (customerError) {
    throw new Error(
      `The customer could not be loaded: ${customerError.message}`,
    );
  }

  if (!customer) {
    notFound();
  }

  const address = [
    customer.address_line_1,
    customer.address_line_2,
    customer.city,
    customer.state_region,
    customer.postal_code,
    customer.country_code,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="min-h-screen bg-[#f5f7fa]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/customers"
            className="text-sm font-bold text-[#162033] transition hover:text-[#c7511f]"
          >
            ← All customers
          </Link>

          <Link
            href="/dashboard"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-[#162033] transition hover:bg-slate-50"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {created === "1" && (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800"
          >
            Customer created successfully.
          </div>
        )}

        <section className="rounded-3xl bg-[#162033] p-7 text-white shadow-xl sm:p-10">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
            <div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                {customer.status === "active"
                  ? "Active"
                  : customer.status ===
                      "on_hold"
                    ? "On hold"
                    : "Inactive"}
              </span>

              <h1 className="mt-5 text-4xl font-extrabold tracking-tight">
                {customer.company_name}
              </h1>

              <p className="mt-2 text-slate-300">
                Customer code:{" "}
                {customer.reference_code}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 px-6 py-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#fdba2d]">
                Products
              </p>

              <p className="mt-2 text-3xl font-extrabold">
                0
              </p>

              <p className="mt-1 text-xs text-slate-300">
                Product module next
              </p>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#c7511f]">
              Customer details
            </p>

            <h2 className="mt-2 text-xl font-extrabold text-[#162033]">
              Contact information
            </h2>

            <dl className="mt-6 space-y-5">
              <Info
                label="Contact person"
                value={
                  customer.contact_name ||
                  "Not added"
                }
              />

              <Info
                label="Email"
                value={
                  customer.contact_email ||
                  "Not added"
                }
              />

              <Info
                label="Phone"
                value={
                  customer.contact_phone ||
                  "Not added"
                }
              />

              <Info
                label="Address"
                value={
                  address ||
                  "Not added"
                }
              />
            </dl>

            {customer.notes && (
              <div className="mt-7 border-t border-slate-200 pt-6">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Internal notes
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {customer.notes}
                </p>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#c7511f]">
              Products
            </p>

            <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-3xl">
                📦
              </div>

              <h2 className="mt-5 text-xl font-extrabold text-[#162033]">
                No products yet
              </h2>

              <p className="mx-auto mt-3 max-w-lg leading-7 text-slate-600">
                Products belonging to this customer
                will appear here with their SKU, ASIN,
                barcode and inventory.
              </p>

              <div className="mt-6 inline-flex rounded-xl bg-slate-200 px-5 py-3 text-sm font-bold text-slate-500">
                Add product — coming next
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Info({
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

      <dd className="mt-1 break-words font-semibold text-[#162033]">
        {value}
      </dd>
    </div>
  );
}

function CustomerLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
      <p className="font-bold text-[#162033]">
        Loading customer...
      </p>
    </main>
  );
}