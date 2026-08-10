import Link from "next/link";
import { Suspense } from "react";
import {
  notFound,
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type ProductPageProps = {
  params: Promise<{
    productId: string;
  }>;

  searchParams: Promise<{
    created?: string | string[];
  }>;
};

export default function ProductPage({
  params,
  searchParams,
}: ProductPageProps) {
  return (
    <Suspense fallback={<ProductLoading />}>
      <ProductContent
        params={params}
        searchParams={searchParams}
      />
    </Suspense>
  );
}

async function ProductContent({
  params,
  searchParams,
}: ProductPageProps) {
  const { productId } = await params;

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
    data: product,
    error: productError,
  } = await supabase
    .from("products")
    .select(
      `
        id,
        customer_id,
        sku,
        title,
        asin,
        fnsku,
        barcode,
        condition,
        status,
        length_in,
        width_in,
        height_in,
        weight_lb,
        image_url,
        prep_notes,
        created_at
      `,
    )
    .eq("id", productId)
    .eq(
      "organization_id",
      membership.organization_id,
    )
    .maybeSingle();

  if (productError) {
    throw new Error(
      `The product could not be loaded: ${productError.message}`,
    );
  }

  if (!product) {
    notFound();
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
        reference_code
      `,
    )
    .eq("id", product.customer_id)
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

  const hasDimensions =
    product.length_in !== null ||
    product.width_in !== null ||
    product.height_in !== null;

  return (
    <main className="min-h-screen bg-[#f5f7fa]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/products"
            className="text-sm font-bold text-[#162033] transition hover:text-[#c7511f]"
          >
            ← All products
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
            Product created successfully.
          </div>
        )}

        <section className="rounded-3xl bg-[#162033] p-7 text-white shadow-xl sm:p-10">
          <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-start">
            <div className="flex min-w-0 gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-4xl">
                📦
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    {product.status ===
                    "active"
                      ? "Active"
                      : product.status ===
                          "archived"
                        ? "Archived"
                        : "Inactive"}
                  </span>

                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">
                    {formatCondition(
                      product.condition,
                    )}
                  </span>
                </div>

                <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  {product.title}
                </h1>

                <p className="mt-2 font-mono text-sm text-slate-300">
                  SKU: {product.sku}
                </p>

                <Link
                  href={`/customers/${customer.id}`}
                  className="mt-4 inline-flex text-sm font-bold text-[#fdba2d] hover:underline"
                >
                  {customer.company_name} →
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:min-w-[360px]">
              <Metric
                label="Inventory"
                value="0"
                detail="units"
              />

              <Metric
                label="Inbound"
                value="0"
                detail="open"
              />

              <Metric
                label="Orders"
                value="0"
                detail="active"
              />
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#c7511f]">
                Product information
              </p>

              <h2 className="mt-2 text-xl font-extrabold text-[#162033]">
                Identifiers
              </h2>

              <dl className="mt-6 space-y-5">
                <Info
                  label="Customer"
                  value={
                    customer.company_name
                  }
                />

                <Info
                  label="Customer code"
                  value={
                    customer.reference_code
                  }
                />

                <Info
                  label="SKU"
                  value={product.sku}
                  mono
                />

                <Info
                  label="ASIN"
                  value={
                    product.asin ||
                    "Not added"
                  }
                  mono
                />

                <Info
                  label="FNSKU"
                  value={
                    product.fnsku ||
                    "Not added"
                  }
                  mono
                />

                <Info
                  label="Barcode"
                  value={
                    product.barcode ||
                    "Not added"
                  }
                  mono
                />
              </dl>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#c7511f]">
                Physical details
              </p>

              <h2 className="mt-2 text-xl font-extrabold text-[#162033]">
                Dimensions & weight
              </h2>

              {!hasDimensions &&
              product.weight_lb === null ? (
                <p className="mt-5 text-sm text-slate-500">
                  No physical dimensions have
                  been added yet.
                </p>
              ) : (
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <SmallMetric
                    label="Length"
                    value={formatNumber(
                      product.length_in,
                      "in",
                    )}
                  />

                  <SmallMetric
                    label="Width"
                    value={formatNumber(
                      product.width_in,
                      "in",
                    )}
                  />

                  <SmallMetric
                    label="Height"
                    value={formatNumber(
                      product.height_in,
                      "in",
                    )}
                  />

                  <SmallMetric
                    label="Weight"
                    value={formatNumber(
                      product.weight_lb,
                      "lb",
                    )}
                  />
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#c7511f]">
                    Inventory
                  </p>

                  <h2 className="mt-2 text-xl font-extrabold text-[#162033]">
                    Stock locations
                  </h2>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                  0 units
                </span>
              </div>

              <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                <div className="text-4xl">
                  📦
                </div>

                <h3 className="mt-4 font-extrabold text-[#162033]">
                  No inventory yet
                </h3>

                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                  Inventory will appear here once
                  this product is received into a
                  warehouse.
                </p>

                <div className="mt-5 inline-flex rounded-xl bg-slate-200 px-4 py-2 text-sm font-bold text-slate-500">
                  Inbound module coming next
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#c7511f]">
                Preparation
              </p>

              <h2 className="mt-2 text-xl font-extrabold text-[#162033]">
                Prep instructions
              </h2>

              {product.prep_notes ? (
                <div className="mt-5 whitespace-pre-wrap rounded-2xl bg-amber-50 p-5 text-sm leading-7 text-[#162033]">
                  {product.prep_notes}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">
                    No special prep instructions
                    have been added.
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#c7511f]">
                Activity
              </p>

              <h2 className="mt-2 text-xl font-extrabold text-[#162033]">
                Product history
              </h2>

              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-9 text-center">
                <p className="font-bold text-[#162033]">
                  No activity yet
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Receiving, prep and shipping
                  events will appear here
                  automatically.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-[#fdba2d]">
        {label}
      </p>

      <p className="mt-2 text-2xl font-extrabold">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-300">
        {detail}
      </p>
    </div>
  );
}

function SmallMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase text-slate-400">
        {label}
      </p>

      <p className="mt-1 font-extrabold text-[#162033]">
        {value}
      </p>
    </div>
  );
}

function Info({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </dt>

      <dd
        className={
          mono
            ? "mt-1 break-all font-mono font-semibold text-[#162033]"
            : "mt-1 break-words font-semibold text-[#162033]"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function formatCondition(
  condition: string,
) {
  return condition
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function formatNumber(
  value: number | string | null,
  unit: string,
) {
  if (value === null) {
    return "—";
  }

  return `${Number(value).toLocaleString(
    "en-US",
    {
      maximumFractionDigits: 3,
    },
  )} ${unit}`;
}

function ProductLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
      <p className="font-bold text-[#162033]">
        Loading product...
      </p>
    </main>
  );
}