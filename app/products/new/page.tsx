import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "./product-form";

type NewProductPageProps = {
  searchParams: Promise<{
    customerId?: string | string[];
    error?: string | string[];
  }>;
};

export default function NewProductPage({
  searchParams,
}: NewProductPageProps) {
  return (
    <Suspense fallback={<NewProductLoading />}>
      <NewProductContent
        searchParams={searchParams}
      />
    </Suspense>
  );
}

async function NewProductContent({
  searchParams,
}: NewProductPageProps) {
  const parameters = await searchParams;

  const requestedCustomerId = Array.isArray(
    parameters.customerId,
  )
    ? parameters.customerId[0]
    : parameters.customerId;

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

  const canManage = [
    "owner",
    "admin",
    "manager",
  ].includes(membership.role);

  if (!canManage) {
    redirect(
      "/products?error=You do not have permission to add products.",
    );
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
          reference_code
        `,
      )
      .eq(
        "organization_id",
        membership.organization_id,
      )
      .eq("status", "active")
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

  const customers =
    customersResult.data ?? [];

  if (customers.length === 0) {
    redirect(
      "/customers?error=Add an active customer before creating a product.",
    );
  }

  const defaultCustomerId =
    requestedCustomerId &&
    customers.some(
      (customer) =>
        customer.id === requestedCustomerId,
    )
      ? requestedCustomerId
      : customers.length === 1
        ? customers[0].id
        : undefined;

  return (
    <main className="min-h-screen bg-[#f5f7fa] px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#162033] transition hover:text-[#c7511f]"
        >
          ← Back to products
        </Link>

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          <div className="bg-[#162033] px-7 py-8 text-white sm:px-10">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#fdba2d]">
              {organizationResult.data.name}
            </p>

            <h1 className="mt-3 text-3xl font-extrabold">
              Add a product
            </h1>

            <p className="mt-3 max-w-xl leading-7 text-slate-300">
              Start with the product name, SKU and
              customer. Everything else can be added
              now or completed later.
            </p>
          </div>

          <div className="p-7 sm:p-10">
            {pageError && (
              <div
                role="alert"
                className="mb-7 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
              >
                {pageError}
              </div>
            )}

            <ProductForm
              customers={customers.map(
                (customer) => ({
                  id: customer.id,
                  companyName:
                    customer.company_name,
                  referenceCode:
                    customer.reference_code,
                }),
              )}
              defaultCustomerId={
                defaultCustomerId
              }
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function NewProductLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
      <p className="font-bold text-[#162033]">
        Preparing product setup...
      </p>
    </main>
  );
}