import Link from "next/link";

import { ExceptionActions } from "@/components/exception-actions";
import { MetricCard, ModuleHeading, ModuleShell } from "@/components/module-shell";
import type { Locale } from "@/lib/i18n";
import { getWorkspaceContext } from "@/lib/workspace";

type Severity = "critical" | "high" | "medium" | "low";
type ExceptionCategory = "inbound" | "damage" | "stalled" | "revenue";

type ExceptionItem = {
  id: string;
  shipmentId: string;
  inboundNumber: string;
  customer: string;
  warehouse: string;
  severity: Severity;
  category: ExceptionCategory;
  affectedUnits: number;
  summary: string;
  explanation: string;
  recommendation: string;
  expected: number;
  received: number;
  damaged: number;
  detectedAt: string;
  exceptionCaseId: string | null;
  status: "open" | "reviewing";
  assignedTo: string | null;
  proofCount: number;
  unpricedWork: number;
  revenueAtRisk: number;
};

type PageProps = {
  searchParams: Promise<{ severity?: string | string[]; category?: string | string[] }>;
};

const copy = {
  en: {
    eyebrow: "Operational action center",
    title: "FulfillOS Control Tower",
    description: "Exceptions, proof readiness and revenue risk in one prioritized workspace.",
    open: "Open exceptions",
    openDetail: "Deterministic issues requiring review",
    urgent: "Critical / High",
    urgentDetail: "Highest-priority operational risk",
    units: "Affected units",
    unitsDetail: "Units involved across open exceptions",
    revenue: "Revenue at risk",
    revenueDetail: (unpriced: number) => unpriced ? `${unpriced} unpriced billable ${unpriced === 1 ? "event" : "events"}` : "No uncaptured priced work detected",
    proof: "Proof of Work",
    proofDetail: (missing: number) => missing ? `${missing} open ${missing === 1 ? "case is" : "cases are"} missing linked proof` : "Evidence is linked to open operational cases",
    headline: (count: number) => `FulfillOS found ${count} ${count === 1 ? "thing" : "things"} worth your attention.`,
    headlineEmpty: "Nothing requires attention from the current deterministic rules.",
    honest: "Values come from real exception, evidence and billable-event records. Work without a configured price is shown as unpriced instead of receiving a fabricated dollar value.",
    needsAttention: "Needs attention",
    allSeverity: "All priorities",
    allCategory: "All categories",
    filter: "Filter",
    clear: "Clear",
    inbound: "Inbound discrepancy",
    damage: "Damage",
    stalled: "Stalled inbound",
    revenueCategory: "Revenue Protection",
    revenueAction: "Open Revenue Protection",
    revenueFound: (count: number) => `${count} captured ${count === 1 ? "service has" : "services have"} no approved rate. Configure pricing to turn real work into invoice-ready revenue.`,
    expected: "Expected",
    received: "Received",
    damaged: "Damaged",
    why: "Why FulfillOS flagged this",
    action: "Suggested action",
    view: "Open inbound and review",
    viewProof: "View evidence",
    reviewing: "Reviewing",
    openStatus: "Open",
    unpriced: "Unpriced work",
    emptyTitle: "Your exception inbox is clear",
    emptyBody: "No inbound records match this view. New exceptions will appear here from real operational data.",
    limited: "Showing rules evaluated against the 250 most recent inbound shipments for fast initial loading.",
  },
  es: {
    eyebrow: "Centro de acción operativa",
    title: "Torre de Control FulfillOS",
    description: "Excepciones, preparación de evidencia y riesgo de ingresos en un espacio priorizado.",
    open: "Excepciones abiertas",
    openDetail: "Problemas determinísticos por revisar",
    urgent: "Críticas / Altas",
    urgentDetail: "Mayor riesgo operativo",
    units: "Unidades afectadas",
    unitsDetail: "Unidades involucradas en excepciones abiertas",
    revenue: "Ingresos en riesgo",
    revenueDetail: (unpriced: number) => unpriced ? `${unpriced} ${unpriced === 1 ? "evento facturable sin precio" : "eventos facturables sin precio"}` : "No se detectó trabajo valorizado sin capturar",
    proof: "Prueba de Trabajo",
    proofDetail: (missing: number) => missing ? `${missing} ${missing === 1 ? "caso abierto no tiene" : "casos abiertos no tienen"} evidencia vinculada` : "La evidencia está vinculada a los casos operativos abiertos",
    headline: (count: number) => `FulfillOS encontró ${count} ${count === 1 ? "asunto" : "asuntos"} que requieren tu atención.`,
    headlineEmpty: "Nada requiere atención según las reglas determinísticas actuales.",
    honest: "Los valores provienen de excepciones, evidencias y eventos facturables reales. El trabajo sin tarifa configurada se muestra como no valorizado, sin inventar importes.",
    needsAttention: "Requiere atención",
    allSeverity: "Todas las prioridades",
    allCategory: "Todas las categorías",
    filter: "Filtrar",
    clear: "Limpiar",
    inbound: "Discrepancia inbound",
    damage: "Daño",
    stalled: "Recepción demorada",
    revenueCategory: "Protección de Ingresos",
    revenueAction: "Abrir Protección de Ingresos",
    revenueFound: (count: number) => `${count} ${count === 1 ? "servicio capturado no tiene" : "servicios capturados no tienen"} una tarifa aprobada. Configura precios para convertir trabajo real en ingresos listos para facturar.`,
    expected: "Esperado",
    received: "Recibido",
    damaged: "Dañado",
    why: "Por qué FulfillOS lo señaló",
    action: "Acción sugerida",
    view: "Abrir recepción y revisar",
    viewProof: "Ver evidencia",
    reviewing: "En revisión",
    openStatus: "Abierta",
    unpriced: "Trabajo sin precio",
    emptyTitle: "Tu bandeja de excepciones está limpia",
    emptyBody: "Ningún inbound coincide con esta vista. Las nuevas excepciones aparecerán aquí desde datos operativos reales.",
    limited: "Las reglas se evalúan sobre los 250 inbound más recientes para mantener una carga inicial rápida.",
  },
} as const;

