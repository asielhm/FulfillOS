import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type ProductsPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    customer?: string | string[];
    created?: string | string[];
    error?: string | string[];
  }>;
};

export default function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  return (
    <Suspense fallback={<ProductsLoading />}>
      <ProductsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ProductsContent({
  searchParams,
}: ProductsPageProps) {
  const parameters = await searchParams;

  const rawSearch = Array.isArray(parameters.q)
    ? parameters.q[0]
    : parameters.q;

  const rawCustomer = Array.isArray(parameters.customer)
    ? parameters.customer[0]
    : parameters.customer;

  const created = Array.isArray(parameters.created)
    ? parameters.created[0]
    : parameters.created;

  const pageError = Array.isArray(parameters.error)
    ? parameters.error[0]
    : parameters.error;

  const search = rawSearch?.trim() ?? "";
  const selectedCustomerId =
    rawCustomer?.trim() ?? "";

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
    customersResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("name")
      .eq("id", membership.organization_id)
      .single(),

    supabase
      .from("customers")
      .select(
        `
          id,
          company_name,
          reference_code,
          status
        `,
      )
      .eq(
        "organization_id",
        membership.organization_id,
      )
      .order("company_name", {
        ascending: true,
      }),
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

  if (customersResult.error) {
    throw new Error(
      `Customers could not be loaded: ${customersResult.error.message}`,
    );
  }

  const customers = customersResult.data ?? [];

  let productsQuery = supabase
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
        image_url,
        created_at
      `,
    )
    .eq(
      "organization_id",
      membership.organization_id,
    )
    .order("title", {
      ascending: true,
    });

  if (selectedCustomerId) {
    productsQuery = productsQuery.eq(
      "customer_id",
      selectedCustomerId,
    );
  }

  if (search) {
    const safeSearch = search
      .replace(/[,%()]/g, " ")
      .trim();

    if (safeSearch) {
      productsQuery = productsQuery.or(
        `title.ilike.%${safeSearch}%,sku.ilike.%${safeSearch}%,asin.ilike.%${safeSearch}%,barcode.ilike.%${safeSearch}%`,
      );
    }
  }

  const {
    data: products,
    error: productsError,
  } = await productsQuery;

  if (productsError) {
    throw new Error(
      `Products could not be loaded: ${productsError.message}`,
    );
  }

  const productList = products ?? [];

  const customersById = new Map(
    customers.map((customer) => [
      customer.id,
      customer,
    ]),
  );

  const canManage = [
    "owner",
    "admin",
    "manager",
  ].includes(membership.role);

  const activeCustomers = customers.filter(
    (customer) => customer.status === "active",
  );

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
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#c7511f]">
              Product catalog
            </p>

            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-[#162033]">
              Products
            </h1>

            <p className="mt-3 max-w-2xl text-slate-600">
              Manage the SKUs your customers send to
              your fulfillment operation.
            </p>
          </div>

          {canManage &&
            activeCustomers.length > 0 && (
              <Link
                href="/products/new"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f59e0b] px-5 py-3 font-bold text-[#162033] shadow-sm transition hover:bg-[#fdba2d]"
              >
                <span className="text-xl">
                  +
                </span>

                Add product
              </Link>
            )}
        </div>

        {created === "1" && (
          <div
            role="status"
            className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800"
          >
            Product created successfully.
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

        {customers.length === 0 ? (
          <section className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white">
            <div className="mx-auto max-w-2xl px-6 py-16 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 text-4xl">
                👥
              </div>

              <h2 className="mt-6 text-2xl font-extrabold text-[#162033]">
                Add a customer first
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                Every product belongs to a customer.
                Create your first customer before
                adding products.
              </p>

              <Link
                href="/customers/new"
                className="mt-8 inline-flex rounded-xl bg-[#f59e0b] px-6 py-3 font-bold text-[#162033] transition hover:bg-[#fdba2d]"
              >
                Add customer
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <form
                method="get"
                action="/products"
                className="grid gap-3 md:grid-cols-[1fr_280px_auto]"
              >
                <input
                  type="search"
                  name="q"
                  defaultValue={search}
                  placeholder="Search name, SKU, ASIN or barcode..."
                  aria-label="Search products"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#162033] outline-none transition focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
                />

                <select
                  name="customer"
                  defaultValue={selectedCustomerId}
                  aria-label="Filter by customer"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#162033] outline-none transition focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
                >
                  <option value="">
                    All customers
                  </option>

                  {customers.map((customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.company_name}
                    </option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-[#162033] px-5 py-3 font-bold text-white transition hover:bg-[#243247]"
                  >
                    Search
                  </button>

                  {(search ||
                    selectedCustomerId) && (
                    <Link
                      href="/products"
                      className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-3 font-bold text-[#162033] transition hover:bg-slate-50"
                    >
                      Clear
                    </Link>
                  )}
                </div>
              </form>
            </section>

            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-500">
                {productList.length}{" "}
                {productList.length === 1
                  ? "product"
                  : "products"}
              </p>
            </div>

            {productList.length === 0 ? (
              <section className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white">
                <div className="mx-auto max-w-2xl px-6 py-16 text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 text-4xl">
                    📦
                  </div>

                  <h2 className="mt-6 text-2xl font-extrabold text-[#162033]">
                    {search ||
                    selectedCustomerId
                      ? "No products found"
                      : "Add your first product"}
                  </h2>

                  <p className="mt-3 leading-7 text-slate-600">
                    {search ||
                    selectedCustomerId
                      ? "Try changing your search or customer filter."
                      : "Create the first SKU in your fulfillment catalog."}
                  </p>

                  {!search &&
                    !selectedCustomerId &&
                    canManage &&
                    activeCustomers.length >
                      0 && (
                      <Link
                        href="/products/new"
                        className="mt-8 inline-flex rounded-xl bg-[#f59e0b] px-6 py-3 font-bold text-[#162033] transition hover:bg-[#fdba2d]"
                      >
                        Add first product
                      </Link>
                    )}
                </div>
              </section>
            ) : (
              <section className="mt-6 grid gap-5 lg:grid-cols-2">
                {productList.map((product) => {
                  const customer =
                    customersById.get(
                      product.customer_id,
                    );

                  return (
                    <Link
                      key={product.id}
                      href={`/products/${product.id}`}
                      className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-4">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-2xl">
                            📦
                          </div>

                          <div className="min-w-0">
                            <h2 className="line-clamp-2 text-lg font-extrabold text-[#162033] transition group-hover:text-[#c7511f]">
                              {product.title}
                            </h2>

                            <p className="mt-1 text-sm font-bold text-slate-500">
                              SKU: {product.sku}
                            </p>
                          </div>
                        </div>

                        <ProductStatus
                          status={product.status}
                        />
                      </div>

                      <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <ProductDetail
                          label="Customer"
                          value={
                            customer?.company_name ??
                            "Unknown"
                          }
                        />

                        <ProductDetail
                          label="ASIN"
                          value={
                            product.asin ||
                            "Not added"
                          }
                        />

                        <ProductDetail
                          label="FNSKU"
                          value={
                            product.fnsku ||
                            "Not added"
                          }
                        />

                        <ProductDetail
                          label="Barcode"
                          value={
                            product.barcode ||
                            "Not added"
                          }
                        />
                      </div>

                      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                        <p className="text-sm text-slate-500">
                          Inventory: 0 units
                        </p>

                        <span className="font-bold text-[#c7511f] transition group-hover:translate-x-1">
                          Open →
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function ProductStatus({
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

  if (status === "archived") {
    return (
      <span className="shrink-0 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
        Archived
      </span>
    );
  }

  return (
    <span className="shrink-0 rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600">
      Inactive
    </span>
  );
}

function ProductDetail({
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

function ProductsLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-xl bg-[#f59e0b] text-2xl font-black text-[#162033]">
          F
        </div>

        <p className="mt-5 font-bold text-[#162033]">
          Loading products...
        </p>
      </div>
    </main>
  );
}