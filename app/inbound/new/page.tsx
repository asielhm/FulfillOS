import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ModuleShell } from "@/components/module-shell";
import { createClient } from "@/lib/supabase/server";
import { InboundForm } from "./inbound-form";

type NewInboundPageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

export default function NewInboundPage({
  searchParams,
}: NewInboundPageProps) {
  return (
    <Suspense fallback={<Loading />}>
      <NewInboundContent
        searchParams={searchParams}
      />
    </Suspense>
  );
}

async function NewInboundContent({
  searchParams,
}: NewInboundPageProps) {
  const parameters =
    await searchParams;

  const pageError = Array.isArray(
    parameters.error,
  )
    ? parameters.error[0]
    : parameters.error;

  const supabase =
    await createClient();

  const {
    data: authData,
    error: authError,
  } =
    await supabase.auth.getClaims();

  const userId =
    authData?.claims?.sub;

  if (authError || !userId) {
    redirect("/auth/login");
  }

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq(
      "user_id",
      String(userId),
    )
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error(
      membershipError.message,
    );
  }

  if (!membership) {
    redirect("/onboarding");
  }

  const canCreate = [
    "owner",
    "admin",
    "manager",
  ].includes(membership.role);

  if (!canCreate) {
    redirect(
      "/inbound?error=You do not have permission to create inbound shipments.",
    );
  }

  const [
    organizationResult,
    customersResult,
    warehousesResult,
    productsResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("name")
      .eq(
        "id",
        membership.organization_id,
      )
      .single(),

    supabase
      .from("customers")
      .select("id, company_name")
      .eq(
        "organization_id",
        membership.organization_id,
      )
      .eq("status", "active")
      .order("company_name"),

    supabase
      .from("warehouses")
      .select("id, name, code")
      .eq(
        "organization_id",
        membership.organization_id,
      )
      .eq("is_active", true)
      .order("is_primary", {
        ascending: false,
      })
      .order("name"),

    supabase
      .from("products")
      .select(
        "id, customer_id, title, sku",
      )
      .eq(
        "organization_id",
        membership.organization_id,
      )
      .eq("status", "active")
      .order("title"),
  ]);

  if (
    organizationResult.error ||
    !organizationResult.data
  ) {
    throw new Error(
      organizationResult.error
        ?.message ??
        "Organization could not be loaded.",
    );
  }

  if (customersResult.error) {
    throw new Error(
      customersResult.error.message,
    );
  }

  if (warehousesResult.error) {
    throw new Error(
      warehousesResult.error.message,
    );
  }

  if (productsResult.error) {
    throw new Error(
      productsResult.error.message,
    );
  }

  const customers =
    customersResult.data ?? [];

  const warehouses =
    warehousesResult.data ?? [];

  if (customers.length === 0) {
    redirect(
      "/customers?error=Add an active customer before creating an inbound shipment.",
    );
  }

  if (warehouses.length === 0) {
    redirect(
      "/warehouses?error=Add an active warehouse before creating an inbound shipment.",
    );
  }

  const email =
    typeof authData.claims.email === "string"
      ? authData.claims.email
      : "Authenticated user";

  return (
    <ModuleShell
      organizationName={organizationResult.data.name}
      email={email}
      role={membership.role}
    >
      <div className="mx-auto max-w-4xl">
        <Link
          href="/inbound"
          className="text-sm font-bold text-[#162033] hover:text-[#c7511f]"
        >
          ← Back to inbound
        </Link>

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          <div className="bg-[#162033] px-7 py-8 text-white sm:px-10">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#fdba2d]">
              {
                organizationResult
                  .data.name
              }
            </p>

            <h1 className="mt-3 text-3xl font-extrabold">
              New inbound shipment
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-slate-300">
              Tell your receiving team
              what is coming and where it
              should arrive.
            </p>
          </div>

          <div className="p-7 sm:p-10">
            {pageError && (
              <div className="mb-7 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {pageError}
              </div>
            )}

            <InboundForm
              customers={customers.map(
                (customer) => ({
                  id: customer.id,
                  companyName:
                    customer.company_name,
                }),
              )}
              warehouses={warehouses.map(
                (warehouse) => ({
                  id: warehouse.id,
                  name: warehouse.name,
                  code: warehouse.code,
                }),
              )}
              products={(
                productsResult.data ?? []
              ).map((product) => ({
                id: product.id,
                customerId:
                  product.customer_id,
                title: product.title,
                sku: product.sku,
              }))}
            />
          </div>
        </section>
      </div>
    </ModuleShell>
  );
}

function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
      <p className="font-bold text-[#162033]">
        Preparing inbound shipment...
      </p>
    </main>
  );
}
