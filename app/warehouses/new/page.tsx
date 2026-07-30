import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { WarehouseForm } from "./warehouse-form";

type NewWarehousePageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

export default function NewWarehousePage({
  searchParams,
}: NewWarehousePageProps) {
  return (
    <Suspense fallback={<NewWarehouseLoading />}>
      <NewWarehouseContent
        searchParams={searchParams}
      />
    </Suspense>
  );
}

async function NewWarehouseContent({
  searchParams,
}: NewWarehousePageProps) {
  const parameters = await searchParams;

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
      "/warehouses?error=You do not have permission to add warehouses.",
    );
  }

  const {
    data: organization,
    error: organizationError,
  } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", membership.organization_id)
    .single();

  if (organizationError) {
    throw new Error(
      `The company could not be loaded: ${organizationError.message}`,
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fa] px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/warehouses"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#162033] hover:text-[#c7511f]"
        >
          ← Back to warehouses
        </Link>

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-200 bg-[#162033] px-7 py-8 text-white sm:px-10">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#fdba2d]">
              {organization.name}
            </p>

            <h1 className="mt-3 text-3xl font-extrabold">
              Add a warehouse
            </h1>

            <p className="mt-3 max-w-xl leading-7 text-slate-300">
              Only the warehouse name is required. Address
              and operational details can be completed now
              or added later.
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

            <WarehouseForm />
          </div>
        </div>
      </div>
    </main>
  );
}

function NewWarehouseLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
      <p className="font-bold text-[#162033]">
        Preparing warehouse setup...
      </p>
    </main>
  );
}