export default async function ControlTowerPage({ searchParams }: PageProps) {
  const { supabase, organization, membership, email, locale } = await getWorkspaceContext();
  const params = await searchParams;
  const selectedSeverity = valueOf(params.severity);
  const selectedCategory = valueOf(params.category);
  const messages = copy[locale];

  const [shipmentsResult, customersResult, warehousesResult, casesResult, closedCasesResult, billableResult, proofResult] = await Promise.all([
    supabase
      .from("inbound_shipments")
      .select("id, customer_id, warehouse_id, inbound_number, status, expected_at, arrived_at, receiving_started_at, created_at, completed_at")
      .eq("organization_id", organization.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(250),
    supabase.from("customers").select("id, company_name").eq("organization_id", organization.id),
    supabase.from("warehouses").select("id, name, code").eq("organization_id", organization.id),
    supabase
      .from("exception_cases")
      .select("id, source_event_id, entity_type, entity_id, exception_type, severity, status, summary, details, assigned_to, created_at")
      .eq("organization_id", organization.id)
      .in("status", ["open", "reviewing"])
      .order("created_at", { ascending: false })
      .limit(250),
    supabase
      .from("exception_cases")
      .select("entity_type, entity_id, exception_type, status, details")
      .eq("organization_id", organization.id)
      .in("status", ["resolved", "dismissed"])
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("billable_events")
      .select("operational_event_id, billing_status, unit_price, amount")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("proof_of_work_evidence")
      .select("operational_event_id")
      .eq("organization_id", organization.id)
      .order("captured_at", { ascending: false })
      .limit(1000),
  ]);

  if (shipmentsResult.error || customersResult.error || warehousesResult.error || casesResult.error || closedCasesResult.error || billableResult.error || proofResult.error) {
    throw new Error(shipmentsResult.error?.message ?? customersResult.error?.message ?? warehousesResult.error?.message ?? casesResult.error?.message ?? closedCasesResult.error?.message ?? billableResult.error?.message ?? proofResult.error?.message ?? "Control Tower could not be loaded.");
  }

  const shipments = shipmentsResult.data ?? [];
  const shipmentIds = shipments.map((shipment) => shipment.id);
  const itemsResult = shipmentIds.length
      ? await supabase
        .from("inbound_shipment_items")
        .select("id, shipment_id, expected_quantity, received_quantity, damaged_quantity")
        .in("shipment_id", shipmentIds)
    : { data: [], error: null };

  if (itemsResult.error) throw new Error(itemsResult.error.message);

  const totals = new Map<string, { expected: number; received: number; damaged: number }>();
  for (const item of itemsResult.data ?? []) {
    const current = totals.get(item.shipment_id) ?? { expected: 0, received: 0, damaged: 0 };
    current.expected += item.expected_quantity;
    current.received += item.received_quantity;
    current.damaged += item.damaged_quantity;
    totals.set(item.shipment_id, current);
  }

  const customers = new Map((customersResult.data ?? []).map((customer) => [customer.id, customer.company_name]));
  const warehouses = new Map((warehousesResult.data ?? []).map((warehouse) => [warehouse.id, warehouse.code ? `${warehouse.name} · ${warehouse.code}` : warehouse.name]));
  const shipmentMap = new Map(shipments.map((shipment) => [shipment.id, shipment]));
  const itemShipmentMap = new Map((itemsResult.data ?? []).map((item) => [item.id, item.shipment_id]));

  const proofByEvent = new Map<string, number>();
  for (const proof of proofResult.data ?? []) {
    proofByEvent.set(proof.operational_event_id, (proofByEvent.get(proof.operational_event_id) ?? 0) + 1);
  }

  const billableByEvent = new Map<string, { unpriced: number; amount: number }>();
  const openBillable = (billableResult.data ?? []).filter(
    (event) => !["invoiced", "void", "cancelled"].includes(event.billing_status),
  );
  for (const event of openBillable) {
    if (!event.operational_event_id) continue;
    const current = billableByEvent.get(event.operational_event_id) ?? { unpriced: 0, amount: 0 };
    const amount = Number(event.amount);
    current.amount += Number.isFinite(amount) ? amount : 0;
    if (event.billing_status === "unpriced" || event.unit_price === null || event.amount === null) {
      current.unpriced += 1;
    }
    billableByEvent.set(event.operational_event_id, current);
  }

  const assignedUserIds = Array.from(
    new Set((casesResult.data ?? []).map((item) => item.assigned_to).filter((value): value is string => Boolean(value))),
  );
  const teamResult = assignedUserIds.length
    ? await supabase
        .from("team_profiles")
        .select("user_id, display_name")
        .eq("organization_id", organization.id)
        .in("user_id", assignedUserIds)
    : { data: [], error: null };

  if (teamResult.error) throw new Error(teamResult.error.message);
  const teamMap = new Map((teamResult.data ?? []).map((profile) => [profile.user_id, profile.display_name]));

  const persistedExceptions = (casesResult.data ?? []).flatMap((exceptionCase): ExceptionItem[] => {
    const details = asRecord(exceptionCase.details);
    const shipmentId = asText(details.shipment_id) ?? itemShipmentMap.get(exceptionCase.entity_id) ?? null;
    if (!shipmentId) return [];

    const shipment = shipmentMap.get(shipmentId);
    if (!shipment) return [];

    const total = totals.get(shipmentId) ?? { expected: 0, received: 0, damaged: 0 };
    const eventBilling = exceptionCase.source_event_id
      ? billableByEvent.get(exceptionCase.source_event_id) ?? { unpriced: 0, amount: 0 }
      : { unpriced: 0, amount: 0 };
    const category = categoryForException(exceptionCase.exception_type);

    return [{
      id: exceptionCase.id,
      exceptionCaseId: exceptionCase.id,
      shipmentId,
      inboundNumber: shipment.inbound_number,
      customer: customers.get(shipment.customer_id) ?? (locale === "es" ? "Cliente no disponible" : "Customer unavailable"),
      warehouse: warehouses.get(shipment.warehouse_id) ?? (locale === "es" ? "Almacén no disponible" : "Warehouse unavailable"),
      severity: normalizeSeverity(exceptionCase.severity),
      category,
      affectedUnits: affectedUnitsForException(exceptionCase.exception_type, details, total),
      summary: localizedCaseSummary(exceptionCase.exception_type, exceptionCase.summary, details, locale),
      explanation: persistedExplanation(exceptionCase.exception_type, locale),
      recommendation: persistedRecommendation(exceptionCase.exception_type, locale),
      expected: total.expected,
      received: total.received,
      damaged: total.damaged,
      detectedAt: exceptionCase.created_at,
      status: exceptionCase.status === "reviewing" ? "reviewing" : "open",
      assignedTo: exceptionCase.assigned_to ? teamMap.get(exceptionCase.assigned_to) ?? (locale === "es" ? "Miembro del equipo" : "Team member") : null,
      proofCount: exceptionCase.source_event_id ? proofByEvent.get(exceptionCase.source_event_id) ?? 0 : 0,
      unpricedWork: eventBilling.unpriced,
      revenueAtRisk: eventBilling.amount,
    }];
  });

  const persistedKeys = new Set(persistedExceptions.map((item) => `${item.shipmentId}:${item.category}`));
  const closedCoverage = new Map<string, number>();

  for (const exceptionCase of closedCasesResult.data ?? []) {
    const details = asRecord(exceptionCase.details);
    const shipmentId = asText(details.shipment_id) ?? itemShipmentMap.get(exceptionCase.entity_id) ?? null;
    if (!shipmentId || !shipmentMap.has(shipmentId)) continue;

    const category = categoryForException(exceptionCase.exception_type);
    const total = totals.get(shipmentId) ?? { expected: 0, received: 0, damaged: 0 };
    const key = `${shipmentId}:${category}`;
    const coveredUnits = affectedUnitsForException(exceptionCase.exception_type, details, total);
    closedCoverage.set(key, (closedCoverage.get(key) ?? 0) + coveredUnits);
  }

  const derivedExceptions = buildExceptions(shipments, totals, customers, warehouses, locale)
    .filter((item) => {
      const key = `${item.shipmentId}:${item.category}`;
      return !persistedKeys.has(key) && (closedCoverage.get(key) ?? 0) < item.affectedUnits;
    });
  const rank: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  const exceptions = [...persistedExceptions, ...derivedExceptions].sort(
    (a, b) => rank[b.severity] - rank[a.severity] || b.affectedUnits - a.affectedUnits || new Date(a.detectedAt).getTime() - new Date(b.detectedAt).getTime(),
  );
  const filtered = exceptions.filter((item) => (!selectedSeverity || item.severity === selectedSeverity) && (!selectedCategory || item.category === selectedCategory));
  const urgent = exceptions.filter((item) => item.severity === "critical" || item.severity === "high").length;
  const affectedUnits = exceptions.reduce((sum, item) => sum + item.affectedUnits, 0);
  const revenueAtRisk = openBillable.reduce((sum, event) => {
    const amount = Number(event.amount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const unpricedWork = openBillable.filter(
    (event) => event.billing_status === "unpriced" || event.unit_price === null || event.amount === null,
  ).length;
  const missingProof = persistedExceptions.filter((item) => item.proofCount === 0).length;
  const canManage = ["owner", "admin", "manager"].includes(membership.role);
  const canReview = ["owner", "admin", "manager", "operator", "employee"].includes(membership.role);

  return (
    <ModuleShell organizationName={organization.name} email={email} role={membership.role}>
      <ModuleHeading
        eyebrow={messages.eyebrow}
        title={messages.title}
        description={messages.description}
        action={<Link href="/revenue-protection" className="inline-flex min-h-12 items-center rounded-xl bg-violet-700 px-5 font-bold text-white transition hover:bg-violet-800">{messages.revenueAction}</Link>}
      />

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label={messages.open} value={String(exceptions.length)} detail={messages.openDetail} />
        <MetricCard label={messages.urgent} value={String(urgent)} detail={messages.urgentDetail} />
        <MetricCard label={messages.units} value={String(affectedUnits)} detail={messages.unitsDetail} />
        <MetricCard
          label={messages.revenue}
          value={revenueAtRisk > 0 ? formatCurrency(revenueAtRisk, locale) : unpricedWork > 0 ? messages.unpriced : "$0.00"}
          detail={messages.revenueDetail(unpricedWork)}
        />
        <MetricCard label={messages.proof} value={String((proofResult.data ?? []).length)} detail={messages.proofDetail(missingProof)} />
      </section>

      <section className="mt-6 rounded-3xl bg-[#162033] p-6 text-white shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#fdba2d]">{messages.needsAttention}</p>
        <h2 className="mt-3 text-2xl font-extrabold">{exceptions.length ? messages.headline(exceptions.length) : messages.headlineEmpty}</h2>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">{messages.honest}</p>
      </section>

      {unpricedWork > 0 ? (
        <section className="mt-6 flex flex-col justify-between gap-5 rounded-3xl border border-violet-200 bg-violet-50 p-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Revenue Protection</p>
            <p className="mt-2 max-w-3xl font-semibold leading-7 text-violet-950">{messages.revenueFound(unpricedWork)}</p>
          </div>
          <Link href="/revenue-protection" className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-violet-700 px-5 font-black text-white hover:bg-violet-800">{messages.revenueAction} →</Link>
        </section>
      ) : null}

      <form action="/control-tower" className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row">
        <select name="severity" defaultValue={selectedSeverity} className="min-h-12 rounded-xl border border-slate-300 bg-white px-4">
          <option value="">{messages.allSeverity}</option>
          {(["critical", "high", "medium", "low"] as Severity[]).map((severity) => <option key={severity} value={severity}>{severityLabel(severity, locale)}</option>)}
        </select>
        <select name="category" defaultValue={selectedCategory} className="min-h-12 rounded-xl border border-slate-300 bg-white px-4">
          <option value="">{messages.allCategory}</option>
          <option value="inbound">{messages.inbound}</option>
          <option value="damage">{messages.damage}</option>
          <option value="stalled">{messages.stalled}</option>
          <option value="revenue">{messages.revenueCategory}</option>
        </select>
        <button className="min-h-12 rounded-xl bg-[#162033] px-5 font-bold text-white" type="submit">{messages.filter}</button>
        {(selectedSeverity || selectedCategory) && <Link href="/control-tower" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-5 font-bold text-[#162033]">{messages.clear}</Link>}
      </form>

      {filtered.length ? (
        <section className="mt-6 space-y-4" aria-label={messages.needsAttention}>
          {filtered.map((item) => <ExceptionCard key={item.id} item={item} locale={locale} canManage={canManage} canReview={canReview} />)}
        </section>
      ) : (
        <section className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <div className="text-4xl" aria-hidden="true">✓</div>
          <h2 className="mt-4 text-2xl font-extrabold text-[#162033]">{messages.emptyTitle}</h2>
          <p className="mt-2 text-slate-500">{messages.emptyBody}</p>
        </section>
      )}
      <p className="mt-5 text-xs text-slate-400">{messages.limited}</p>
    </ModuleShell>
  );
}

function ExceptionCard({ item, locale, canManage, canReview }: { item: ExceptionItem; locale: Locale; canManage: boolean; canReview: boolean }) {
  const messages = copy[locale];
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1.5 ${severityColor(item.severity)}`} />
      <div className="p-6 sm:p-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${severityBadge(item.severity)}`}>{severityLabel(item.severity, locale)}</span>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${item.status === "reviewing" ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-700"}`}>
                {item.status === "reviewing" ? messages.reviewing : messages.openStatus}
              </span>
              {item.proofCount > 0 ? (
                <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                  ✓ {item.proofCount} Proof
                </span>
              ) : item.exceptionCaseId ? (
                <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-800">
                  {locale === "es" ? "Falta evidencia" : "Missing proof"}
                </span>
              ) : null}
            </div>
            <h2 className="mt-4 text-2xl font-extrabold text-[#162033]">{item.inboundNumber}</h2>
            <p className="mt-1 font-semibold text-slate-700">{item.customer}</p>
            <p className="text-sm text-slate-500">{item.warehouse}</p>
            {item.assignedTo ? <p className="mt-2 text-sm font-semibold text-sky-800">{locale === "es" ? "Asignada a" : "Assigned to"}: {item.assignedTo}</p> : null}
          </div>
          <div className="lg:text-right">
            <p className="text-xl font-extrabold text-[#162033]">{item.summary}</p>
            <p className="mt-1 text-xs text-slate-400">{new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", { dateStyle: "medium" }).format(new Date(item.detectedAt))}</p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-3 gap-3">
          <Quantity label={messages.expected} value={item.expected} />
          <Quantity label={messages.received} value={item.received} />
          <Quantity label={messages.damaged} value={item.damaged} />
        </dl>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{messages.why}</p><p className="mt-2 text-sm leading-6 text-slate-700">{item.explanation}</p></div>
          <div className="rounded-2xl bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-amber-700">{messages.action}</p><p className="mt-2 text-sm leading-6 text-slate-700">{item.recommendation}</p></div>
        </div>

        {(item.unpricedWork > 0 || item.revenueAtRisk > 0) ? (
          <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-violet-700">Revenue Protection</p>
            <p className="mt-1 font-bold text-violet-950">
              {item.revenueAtRisk > 0 ? formatCurrency(item.revenueAtRisk, locale) : messages.unpriced}
              {item.unpricedWork > 0 ? ` · ${item.unpricedWork} ${locale === "es" ? "evento(s) sin precio" : "unpriced event(s)"}` : ""}
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          {item.exceptionCaseId && canReview ? (
            <ExceptionActions
              exceptionId={item.exceptionCaseId}
              status={item.status}
              locale={locale}
              canManage={canManage}
            />
          ) : <div />}
          <div className="flex flex-col gap-2 sm:flex-row">
            {item.proofCount > 0 ? (
              <Link href={`/inbound/${item.shipmentId}#proof-of-work`} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-5 font-bold text-[#162033] transition hover:bg-slate-50">
                {messages.viewProof}
              </Link>
            ) : null}
            <Link href={`/inbound/${item.shipmentId}`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#f59e0b] px-5 font-bold text-[#162033] transition hover:bg-[#fbbf24]">{messages.view} →</Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function Quantity({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-slate-200 p-3 text-center"><dt className="text-xs font-bold uppercase text-slate-400">{label}</dt><dd className="mt-1 text-xl font-black text-[#162033]">{value}</dd></div>;
}

function buildExceptions(
  shipments: Array<{ id: string; customer_id: string; warehouse_id: string; inbound_number: string; status: string; expected_at: string | null; arrived_at: string | null; receiving_started_at: string | null; created_at: string; completed_at: string | null }>,
  totals: Map<string, { expected: number; received: number; damaged: number }>,
  customers: Map<string, string>,
  warehouses: Map<string, string>,
  locale: Locale,
) {
  const exceptions: ExceptionItem[] = [];
  const now = Date.now();

  for (const shipment of shipments) {
    if (shipment.status === "cancelled" || shipment.status === "draft") continue;
    const total = totals.get(shipment.id) ?? { expected: 0, received: 0, damaged: 0 };
    const difference = total.received - total.expected;
    const base = {
      shipmentId: shipment.id,
      inboundNumber: shipment.inbound_number,
      customer: customers.get(shipment.customer_id) ?? (locale === "es" ? "Cliente no disponible" : "Customer unavailable"),
      warehouse: warehouses.get(shipment.warehouse_id) ?? (locale === "es" ? "Almacén no disponible" : "Warehouse unavailable"),
      expected: total.expected,
      received: total.received,
      damaged: total.damaged,
      detectedAt: shipment.completed_at ?? shipment.expected_at ?? shipment.created_at,
      exceptionCaseId: null,
      status: "open" as const,
      assignedTo: null,
      proofCount: 0,
      unpricedWork: 0,
      revenueAtRisk: 0,
    };

    if (shipment.status === "completed" && difference !== 0) {
      const affected = Math.abs(difference);
      const ratio = total.expected > 0 ? affected / total.expected : 1;
      const shortage = difference < 0;
      exceptions.push({
        ...base,
        id: `${shipment.id}-${shortage ? "shortage" : "overage"}`,
        category: "inbound",
        severity: affected >= 50 || ratio >= 0.25 ? "critical" : affected >= 10 || ratio >= 0.1 ? "high" : "medium",
        affectedUnits: affected,
        summary: locale === "es" ? `${affected} unidades ${shortage ? "faltantes" : "sobrantes"}` : `${affected} units ${shortage ? "short" : "over"}`,
        explanation: locale === "es" ? `El inbound fue completado con ${total.received} unidades recibidas frente a ${total.expected} esperadas.` : `The inbound was completed with ${total.received} units received against ${total.expected} expected.`,
        recommendation: locale === "es" ? (shortage ? "Realiza un recuento antes de aceptar el faltante y documenta el resultado." : "Confirma el SKU y la cantidad adicional antes de aceptar el sobrante.") : (shortage ? "Perform a recount before accepting the shortage and document the result." : "Confirm the SKU and additional quantity before accepting the overage."),
      });
    }

    if (total.damaged > 0) {
      const ratio = total.received > 0 ? total.damaged / total.received : 1;
      exceptions.push({
        ...base,
        id: `${shipment.id}-damage`,
        category: "damage",
        severity: total.damaged >= 25 || ratio >= 0.2 ? "critical" : total.damaged >= 10 || ratio >= 0.05 ? "high" : "medium",
        affectedUnits: total.damaged,
        summary: locale === "es" ? `${total.damaged} unidades dañadas` : `${total.damaged} damaged units`,
        explanation: locale === "es" ? "La recepción contiene unidades dañadas que pueden afectar inventario utilizable y confianza del cliente." : "The receipt contains damaged units that may affect usable inventory and customer trust.",
        recommendation: locale === "es" ? "Revisa el detalle, separa el inventario afectado y conserva evidencia apropiada del daño." : "Review the detail, isolate affected inventory and retain appropriate damage evidence.",
      });
    }

    if (["expected", "arrived", "receiving"].includes(shipment.status)) {
      const reference =
        shipment.status === "receiving"
          ? shipment.receiving_started_at ?? shipment.arrived_at ?? shipment.expected_at ?? shipment.created_at
          : shipment.status === "arrived"
            ? shipment.arrived_at ?? shipment.expected_at ?? shipment.created_at
            : shipment.expected_at ?? shipment.created_at;
      const daysOpen = Math.floor((now - new Date(reference).getTime()) / 86_400_000);
      if (daysOpen >= 3) {
        exceptions.push({
          ...base,
          id: `${shipment.id}-stalled`,
          category: "stalled",
          severity: daysOpen >= 10 ? "critical" : daysOpen >= 7 ? "high" : "medium",
          affectedUnits: Math.max(total.expected - total.received, 0),
          summary: locale === "es" ? `${daysOpen} días sin completar` : `${daysOpen} days without completion`,
          explanation: locale === "es" ? `El inbound permanece en estado ${shipment.status} y superó el umbral operativo de 3 días.` : `The inbound remains ${shipment.status} and has exceeded the 3-day operating threshold.`,
          recommendation:
            shipment.status === "expected"
              ? locale === "es"
                ? "Abre el inbound: márcalo como llegado, reprograma la fecha o cancélalo con un motivo."
                : "Open the inbound: mark it as arrived, reschedule it, or cancel it with a reason."
              : shipment.status === "arrived"
                ? locale === "es"
                  ? "Inicia la recepción o asigna al próximo responsable."
                  : "Start receiving or assign the next responsible owner."
                : locale === "es"
                  ? "Continúa la recepción y documenta cualquier bloqueo antes de completarla."
                  : "Continue receiving and document any blocker before completion.",
        });
      }
    }
  }

  const rank: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  return exceptions.sort((a, b) => rank[b.severity] - rank[a.severity] || b.affectedUnits - a.affectedUnits || new Date(a.detectedAt).getTime() - new Date(b.detectedAt).getTime());
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function detailNumber(details: Record<string, unknown>, key: string) {
  const value = Number(details[key]);
  return Number.isFinite(value) ? value : 0;
}

function normalizeSeverity(value: string): Severity {
  return (["critical", "high", "medium", "low"] as const).includes(value as Severity)
    ? (value as Severity)
    : "medium";
}

function categoryForException(exceptionType: string): ExceptionCategory {
  if (exceptionType.includes("unpriced") || exceptionType.includes("billing") || exceptionType.includes("revenue")) return "revenue";
  if (exceptionType.includes("damage")) return "damage";
  if (exceptionType.includes("stalled") || exceptionType.includes("overdue")) return "stalled";
  return "inbound";
}

function affectedUnitsForException(
  exceptionType: string,
  details: Record<string, unknown>,
  totals: { expected: number; received: number; damaged: number },
) {
  if (exceptionType.includes("unpriced") || exceptionType.includes("billing")) {
    return detailNumber(details, "quantity") || 1;
  }
  if (exceptionType.includes("damage")) {
    return detailNumber(details, "damaged_increment") || totals.damaged;
  }
  if (exceptionType.includes("overage")) {
    return detailNumber(details, "overage_quantity") || Math.max(totals.received - totals.expected, 0);
  }
  if (exceptionType.includes("shortage")) {
    return detailNumber(details, "shortage_quantity") || Math.max(totals.expected - totals.received, 0);
  }
  return Math.max(Math.abs(totals.expected - totals.received), totals.damaged, 1);
}

function localizedCaseSummary(
  exceptionType: string,
  fallback: string,
  details: Record<string, unknown>,
  locale: Locale,
) {
  if (locale !== "es") return fallback;
  if (exceptionType === "inbound_damage") {
    const units = detailNumber(details, "damaged_increment");
    return `${units} ${units === 1 ? "unidad dañada" : "unidades dañadas"}`;
  }
  if (exceptionType === "inbound_overage") {
    const units = detailNumber(details, "overage_quantity");
    return `${units} ${units === 1 ? "unidad sobrante" : "unidades sobrantes"}`;
  }
  if (exceptionType === "unpriced_billable_work") {
    return `Trabajo ${asText(details.service_code)?.replaceAll("_", " ") ?? "facturable"} sin tarifa configurada`;
  }
  return fallback;
}

function persistedExplanation(exceptionType: string, locale: Locale) {
  const es = locale === "es";
  if (exceptionType === "inbound_damage") {
    return es
      ? "Una recepción física registró unidades dañadas. El caso está vinculado al evento operativo y a su evidencia."
      : "A physical receipt recorded damaged units. The case is linked to the operational event and its evidence.";
  }
  if (exceptionType === "inbound_overage") {
    return es
      ? "La cantidad recibida superó la esperada y requiere verificar SKU, conteo y disposición del excedente."
      : "Received quantity exceeded the expected amount and requires SKU, count, and disposition review.";
  }
  if (exceptionType === "unpriced_billable_work") {
    return es
      ? "FulfillOS capturó trabajo operativo real, pero no puede calcular su valor hasta que se apruebe una tarifa para el cliente."
      : "FulfillOS captured real operational work, but cannot calculate its value until a customer rate is approved.";
  }
  return es
    ? "Una regla determinística creó este caso desde un evento operativo real."
    : "A deterministic rule created this case from a real operational event.";
}

function persistedRecommendation(exceptionType: string, locale: Locale) {
  const es = locale === "es";
  if (exceptionType === "inbound_damage") {
    return es
      ? "Revisa la foto y la nota, confirma que las unidades estén separadas y documenta la resolución."
      : "Review the photo and note, confirm the units are isolated, and document the resolution.";
  }
  if (exceptionType === "inbound_overage") {
    return es
      ? "Realiza un recuento, confirma el SKU y acuerda si el excedente será aceptado o devuelto."
      : "Perform a recount, confirm the SKU, and decide whether the excess will be accepted or returned.";
  }
  if (exceptionType === "unpriced_billable_work") {
    return es
      ? "Configura la tarifa del cliente en Protección de Ingresos. FulfillOS valorizará el trabajo pendiente y resolverá esta excepción."
      : "Configure the customer rate in Revenue Protection. FulfillOS will price the pending work and resolve this exception.";
  }
  return es
    ? "Abre la operación, verifica la evidencia y registra el resultado antes de cerrar el caso."
    : "Open the operation, verify the evidence, and record the outcome before closing the case.";
}

function formatCurrency(amount: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "es" ? "es-US" : "en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function valueOf(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
function severityColor(severity: Severity) { return severity === "critical" ? "bg-red-600" : severity === "high" ? "bg-orange-500" : severity === "medium" ? "bg-amber-400" : "bg-slate-400"; }
function severityBadge(severity: Severity) { return severity === "critical" ? "bg-red-100 text-red-800" : severity === "high" ? "bg-orange-100 text-orange-800" : severity === "medium" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"; }
function severityLabel(severity: Severity, locale: Locale) {
  const labels = locale === "es" ? { critical: "Crítica", high: "Alta", medium: "Media", low: "Baja" } : { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
  return labels[severity];
}
