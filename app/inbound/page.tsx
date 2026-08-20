import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ModuleShell } from "@/components/module-shell";
import { createClient } from "@/lib/supabase/server";

type InboundPageProps = {
  searchParams: Promise<{
    status?: string | string[];
    error?: string | string[];
  }>;
};

const allowedStatuses = new Set([
  "draft",
  "expected",
  "arrived",
  "receiving",
  "completed",
  "cancelled",
]);

export default function InboundPage({
  searchParams,
}: InboundPageProps) {
  return (
    <Suspense fallback={<Loading />}>
      <InboundContent
        searchParams={searchParams}
      />
    </Suspense>
  );
}

async function InboundContent({
  searchParams,
}: InboundPageProps) {
  const parameters =
    await searchParams;

  const rawStatus = Array.isArray(
    parameters.status,
  )
    ? parameters.status[0]
    : parameters.status;

  const selectedStatus =
    rawStatus &&
    allowedStatuses.has(rawStatus)
      ? rawStatus
      : "";

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

  const [
    organizationResult,
    customersResult,
    warehousesResult,
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
      ),

    supabase
      .from("warehouses")
      .select("id, name, code")
      .eq(
        "organization_id",
        membership.organization_id,
      ),
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

  let shipmentsQuery =
    supabase
      .from("inbound_shipments")
      .select(
        `
          id,
          customer_id,
          warehouse_id,
          inbound_number,
          customer_reference,
          carrier,
          tracking_number,
          status,
          expected_at,
          created_at
        `,
      )
      .eq(
        "organization_id",
        membership.organization_id,
      )
      .is("deleted_at", null)
      .order("created_at", {
        ascending: false,
      });

  if (selectedStatus) {
    shipmentsQuery =
      shipmentsQuery.eq(
        "status",
        selectedStatus,
      );
  }

  const {
    data: shipments,
    error: shipmentsError,
  } = await shipmentsQuery;

  if (shipmentsError) {
    throw new Error(
      shipmentsError.message,
    );
  }

  const shipmentList =
    shipments ?? [];

  const shipmentIds =
    shipmentList.map(
      (shipment) => shipment.id,
    );

  let items: {
    shipment_id: string;
    expected_quantity: number;
    received_quantity: number;
    damaged_quantity: number;
  }[] = [];

  if (shipmentIds.length > 0) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "inbound_shipment_items",
      )
      .select(
        `
          shipment_id,
          expected_quantity,
          received_quantity,
          damaged_quantity
        `,
      )
      .in(
        "shipment_id",
        shipmentIds,
      );

    if (error) {
      throw new Error(
        error.message,
      );
    }

    items = data ?? [];
  }

  const customerMap = new Map(
    (customersResult.data ?? []).map(
      (customer) => [
        customer.id,
        customer.company_name,
      ],
    ),
  );

  const warehouseMap = new Map(
    (warehousesResult.data ?? []).map(
      (warehouse) => [
        warehouse.id,
        warehouse,
      ],
    ),
  );

  const summaries = new Map<
    string,
    {
      lines: number;
      expected: number;
      received: number;
      damaged: number;
    }
  >();

  for (const item of items) {
    const current =
      summaries.get(
        item.shipment_id,
      ) ?? {
        lines: 0,
        expected: 0,
        received: 0,
        damaged: 0,
      };

    current.lines += 1;
    current.expected +=
      item.expected_quantity;
    current.received +=
      item.received_quantity;
    current.damaged +=
      item.damaged_quantity;

    summaries.set(
      item.shipment_id,
      current,
    );
  }

  const canCreate = [
    "owner",
    "admin",
    "manager",
  ].includes(membership.role);

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
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#c7511f]">
              Receiving
            </p>

            <h1 className="mt-2 text-4xl font-extrabold text-[#162033]">
              Inbound shipments
            </h1>

            <p className="mt-3 text-slate-600">
              Track what is expected,
              what arrived and what your
              team received.
            </p>
          </div>

          {canCreate && (
            <Link
              href="/inbound/new"
              className="rounded-xl bg-[#f59e0b] px-5 py-3 font-bold text-[#162033]"
            >
              + New inbound
            </Link>
          )}
        </div>

        {pageError && (
          <div className="mt-7 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {pageError}
          </div>
        )}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
          <form
            method="get"
            action="/inbound"
            className="flex flex-col gap-3 sm:flex-row"
          >
            <select
              name="status"
              defaultValue={
                selectedStatus
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3"
            >
              <option value="">
                All statuses
              </option>
              <option value="expected">
                Expected
              </option>
              <option value="arrived">
                Arrived
              </option>
              <option value="receiving">
                Receiving
              </option>
              <option value="completed">
                Completed
              </option>
              <option value="cancelled">
                Cancelled
              </option>
            </select>

            <button
              type="submit"
              className="rounded-xl bg-[#162033] px-5 py-3 font-bold text-white"
            >
              Filter
            </button>

            {selectedStatus && (
              <Link
                href="/inbound"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 font-bold text-[#162033]"
              >
                Clear
              </Link>
            )}
          </form>
        </section>

        {shipmentList.length ===
        0 ? (
          <section className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="text-5xl">
              📥
            </div>

            <h2 className="mt-5 text-2xl font-extrabold text-[#162033]">
              No inbound shipments yet
            </h2>

            <p className="mt-3 text-slate-500">
              Create the first expected
              shipment for your receiving
              team.
            </p>

            {canCreate && (
              <Link
                href="/inbound/new"
                className="mt-7 inline-flex rounded-xl bg-[#f59e0b] px-6 py-3 font-bold text-[#162033]"
              >
                Create first inbound
              </Link>
            )}
          </section>
        ) : (
          <section className="mt-6 space-y-4">
            {shipmentList.map(
              (shipment) => {
                const summary =
                  summaries.get(
                    shipment.id,
                  ) ?? {
                    lines: 0,
                    expected: 0,
                    received: 0,
                    damaged: 0,
                  };

                const warehouse =
                  warehouseMap.get(
                    shipment.warehouse_id,
                  );

                const percentage =
                  summary.expected > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (summary.received /
                            summary.expected) *
                            100,
                        ),
                      )
                    : 0;

                return (
                  <Link
                    key={shipment.id}
                    href={`/inbound/${shipment.id}`}
                    className="group block rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-amber-300 hover:shadow-md"
                  >
                    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-xl font-extrabold text-[#162033]">
                            {
                              shipment.inbound_number
                            }
                          </h2>

                          <StatusBadge
                            status={
                              shipment.status
                            }
                          />
                        </div>

                        <p className="mt-2 font-semibold text-[#162033]">
                          {customerMap.get(
                            shipment.customer_id,
                          ) ??
                            "Unknown customer"}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {warehouse?.name ??
                            "Unknown warehouse"}

                          {warehouse?.code
                            ? ` · ${warehouse.code}`
                            : ""}
                        </p>

                        {shipment.expected_at && (
                          <p className="mt-1 text-sm text-slate-500">
                            Expected{" "}
                            {formatDate(
                              shipment.expected_at,
                            )}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-4 lg:min-w-[390px]">
                        <Metric
                          label="SKUs"
                          value={String(
                            summary.lines,
                          )}
                        />

                        <Metric
                          label="Expected"
                          value={String(
                            summary.expected,
                          )}
                        />

                        <Metric
                          label="Received"
                          value={String(
                            summary.received,
                          )}
                        />
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span>
                          Receiving progress
                        </span>

                        <span>
                          {percentage}%
                        </span>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#f59e0b]"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
                      <span className="font-bold text-[#c7511f] transition group-hover:translate-x-1">
                        Open inbound →
                      </span>
                    </div>
                  </Link>
                );
              },
            )}
          </section>
        )}
      </div>
    </ModuleShell>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const labels: Record<
    string,
    string
  > = {
    draft: "Draft",
    expected: "Expected",
    arrived: "Arrived",
    receiving: "Receiving",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return (
    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
      {labels[status] ?? status}
    </span>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <p className="text-xs font-bold uppercase text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-extrabold text-[#162033]">
        {value}
      </p>
    </div>
  );
}

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(new Date(value));
}

function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
      <p className="font-bold text-[#162033]">
        Loading inbound shipments...
      </p>
    </main>
  );
}
