import Link from "next/link";

import { MetricCard, ModuleHeading, ModuleShell } from "@/components/module-shell";
import type { Locale } from "@/lib/i18n";
import { getWorkspaceContext } from "@/lib/workspace";

type Severity = "critical" | "high" | "medium" | "low";
type ExceptionCategory = "inbound" | "damage" | "stalled";

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
    revenueValue: "Not configured",
    revenueDetail: "Pricing and billable-event ledger required",
    proof: "Proof of Work",
    proofValue: "Foundation needed",
    proofDetail: "Audit Trail exists; physical evidence ledger does not",
    headline: (count: number) => `FulfillOS found ${count} ${count === 1 ? "thing" : "things"} worth your attention.`,
    headlineEmpty: "Nothing requires attention from the current deterministic rules.",
    honest: "Revenue Protection and Proof of Work are shown as unavailable until their durable ledgers and pricing exist. FulfillOS will not invent amounts or treat software audit records as physical proof.",
    needsAttention: "Needs attention",
    allSeverity: "All priorities",
    allCategory: "All categories",
    filter: "Filter",
    clear: "Clear",
    inbound: "Inbound discrepancy",
    damage: "Damage",
    stalled: "Stalled inbound",
    expected: "Expected",
    received: "Received",
    damaged: "Damaged",
    why: "Why FulfillOS flagged this",
    action: "Suggested action",
    view: "Open inbound and review",
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
    revenueValue: "No configurado",
    revenueDetail: "Requiere tarifas y ledger de eventos facturables",
    proof: "Prueba de Trabajo",
    proofValue: "Falta la base",
    proofDetail: "Existe Audit Trail; no el ledger de evidencia física",
    headline: (count: number) => `FulfillOS encontró ${count} ${count === 1 ? "asunto" : "asuntos"} que requieren tu atención.`,
    headlineEmpty: "Nada requiere atención según las reglas determinísticas actuales.",
    honest: "Revenue Protection y Proof of Work figuran como no disponibles hasta que existan sus ledgers durables y tarifas. FulfillOS no inventará importes ni tratará auditoría de software como evidencia física.",
    needsAttention: "Requiere atención",
    allSeverity: "Todas las prioridades",
    allCategory: "Todas las categorías",
    filter: "Filtrar",
    clear: "Limpiar",
    inbound: "Discrepancia inbound",
    damage: "Daño",
    stalled: "Recepción demorada",
    expected: "Esperado",
    received: "Recibido",
    damaged: "Dañado",
    why: "Por qué FulfillOS lo señaló",
    action: "Acción sugerida",
    view: "Abrir recepción y revisar",
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

  const [shipmentsResult, customersResult, warehousesResult] = await Promise.all([
    supabase
      .from("inbound_shipments")
      .select("id, customer_id, warehouse_id, inbound_number, status, expected_at, created_at, completed_at")
      .eq("organization_id", organization.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(250),
    supabase.from("customers").select("id, company_name").eq("organization_id", organization.id),
    supabase.from("warehouses").select("id, name, code").eq("organization_id", organization.id),
  ]);

  if (shipmentsResult.error || customersResult.error || warehousesResult.error) {
    throw new Error(shipmentsResult.error?.message ?? customersResult.error?.message ?? warehousesResult.error?.message ?? "Control Tower could not be loaded.");
  }

  const shipments = shipmentsResult.data ?? [];
  const shipmentIds = shipments.map((shipment) => shipment.id);
  const itemsResult = shipmentIds.length
    ? await supabase
        .from("inbound_shipment_items")
        .select("shipment_id, expected_quantity, received_quantity, damaged_quantity")
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
  const exceptions = buildExceptions(shipments, totals, customers, warehouses, locale);
  const filtered = exceptions.filter((item) => (!selectedSeverity || item.severity === selectedSeverity) && (!selectedCategory || item.category === selectedCategory));
  const urgent = exceptions.filter((item) => item.severity === "critical" || item.severity === "high").length;
  const affectedUnits = exceptions.reduce((sum, item) => sum + item.affectedUnits, 0);

  return (
    <ModuleShell organizationName={organization.name} email={email} role={membership.role}>
      <ModuleHeading eyebrow={messages.eyebrow} title={messages.title} description={messages.description} />

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label={messages.open} value={String(exceptions.length)} detail={messages.openDetail} />
        <MetricCard label={messages.urgent} value={String(urgent)} detail={messages.urgentDetail} />
        <MetricCard label={messages.units} value={String(affectedUnits)} detail={messages.unitsDetail} />
        <MetricCard label={messages.revenue} value={messages.revenueValue} detail={messages.revenueDetail} />
        <MetricCard label={messages.proof} value={messages.proofValue} detail={messages.proofDetail} />
      </section>

      <section className="mt-6 rounded-3xl bg-[#162033] p-6 text-white shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#fdba2d]">{messages.needsAttention}</p>
        <h2 className="mt-3 text-2xl font-extrabold">{exceptions.length ? messages.headline(exceptions.length) : messages.headlineEmpty}</h2>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">{messages.honest}</p>
      </section>

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
        </select>
        <button className="min-h-12 rounded-xl bg-[#162033] px-5 font-bold text-white" type="submit">{messages.filter}</button>
        {(selectedSeverity || selectedCategory) && <Link href="/control-tower" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-5 font-bold text-[#162033]">{messages.clear}</Link>}
      </form>

      {filtered.length ? (
        <section className="mt-6 space-y-4" aria-label={messages.needsAttention}>
          {filtered.map((item) => <ExceptionCard key={item.id} item={item} locale={locale} />)}
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

function ExceptionCard({ item, locale }: { item: ExceptionItem; locale: Locale }) {
  const messages = copy[locale];
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1.5 ${severityColor(item.severity)}`} />
      <div className="p-6 sm:p-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row">
          <div>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${severityBadge(item.severity)}`}>{severityLabel(item.severity, locale)}</span>
            <h2 className="mt-4 text-2xl font-extrabold text-[#162033]">{item.inboundNumber}</h2>
            <p className="mt-1 font-semibold text-slate-700">{item.customer}</p>
            <p className="text-sm text-slate-500">{item.warehouse}</p>
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

        <div className="mt-6 flex justify-end">
          <Link href={`/inbound/${item.shipmentId}`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#f59e0b] px-5 font-bold text-[#162033] transition hover:bg-[#fbbf24]">{messages.view} →</Link>
        </div>
      </div>
    </article>
  );
}

function Quantity({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-slate-200 p-3 text-center"><dt className="text-xs font-bold uppercase text-slate-400">{label}</dt><dd className="mt-1 text-xl font-black text-[#162033]">{value}</dd></div>;
}

function buildExceptions(
  shipments: Array<{ id: string; customer_id: string; warehouse_id: string; inbound_number: string; status: string; expected_at: string | null; created_at: string; completed_at: string | null }>,
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
      const reference = shipment.expected_at ?? shipment.created_at;
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
          recommendation: locale === "es" ? "Abre la recepción, confirma su estado físico y define el próximo responsable." : "Open the inbound, confirm its physical status and identify the next responsible owner.",
        });
      }
    }
  }

  const rank: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  return exceptions.sort((a, b) => rank[b.severity] - rank[a.severity] || b.affectedUnits - a.affectedUnits || new Date(a.detectedAt).getTime() - new Date(b.detectedAt).getTime());
}

function valueOf(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
function severityColor(severity: Severity) { return severity === "critical" ? "bg-red-600" : severity === "high" ? "bg-orange-500" : severity === "medium" ? "bg-amber-400" : "bg-slate-400"; }
function severityBadge(severity: Severity) { return severity === "critical" ? "bg-red-100 text-red-800" : severity === "high" ? "bg-orange-100 text-orange-800" : severity === "medium" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"; }
function severityLabel(severity: Severity, locale: Locale) {
  const labels = locale === "es" ? { critical: "Crítica", high: "Alta", medium: "Media", low: "Baja" } : { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
  return labels[severity];
}
