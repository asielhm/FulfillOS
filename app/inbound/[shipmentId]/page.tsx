import Link from "next/link";
import { Suspense } from "react";
import {
  notFound,
  redirect,
} from "next/navigation";

import { ModuleShell } from "@/components/module-shell";
import {
  ProofOfWorkTimeline,
  type ProofEventView,
} from "@/components/proof-of-work-timeline";
import { getLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/server";

type InboundDetailProps = {
  params: Promise<{
    shipmentId: string;
  }>;

  searchParams: Promise<{
    created?: string | string[];
  }>;
};

export default function InboundDetailPage({
  params,
  searchParams,
}: InboundDetailProps) {
  return (
    <Suspense fallback={<Loading />}>
      <InboundDetailContent
        params={params}
        searchParams={searchParams}
      />
    </Suspense>
  );
}

async function InboundDetailContent({
  params,
  searchParams,
}: InboundDetailProps) {
  const { shipmentId } =
    await params;

  const parameters =
    await searchParams;

  const created = Array.isArray(
    parameters.created,
  )
    ? parameters.created[0]
    : parameters.created;

  const supabase =
    await createClient();

  const locale = await getLocale();
  const es = locale === "es";

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

  const email =
    typeof authData.claims.email ===
    "string"
      ? authData.claims.email
      : "Current user";

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

  if (
    membershipError ||
    !membership
  ) {
    redirect("/onboarding");
  }

  const {
    data: shipment,
    error: shipmentError,
  } = await supabase
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
        arrived_at,
        receiving_started_at,
        completed_at,
        notes,
        created_at
      `,
    )
    .eq("id", shipmentId)
    .eq(
      "organization_id",
      membership.organization_id,
    )
    .is("deleted_at", null)
    .maybeSingle();

  if (shipmentError) {
    throw new Error(
      shipmentError.message,
    );
  }

  if (!shipment) {
    notFound();
  }

  const [
    organizationResult,
    customerResult,
    warehouseResult,
    itemsResult,
    locationsResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("name")
      .eq("id", membership.organization_id)
      .single(),

    supabase
      .from("customers")
      .select(
        "id, company_name, reference_code",
      )
      .eq(
        "id",
        shipment.customer_id,
      )
      .single(),

    supabase
      .from("warehouses")
      .select("id, name, code")
      .eq(
        "id",
        shipment.warehouse_id,
      )
      .single(),

    supabase
      .from(
        "inbound_shipment_items",
      )
      .select(
        `
          id,
          product_id,
          expected_quantity,
          received_quantity,
          damaged_quantity
        `,
      )
      .eq(
        "shipment_id",
        shipment.id,
      )
      .order("created_at"),

    supabase
      .from("warehouse_locations")
      .select("id, name, code")
      .eq(
        "warehouse_id",
        shipment.warehouse_id,
      )
      .eq("is_active", true),
  ]);

  if (
    organizationResult.error ||
    customerResult.error ||
    warehouseResult.error ||
    itemsResult.error ||
    locationsResult.error
  ) {
    throw new Error(
      organizationResult.error
        ?.message ??
        customerResult.error
        ?.message ??
        warehouseResult.error
          ?.message ??
        itemsResult.error
          ?.message ??
        locationsResult.error
          ?.message ??
        "Inbound details could not be loaded.",
    );
  }

  const items =
    itemsResult.data ?? [];

  const productIds =
    items.map(
      (item) => item.product_id,
    );

  let products: {
    id: string;
    title: string;
    sku: string;
    asin: string | null;
  }[] = [];

  if (productIds.length > 0) {
    const {
      data,
      error,
    } = await supabase
      .from("products")
      .select(
        "id, title, sku, asin",
      )
      .in("id", productIds);

    if (error) {
      throw new Error(
        error.message,
      );
    }

    products = data ?? [];
  }

  const productMap = new Map(
    products.map((product) => [
      product.id,
      product,
    ]),
  );

  const itemIds =
    items.map((item) => item.id);

  let operationalEvents: {
    id: string;
    event_type: string;
    entity_id: string;
    actor_user_id: string | null;
    metadata: unknown;
    happened_at: string;
  }[] = [];

  if (itemIds.length > 0) {
    const result = await supabase
      .from("operational_events")
      .select("id, event_type, entity_id, actor_user_id, metadata, happened_at")
      .eq("organization_id", membership.organization_id)
      .eq("entity_type", "inbound_shipment_item")
      .in("entity_id", itemIds)
      .order("happened_at", { ascending: false })
      .limit(100);

    if (result.error) {
      throw new Error(result.error.message);
    }

    operationalEvents = result.data ?? [];
  }

  const shipmentAuditResult =
    await supabase
      .from("audit_events")
      .select(
        `
          id,
          actor_user_id,
          action,
          entity_type,
          entity_id,
          changed_fields,
          reason,
          happened_at
        `,
      )
      .eq(
        "organization_id",
        membership.organization_id,
      )
      .eq(
        "entity_type",
        "inbound_shipments",
      )
      .eq(
        "entity_id",
        shipment.id,
      );

  let itemAudit: typeof shipmentAuditResult.data =
    [];

  if (itemIds.length > 0) {
    const result =
      await supabase
        .from("audit_events")
        .select(
          `
            id,
            actor_user_id,
            action,
            entity_type,
            entity_id,
            changed_fields,
            reason,
            happened_at
          `,
        )
        .eq(
          "organization_id",
          membership.organization_id,
        )
        .eq(
          "entity_type",
          "inbound_shipment_items",
        )
        .in(
          "entity_id",
          itemIds,
        );

    if (result.error) {
      throw new Error(
        result.error.message,
      );
    }

    itemAudit =
      result.data ?? [];
  }

  if (shipmentAuditResult.error) {
    throw new Error(
      shipmentAuditResult.error
        .message,
    );
  }

  const auditEvents = [
    ...(shipmentAuditResult.data ??
      []),
    ...(itemAudit ?? []),
  ].sort(
    (a, b) =>
      new Date(
        b.happened_at,
      ).getTime() -
      new Date(
        a.happened_at,
      ).getTime(),
  );

  const operationalEventIds = operationalEvents.map((event) => event.id);
  let evidence: {
    id: string;
    operational_event_id: string;
    evidence_type: string;
    storage_bucket: string | null;
    storage_path: string | null;
    text_value: string | null;
    captured_by: string | null;
    captured_at: string;
  }[] = [];

  if (operationalEventIds.length > 0) {
    const result = await supabase
      .from("proof_of_work_evidence")
      .select(
        "id, operational_event_id, evidence_type, storage_bucket, storage_path, text_value, captured_by, captured_at",
      )
      .eq("organization_id", membership.organization_id)
      .in("operational_event_id", operationalEventIds)
      .order("captured_at", { ascending: true })
      .limit(250);

    if (result.error) {
      throw new Error(result.error.message);
    }

    evidence = result.data ?? [];
  }

  const teamUserIds = Array.from(
    new Set(
      [
        ...auditEvents.map((event) => event.actor_user_id),
        ...operationalEvents.map((event) => event.actor_user_id),
        ...evidence.map((item) => item.captured_by),
      ].filter((value): value is string => Boolean(value)),
    ),
  );

  let teamProfiles: {
    user_id: string;
    display_name: string;
    email: string | null;
  }[] = [];

  if (teamUserIds.length > 0) {
    const result = await supabase
      .from("team_profiles")
      .select("user_id, display_name, email")
      .eq("organization_id", membership.organization_id)
      .in("user_id", teamUserIds);

    if (result.error) {
      throw new Error(result.error.message);
    }

    teamProfiles = result.data ?? [];
  }

  const teamMap = new Map(
    teamProfiles.map((profile) => [
      profile.user_id,
      profile.display_name || profile.email || (es ? "Miembro del equipo" : "Team member"),
    ]),
  );

  const signedPhotoUrls = new Map<string, string>();
  const photosByBucket = new Map<string, { id: string; path: string }[]>();

  for (const item of evidence) {
    if (!item.storage_bucket || !item.storage_path) continue;
    const bucketPhotos = photosByBucket.get(item.storage_bucket) ?? [];
    bucketPhotos.push({ id: item.id, path: item.storage_path });
    photosByBucket.set(item.storage_bucket, bucketPhotos);
  }

  await Promise.all(
    Array.from(photosByBucket.entries()).map(async ([bucket, photos]) => {
      const result = await supabase.storage
        .from(bucket)
        .createSignedUrls(
          photos.map((photo) => photo.path),
          60 * 60,
        );

      if (result.error) {
        console.error("Proof of Work signed URL creation failed", result.error);
        return;
      }

      result.data.forEach((signed, index) => {
        if (signed.signedUrl) {
          signedPhotoUrls.set(photos[index].id, signed.signedUrl);
        }
      });
    }),
  );

  const itemMap = new Map(
    items.map((item) => [
      item.id,
      item,
    ]),
  );

  const evidenceByEvent = new Map<string, typeof evidence>();
  for (const item of evidence) {
    const eventEvidence = evidenceByEvent.get(item.operational_event_id) ?? [];
    eventEvidence.push(item);
    evidenceByEvent.set(item.operational_event_id, eventEvidence);
  }

  const locationMap = new Map(
    (locationsResult.data ?? []).map((location) => [
      location.id,
      `${location.name}${location.code ? ` · ${location.code}` : ""}`,
    ]),
  );

  const proofEvents: ProofEventView[] = operationalEvents.map((event) => {
    const metadata = asRecord(event.metadata);
    const item = itemMap.get(event.entity_id);
    const product = item ? productMap.get(item.product_id) : undefined;
    const locationId = asText(metadata.location_id);
    const locationName = asText(metadata.location_name);

    return {
      id: event.id,
      eventType: event.event_type,
      happenedAt: event.happened_at,
      actor: event.actor_user_id
        ? teamMap.get(event.actor_user_id) ?? (es ? "Miembro del equipo" : "Team member")
        : "FulfillOS",
      productTitle: product?.title ?? (es ? "Producto" : "Product"),
      sku: product?.sku ?? "—",
      receivedQuantity: asNumber(metadata.received_increment),
      goodQuantity: asNumber(metadata.good_increment),
      damagedQuantity: asNumber(metadata.damaged_increment),
      location:
        (locationId ? locationMap.get(locationId) : undefined) ??
        locationName ??
        (es ? "Ubicación registrada" : "Recorded location"),
      note: asText(metadata.note),
      evidence: (evidenceByEvent.get(event.id) ?? []).map((proof) => ({
        id: proof.id,
        type: proof.evidence_type,
        text: proof.text_value,
        capturedAt: proof.captured_at,
        capturedBy: proof.captured_by
          ? teamMap.get(proof.captured_by) ?? (es ? "Miembro del equipo" : "Team member")
          : "FulfillOS",
        photoUrl: signedPhotoUrls.get(proof.id) ?? null,
      })),
    };
  });

  const totals =
    items.reduce(
      (total, item) => ({
        expected:
          total.expected +
          item.expected_quantity,

        received:
          total.received +
          item.received_quantity,

        damaged:
          total.damaged +
          item.damaged_quantity,
      }),
      {
        expected: 0,
        received: 0,
        damaged: 0,
      },
    );

  const availableLocations =
    locationsResult.data?.length ??
    0;

  return (
    <ModuleShell
      organizationName={organizationResult.data.name}
      email={email}
      role={membership.role}
    >
      <div className="mx-auto max-w-7xl">
        <Link
          href="/inbound"
          className="mb-6 inline-flex min-h-11 items-center font-bold text-[#162033] hover:text-[#c7511f]"
        >
          ← All inbound
        </Link>

        {created === "1" && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            Inbound shipment created
            successfully.
          </div>
        )}

        <section className="rounded-3xl bg-[#162033] p-7 text-white shadow-xl sm:p-10">
          <StatusBadge
            status={shipment.status}
          />

          <h1 className="mt-5 text-4xl font-extrabold">
            {
              shipment.inbound_number
            }
          </h1>

          <p className="mt-3 text-lg font-semibold">
            {
              customerResult.data
                .company_name
            }
          </p>

          <p className="mt-1 text-slate-300">
            {
              warehouseResult.data
                .name
            }{" "}
            ·{" "}
            {
              warehouseResult.data
                .code
            }
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <HeroMetric
              label="Expected"
              value={String(
                totals.expected,
              )}
            />

            <HeroMetric
              label="Received"
              value={String(
                totals.received,
              )}
            />

            <HeroMetric
              label="Damaged"
              value={String(
                totals.damaged,
              )}
            />
          </div>
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#c7511f]">
                    Expected products
                  </p>

                  <h2 className="mt-2 text-xl font-extrabold text-[#162033]">
                    Shipment contents
                  </h2>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-500">
                  {items.length} SKUs
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {items.map((item) => {
                  const product =
                    productMap.get(
                      item.product_id,
                    );

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 p-5"
                    >
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                          <p className="font-extrabold text-[#162033]">
                            {product?.title ??
                              "Product"}
                          </p>

                          <p className="mt-1 font-mono text-sm text-slate-500">
                            SKU:{" "}
                            {product?.sku ??
                              "—"}
                          </p>
                        </div>

                        <div className="flex gap-6">
                          <Quantity
                            label="Expected"
                            value={
                              item.expected_quantity
                            }
                          />

                          <Quantity
                            label="Received"
                            value={
                              item.received_quantity
                            }
                          />

                          <Quantity
                            label="Damaged"
                            value={
                              item.damaged_quantity
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <ProofOfWorkTimeline locale={locale} events={proofEvents} />

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#c7511f]">
                Audit Trail
              </p>

              <h2 className="mt-2 text-xl font-extrabold text-[#162033]">
                {es ? "Cambios en el registro" : "Software record changes"}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {es
                  ? "Este historial administrativo se conserva por separado de la evidencia del trabajo físico."
                  : "This administrative history is retained separately from evidence of physical work."}
              </p>

              <div className="mt-6 space-y-3">
                {auditEvents.length ===
                0 ? (
                  <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
                    {es ? "Aún no hay actividad administrativa." : "No audit activity yet."}
                  </p>
                ) : (
                  auditEvents.map(
                    (event) => {
                      let subject =
                        shipment.inbound_number;

                      if (
                        event.entity_type ===
                        "inbound_shipment_items"
                      ) {
                        const item =
                          itemMap.get(
                            event.entity_id,
                          );

                        const product =
                          item
                            ? productMap.get(
                                item.product_id,
                              )
                            : undefined;

                        subject =
                          product?.sku ??
                          "Shipment item";
                      }

                      const actor =
                        event.actor_user_id ===
                        String(userId)
                          ? teamMap.get(String(userId)) ?? email
                          : event.actor_user_id
                            ? teamMap.get(event.actor_user_id) ??
                              (es ? "Miembro del equipo" : "Team member")
                            : "FulfillOS";

                      return (
                        <div
                          key={
                            event.id
                          }
                          className="flex gap-4 rounded-2xl border border-slate-200 p-4"
                        >
                          <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 font-black text-amber-800">
                            ✓
                          </div>

                          <div>
                            <p className="font-bold text-[#162033]">
                              {actor}{" "}
                              {formatAction(
                                event.action,
                              )}{" "}
                              {subject}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {new Date(
                                event.happened_at,
                              ).toLocaleString(
                                es ? "es-AR" : "en-US",
                              )}
                            </p>

                            {event.reason && (
                              <p className="mt-2 text-sm text-slate-600">
                                {es ? "Motivo:" : "Reason:"}{" "}
                                {
                                  event.reason
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    },
                  )
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#c7511f]">
                Receiving
              </p>

              {availableLocations >
              0 ? (
                <>
                  <h2 className="mt-2 text-xl font-extrabold text-[#162033]">
                    Ready to receive
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {
                      availableLocations
                    }{" "}
                    warehouse{" "}
                    {availableLocations ===
                    1
                      ? "location is"
                      : "locations are"}{" "}
                    available.
                  </p>

                  <Link
                    href={`/floor/receive/${shipment.id}`}
                    className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#f59e0b] px-5 py-3 text-center font-bold text-[#162033] transition hover:bg-[#fbbf24]"
                  >
                    {es ? "Recibir unidades en Modo Piso" : "Receive units in Floor Mode"}
                  </Link>
                </>
              ) : (
                <>
                  <h2 className="mt-2 text-xl font-extrabold text-[#162033]">
                    Location needed
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Add at least one
                    warehouse location
                    before receiving
                    inventory.
                  </p>

                  <Link
                    href={`/warehouses/${shipment.warehouse_id}`}
                    className="mt-5 inline-flex rounded-xl bg-[#f59e0b] px-5 py-3 font-bold text-[#162033]"
                  >
                    Configure warehouse
                  </Link>
                </>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#c7511f]">
                Shipment details
              </p>

              <dl className="mt-5 space-y-5">
                <Info
                  label="Customer reference"
                  value={
                    shipment.customer_reference ??
                    "Not added"
                  }
                />

                <Info
                  label="Carrier"
                  value={
                    shipment.carrier ??
                    "Not added"
                  }
                />

                <Info
                  label="Tracking"
                  value={
                    shipment.tracking_number ??
                    "Not added"
                  }
                />

                <Info
                  label="Expected"
                  value={
                    shipment.expected_at
                      ? new Intl.DateTimeFormat(
                          "en-US",
                          {
                            dateStyle:
                              "medium",
                            timeZone:
                              "UTC",
                          },
                        ).format(
                          new Date(
                            shipment.expected_at,
                          ),
                        )
                      : "Not specified"
                  }
                />
              </dl>

              {shipment.notes && (
                <div className="mt-6 border-t border-slate-200 pt-5">
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Notes
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {shipment.notes}
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-3xl bg-[#243247] p-6 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#fdba2d]">
                FulfillOS protection
              </p>

              <div className="mt-5 space-y-4 text-sm">
                <Protection
                  title="Proof of Work"
                  value={
                    proofEvents.length > 0
                      ? es
                        ? `${proofEvents.length} evento${proofEvents.length === 1 ? "" : "s"} verificable${proofEvents.length === 1 ? "" : "s"}`
                        : `${proofEvents.length} verifiable event${proofEvents.length === 1 ? "" : "s"}`
                      : es
                        ? "Comienza al recibir"
                        : "Starts when receiving begins"
                  }
                />

                <Protection
                  title="Revenue Protection"
                  value={
                    totals.received >
                    0
                      ? "Receiving captured"
                      : "No billable work yet"
                  }
                />

                <Protection
                  title="Exception Manager"
                  value="Monitoring shipment"
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </ModuleShell>
  );
}

function HeroMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-5">
      <p className="text-xs font-bold uppercase text-[#fdba2d]">
        {label}
      </p>

      <p className="mt-2 text-3xl font-extrabold">
        {value}
      </p>
    </div>
  );
}

function Quantity({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="text-right">
      <p className="text-xs font-bold uppercase text-slate-400">
        {label}
      </p>

      <p className="mt-1 font-extrabold text-[#162033]">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  return (
    <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
      {status
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) =>
          letter.toUpperCase(),
        )}
    </span>
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
      <dt className="text-xs font-bold uppercase text-slate-400">
        {label}
      </dt>

      <dd className="mt-1 break-words font-semibold text-[#162033]">
        {value}
      </dd>
    </div>
  );
}

function Protection({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div>
      <p className="font-bold">
        {title}
      </p>

      <p className="mt-1 text-slate-300">
        {value}
      </p>
    </div>
  );
}

function formatAction(
  action: string,
) {
  const labels: Record<
    string,
    string
  > = {
    created: "created",
    updated: "updated",
    status_changed:
      "changed the status of",
    cancelled: "cancelled",
    deleted: "deleted",
    restored: "restored",
  };

  return labels[action] ?? action;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
      <p className="font-bold text-[#162033]">
        Loading inbound...
      </p>
    </main>
  );
}
