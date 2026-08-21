import Link from "next/link";

import { MetricCard, ModuleHeading, ModuleShell } from "@/components/module-shell";
import { formatUsd, serviceLabel, unitLabel } from "@/lib/revenue";
import { getWorkspaceContext } from "@/lib/workspace";

type BillableEvent = {
  id: string;
  customer_id: string;
  service_code: string;
  quantity: number | string;
  unit: string;
  unit_price: number | string | null;
  amount: number | string | null;
  currency_code: string;
  billing_status: string;
  created_at: string;
};

type UnpricedGroup = {
  key: string;
  customerId: string;
  serviceCode: string;
  unit: string;
  events: number;
  quantity: number;
  oldestAt: string;
};

const copy = {
  en: {
    eyebrow: "Every service captured",
    title: "Revenue Protection",
    description: "See work that could otherwise go unbilled, understand the exposure and move it toward invoice-ready revenue.",
    unpriced: "Unpriced work",
    unpricedDetail: "Operational events waiting for an approved customer rate",
    quantity: "Unpriced quantity",
    quantityDetail: "Billable units currently missing a price",
    ready: "Ready revenue",
    readyDetail: "Captured work priced and ready for invoicing",
    customers: "Customers affected",
    customersDetail: "Customer accounts with work currently at risk",
    waiting: "Work waiting for a rate",
    waitingBody: "These values are real operational quantities, not estimated revenue. FulfillOS calculates dollars only after an approved rate exists.",
    events: "events",
    oldest: "Oldest captured",
    configure: "Configure rate",
    clear: "No revenue currently at risk",
    clearBody: "Every captured billable event has an approved price or has already advanced beyond pricing.",
    access: "Billing access required",
    accessBody: "Only owners, admins, managers and billing users can view customer revenue records.",
  },
  es: {
    eyebrow: "Cada servicio capturado",
    title: "Protección de Ingresos",
    description: "Detecta trabajo que podría quedar sin facturar, comprende la exposición y conviértelo en ingresos listos para invoice.",
    unpriced: "Trabajo sin precio",
    unpricedDetail: "Eventos operativos esperando una tarifa aprobada del cliente",
    quantity: "Cantidad sin valorizar",
    quantityDetail: "Unidades facturables que todavía no tienen precio",
    ready: "Ingresos listos",
    readyDetail: "Trabajo valorizado y listo para facturar",
    customers: "Clientes afectados",
    customersDetail: "Cuentas de clientes con trabajo actualmente en riesgo",
    waiting: "Trabajo esperando una tarifa",
    waitingBody: "Estas son cantidades operativas reales, no ingresos estimados. FulfillOS calcula dólares únicamente cuando existe una tarifa aprobada.",
    events: "eventos",
    oldest: "Capturado desde",
    configure: "Configurar tarifa",
    clear: "No hay ingresos actualmente en riesgo",
    clearBody: "Todos los eventos facturables capturados tienen una tarifa aprobada o ya avanzaron en el proceso de facturación.",
    access: "Se requiere acceso de billing",
    accessBody: "Solo owners, admins, managers y usuarios de billing pueden ver registros de ingresos de clientes.",
  },
} as const;

export default async function RevenueProtectionPage() {
  const { supabase, organization, membership, email, locale } = await getWorkspaceContext();
  const messages = copy[locale];
  const canUseBilling = ["owner", "admin", "manager", "billing"].includes(membership.role);

  if (!canUseBilling) {
    return (
      <ModuleShell organizationName={organization.name} email={email} role={membership.role}>
        <ModuleHeading eyebrow={messages.eyebrow} title={messages.title} description={messages.description} />
        <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-8">
          <h2 className="text-2xl font-black text-[#162033]">{messages.access}</h2>
          <p className="mt-3 max-w-2xl leading-7 text-slate-700">{messages.accessBody}</p>
          <Link href="/dashboard" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-[#162033] px-5 font-bold text-white">
            {locale === "es" ? "Volver al resumen" : "Back to overview"}
          </Link>
        </section>
      </ModuleShell>
    );
  }

  const [customersResult, billableResult] = await Promise.all([
    supabase.from("customers").select("id, company_name").eq("organization_id", organization.id),
    supabase
      .from("billable_events")
      .select("id, customer_id, service_code, quantity, unit, unit_price, amount, currency_code, billing_status, created_at")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  if (customersResult.error || billableResult.error) {
    throw new Error(customersResult.error?.message ?? billableResult.error?.message ?? "Revenue Protection could not be loaded.");
  }

  const customers = customersResult.data ?? [];
  const events = (billableResult.data ?? []) as BillableEvent[];
  const customerNames = new Map(customers.map((customer) => [customer.id, customer.company_name]));
  const unpricedEvents = events.filter((event) => event.billing_status === "unpriced");
  const readyEvents = events.filter((event) => event.billing_status === "ready");
  const readyRevenue = readyEvents.reduce((total, event) => total + numeric(event.amount), 0);
  const unpricedQuantity = unpricedEvents.reduce((total, event) => total + numeric(event.quantity), 0);
  const groups = groupUnpricedEvents(unpricedEvents);
  const affectedCustomers = new Set(unpricedEvents.map((event) => event.customer_id)).size;

  return (
    <ModuleShell organizationName={organization.name} email={email} role={membership.role}>
      <ModuleHeading
        eyebrow={messages.eyebrow}
        title={messages.title}
        description={messages.description}
        action={<Link href="/service-rates" className="inline-flex min-h-12 items-center rounded-xl bg-[#f59e0b] px-5 font-black text-[#162033] hover:bg-[#fdba2d]">{locale === "es" ? "Abrir Tarifas de Servicios" : "Open Service Rates"}</Link>}
      />

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={messages.unpriced} value={String(unpricedEvents.length)} detail={messages.unpricedDetail} />
        <MetricCard label={messages.quantity} value={formatQuantity(unpricedQuantity)} detail={messages.quantityDetail} />
        <MetricCard label={messages.ready} value={formatUsd(readyRevenue, locale)} detail={messages.readyDetail} />
        <MetricCard label={messages.customers} value={String(affectedCustomers)} detail={messages.customersDetail} />
      </section>

      <section className="mt-7 grid gap-5 lg:grid-cols-3">
        <ProtectionStep number="1" title={locale === "es" ? "FulfillOS captura el trabajo" : "FulfillOS captures the work"} body={locale === "es" ? "Receiving, prep y otras acciones crean eventos facturables con trazabilidad." : "Receiving, prep and other actions create traceable billable events."} />
        <ProtectionStep number="2" title={locale === "es" ? "Encuentra ingresos expuestos" : "It finds exposed revenue"} body={locale === "es" ? "El trabajo sin precio permanece visible y genera una excepción accionable." : "Unpriced work stays visible and creates an actionable exception."} />
        <ProtectionStep number="3" title={locale === "es" ? "Tú apruebas la tarifa" : "You approve the rate"} body={locale === "es" ? "Al configurar el acuerdo, el trabajo pendiente se valoriza sin alterar el historial." : "Once the agreement is configured, pending work is priced without changing history."} />
      </section>

      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-2xl font-black text-[#162033]">{messages.waiting}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{messages.waitingBody}</p>
          </div>
          <Link href="/control-tower?view=revenue" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-bold text-[#162033]">
            {locale === "es" ? "Ver excepciones" : "View exceptions"}
          </Link>
        </div>
        {groups.length ? (
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {groups.map((group) => (
              <article key={group.key} className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-violet-700">{customerNames.get(group.customerId) ?? (locale === "es" ? "Cliente" : "Customer")}</p>
                    <h3 className="mt-1 text-lg font-black text-violet-950">{serviceLabel(group.serviceCode, locale)}</h3>
                    <p className="mt-1 text-sm text-violet-800">{group.events} {messages.events} · {formatQuantity(group.quantity)} {unitLabel(group.unit, locale)}</p>
                    <p className="mt-1 text-xs text-violet-600">{messages.oldest}: {formatDate(group.oldestAt, locale)}</p>
                  </div>
                  <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-violet-800">{messages.unpriced}</span>
                </div>
                <Link
                  href={`/service-rates?customer=${encodeURIComponent(group.customerId)}&service=${encodeURIComponent(group.serviceCode)}&unit=${encodeURIComponent(group.unit)}#customer-rate`}
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-violet-700 px-5 font-black text-white hover:bg-violet-800"
                >
                  {messages.configure}
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 p-8 text-center">
            <div className="text-3xl" aria-hidden="true">✓</div>
            <h3 className="mt-3 text-xl font-black text-emerald-950">{messages.clear}</h3>
            <p className="mt-2 text-sm text-emerald-800">{messages.clearBody}</p>
          </div>
        )}
      </section>

      <p className="mt-5 text-xs text-slate-400">{locale === "es" ? "La vista inicial se limita a los 1.000 eventos facturables más recientes para mantener una carga rápida." : "The initial view is limited to the 1,000 most recent billable events for fast loading."}</p>
    </ModuleShell>
  );
}

function ProtectionStep({ number, title, body }: { number: string; title: string; body: string }) {
  return <article className="rounded-2xl bg-[#162033] p-5 text-white"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f59e0b] font-black text-[#162033]">{number}</span><h2 className="mt-4 font-black">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-300">{body}</p></article>;
}

function groupUnpricedEvents(events: BillableEvent[]) {
  const groups = new Map<string, UnpricedGroup>();
  for (const event of events) {
    const key = `${event.customer_id}:${event.service_code}:${event.unit}`;
    const current = groups.get(key) ?? {
      key,
      customerId: event.customer_id,
      serviceCode: event.service_code,
      unit: event.unit,
      events: 0,
      quantity: 0,
      oldestAt: event.created_at,
    };
    current.events += 1;
    current.quantity += numeric(event.quantity);
    if (new Date(event.created_at).getTime() < new Date(current.oldestAt).getTime()) current.oldestAt = event.created_at;
    groups.set(key, current);
  }
  return [...groups.values()].sort((left, right) => right.events - left.events || left.oldestAt.localeCompare(right.oldestAt));
}

function numeric(value: number | string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(value);
}

function formatDate(value: string, locale: "en" | "es") {
  return new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", { dateStyle: "medium" }).format(new Date(value));
}
