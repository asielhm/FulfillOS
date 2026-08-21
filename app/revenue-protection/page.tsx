import Link from "next/link";
import type { ReactNode } from "react";

import { MetricCard, ModuleHeading, ModuleShell } from "@/components/module-shell";
import { billingUnits, formatUsd, serviceDefinitions, serviceLabel, unitLabel } from "@/lib/revenue";
import { getWorkspaceContext } from "@/lib/workspace";

type PageProps = {
  searchParams: Promise<{
    saved?: string | string[];
    events?: string | string[];
    exceptions?: string | string[];
    value?: string | string[];
    error?: string | string[];
  }>;
};

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
    description: "Turn operational work into defensible, invoice-ready revenue without changing inventory or fabricating prices.",
    unpriced: "Unpriced work",
    unpricedDetail: "Operational events waiting for a customer rate",
    quantity: "Unpriced quantity",
    quantityDetail: "Billable units currently missing a price",
    ready: "Ready revenue",
    readyDetail: "Captured work priced and ready for invoicing",
    rates: "Active rates",
    ratesDetail: "Current customer and service agreements",
    configure: "Configure a service rate",
    configureBody: "Saving a rate prices every matching unpriced event for this customer and preserves the amount on each billing record.",
    customer: "Customer",
    service: "Service",
    unit: "Billing unit",
    price: "Price per unit",
    save: "Save rate and price work",
    waiting: "Work waiting for a rate",
    waitingBody: "These values are operational quantities, not estimated revenue. FulfillOS will calculate dollars only after you approve a rate.",
    events: "events",
    oldest: "Oldest captured",
    apply: "Apply rate",
    active: "Active customer rates",
    activeBody: "New prices create a versioned rate. Previously priced work keeps its original amount.",
    noRates: "No rates configured yet.",
    clear: "No unpriced work",
    clearBody: "Every captured billable event currently has a price or has already moved beyond pricing.",
    access: "Billing access required",
    accessBody: "Only owners, admins, managers and billing users can view customer pricing and revenue records.",
  },
  es: {
    eyebrow: "Cada servicio capturado",
    title: "Protección de Ingresos",
    description: "Convierte trabajo operativo en ingresos defendibles y listos para facturar, sin modificar inventario ni inventar precios.",
    unpriced: "Trabajo sin precio",
    unpricedDetail: "Eventos operativos esperando una tarifa del cliente",
    quantity: "Cantidad sin valorizar",
    quantityDetail: "Unidades facturables que todavía no tienen precio",
    ready: "Ingresos listos",
    readyDetail: "Trabajo valorizado y listo para facturar",
    rates: "Tarifas activas",
    ratesDetail: "Acuerdos actuales por cliente y servicio",
    configure: "Configurar una tarifa de servicio",
    configureBody: "Al guardar, FulfillOS valoriza todos los eventos pendientes del mismo cliente y servicio y conserva el importe en cada registro.",
    customer: "Cliente",
    service: "Servicio",
    unit: "Unidad de cobro",
    price: "Precio por unidad",
    save: "Guardar tarifa y valorizar trabajo",
    waiting: "Trabajo esperando una tarifa",
    waitingBody: "Estas son cantidades operativas, no ingresos estimados. FulfillOS calcula dólares únicamente después de que apruebes una tarifa.",
    events: "eventos",
    oldest: "Capturado desde",
    apply: "Aplicar tarifa",
    active: "Tarifas activas por cliente",
    activeBody: "Cada cambio crea una versión nueva. El trabajo ya valorizado conserva su importe original.",
    noRates: "Todavía no hay tarifas configuradas.",
    clear: "No hay trabajo sin precio",
    clearBody: "Todos los eventos facturables capturados tienen precio o ya avanzaron en el proceso de facturación.",
    access: "Se requiere acceso de billing",
    accessBody: "Solo owners, admins, managers y usuarios de billing pueden ver precios e ingresos de clientes.",
  },
} as const;

export default async function RevenueProtectionPage({ searchParams }: PageProps) {
  const { supabase, organization, membership, email, locale } = await getWorkspaceContext();
  const messages = copy[locale];
  const canUseBilling = ["owner", "admin", "manager", "billing"].includes(membership.role);
  const params = await searchParams;

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

  const [customersResult, billableResult, ratesResult] = await Promise.all([
    supabase
      .from("customers")
      .select("id, company_name, reference_code, status")
      .eq("organization_id", organization.id)
      .neq("status", "inactive")
      .order("company_name"),
    supabase
      .from("billable_events")
      .select("id, customer_id, service_code, quantity, unit, unit_price, amount, currency_code, billing_status, created_at")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("customer_service_rates")
      .select("id, customer_id, service_code, service_name, unit, unit_price, currency_code, effective_from")
      .eq("organization_id", organization.id)
      .is("effective_to", null)
      .order("effective_from", { ascending: false })
      .limit(500),
  ]);

  if (customersResult.error || billableResult.error || ratesResult.error) {
    throw new Error(
      customersResult.error?.message
        ?? billableResult.error?.message
        ?? ratesResult.error?.message
        ?? "Revenue Protection could not be loaded.",
    );
  }

  const customers = customersResult.data ?? [];
  const events = (billableResult.data ?? []) as BillableEvent[];
  const rates = ratesResult.data ?? [];
  const customerNames = new Map(customers.map((customer) => [customer.id, customer.company_name]));
  const unpricedEvents = events.filter((event) => event.billing_status === "unpriced");
  const readyEvents = events.filter((event) => event.billing_status === "ready");
  const readyRevenue = readyEvents.reduce((total, event) => total + numeric(event.amount), 0);
  const unpricedQuantity = unpricedEvents.reduce((total, event) => total + numeric(event.quantity), 0);
  const groups = groupUnpricedEvents(unpricedEvents);
  const serviceCodes = Array.from(new Set([
    ...serviceDefinitions.map((definition) => definition.code),
    ...events.map((event) => event.service_code),
    ...rates.map((rate) => rate.service_code),
  ])).sort((left, right) => serviceLabel(left, locale).localeCompare(serviceLabel(right, locale)));

  const success = first(params.saved) === "1";
  const pricedEvents = safeInteger(first(params.events));
  const resolvedExceptions = safeInteger(first(params.exceptions));
  const capturedValue = safeNumber(first(params.value));
  const error = first(params.error);

  return (
    <ModuleShell organizationName={organization.name} email={email} role={membership.role}>
      <ModuleHeading
        eyebrow={messages.eyebrow}
        title={messages.title}
        description={messages.description}
        action={<Link href="/control-tower" className="inline-flex min-h-12 items-center rounded-xl border border-slate-300 bg-white px-5 font-bold text-[#162033]">{locale === "es" ? "Abrir Torre de Control" : "Open Control Tower"}</Link>}
      />

      {success ? (
        <div role="status" className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
          <p className="font-black">{locale === "es" ? "Tarifa guardada correctamente." : "Rate saved successfully."}</p>
          <p className="mt-1">
            {locale === "es"
              ? `${pricedEvents} evento(s) valorizado(s) · ${formatUsd(capturedValue, locale)} capturados · ${resolvedExceptions} excepción(es) resuelta(s).`
              : `${pricedEvents} event(s) priced · ${formatUsd(capturedValue, locale)} captured · ${resolvedExceptions} exception(s) resolved.`}
          </p>
        </div>
      ) : null}
      {error ? <div role="alert" className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-800">{error}</div> : null}

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={messages.unpriced} value={String(unpricedEvents.length)} detail={messages.unpricedDetail} />
        <MetricCard label={messages.quantity} value={formatQuantity(unpricedQuantity)} detail={messages.quantityDetail} />
        <MetricCard label={messages.ready} value={formatUsd(readyRevenue, locale)} detail={messages.readyDetail} />
        <MetricCard label={messages.rates} value={String(rates.length)} detail={messages.ratesDetail} />
      </section>

      <section className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c7511f]">Revenue Protection</p>
          <h2 className="mt-2 text-2xl font-black text-[#162033]">{messages.configure}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{messages.configureBody}</p>
          {customers.length ? (
            <form action="/api/revenue-protection/rates" method="post" className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label={messages.customer}>
                <select name="customerId" required className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4">
                  <option value="">{locale === "es" ? "Selecciona un cliente" : "Choose a customer"}</option>
                  {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.company_name} · {customer.reference_code}</option>)}
                </select>
              </Field>
              <Field label={messages.service}>
                <select name="serviceCode" defaultValue="receiving_unit" required className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4">
                  {serviceCodes.map((code) => <option key={code} value={code}>{serviceLabel(code, locale)}</option>)}
                </select>
              </Field>
              <Field label={messages.unit}>
                <select name="unit" defaultValue="unit" required className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4">
                  {billingUnits.map((unit) => <option key={unit} value={unit}>{unitLabel(unit, locale)}</option>)}
                </select>
              </Field>
              <Field label={`${messages.price} (USD)`}>
                <input name="unitPrice" type="number" min="0" max="1000000" step="0.0001" inputMode="decimal" placeholder="0.00" required className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-[#f59e0b]" />
              </Field>
              <input type="hidden" name="currencyCode" value="USD" />
              <button type="submit" className="min-h-12 rounded-xl bg-[#f59e0b] px-5 font-black text-[#162033] transition hover:bg-[#fdba2d] md:col-span-2">
                {messages.save}
              </button>
            </form>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
              {locale === "es" ? "Agrega un cliente antes de configurar tarifas." : "Add a customer before configuring rates."} <Link href="/customers/new" className="font-bold text-[#067d62] underline">{locale === "es" ? "Agregar cliente" : "Add customer"}</Link>
            </div>
          )}
        </div>

        <aside className="rounded-3xl bg-[#162033] p-7 text-white shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#fdba2d]">How it works</p>
          <ol className="mt-6 space-y-5">
            <Step number="1" title={locale === "es" ? "El trabajo ocurre" : "Work happens"} body={locale === "es" ? "Receiving y Floor Mode crean eventos facturables reales." : "Receiving and Floor Mode create real billable events."} />
            <Step number="2" title={locale === "es" ? "FulfillOS lo protege" : "FulfillOS protects it"} body={locale === "es" ? "Si falta una tarifa, lo mantiene visible como excepción." : "If a rate is missing, it remains visible as an exception."} />
            <Step number="3" title={locale === "es" ? "Tú apruebas el precio" : "You approve the price"} body={locale === "es" ? "La tarifa valoriza el trabajo pendiente y deja auditoría." : "The rate prices pending work and leaves an audit trail."} />
          </ol>
        </aside>
      </section>

      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <h2 className="text-2xl font-black text-[#162033]">{messages.waiting}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{messages.waitingBody}</p>
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
                <form action="/api/revenue-protection/rates" method="post" className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <input type="hidden" name="customerId" value={group.customerId} />
                  <input type="hidden" name="serviceCode" value={group.serviceCode} />
                  <input type="hidden" name="unit" value={group.unit} />
                  <input type="hidden" name="currencyCode" value="USD" />
                  <label className="sr-only" htmlFor={`rate-${group.key}`}>{messages.price}</label>
                  <input id={`rate-${group.key}`} name="unitPrice" type="number" min="0" max="1000000" step="0.0001" inputMode="decimal" placeholder="$0.00" required className="min-h-12 min-w-0 flex-1 rounded-xl border border-violet-200 bg-white px-4 outline-none focus:border-violet-500" />
                  <button type="submit" className="min-h-12 rounded-xl bg-violet-700 px-5 font-black text-white hover:bg-violet-800">{messages.apply}</button>
                </form>
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

      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <h2 className="text-2xl font-black text-[#162033]">{messages.active}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{messages.activeBody}</p>
        {rates.length ? (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400"><th className="pb-3 pr-4">{messages.customer}</th><th className="pb-3 pr-4">{messages.service}</th><th className="pb-3 pr-4">{messages.unit}</th><th className="pb-3 pr-4">{messages.price}</th><th className="pb-3">{locale === "es" ? "Vigente desde" : "Effective from"}</th></tr></thead>
              <tbody>{rates.map((rate) => <tr key={rate.id} className="border-b border-slate-100 last:border-0"><td className="py-4 pr-4 font-bold text-[#162033]">{customerNames.get(rate.customer_id) ?? (locale === "es" ? "Cliente" : "Customer")}</td><td className="py-4 pr-4">{serviceLabel(rate.service_code, locale)}</td><td className="py-4 pr-4">{unitLabel(rate.unit, locale)}</td><td className="py-4 pr-4 font-black text-[#067d62]">{formatUsd(numeric(rate.unit_price), locale)}</td><td className="py-4 text-slate-500">{formatDate(rate.effective_from, locale)}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <p className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">{messages.noRates}</p>}
      </section>

      <p className="mt-5 text-xs text-slate-400">{locale === "es" ? "La vista inicial se limita a los 1.000 eventos facturables más recientes para mantener una carga rápida." : "The initial view is limited to the 1,000 most recent billable events for fast loading."}</p>
    </ModuleShell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold text-[#162033]">{label}</span>{children}</label>;
}

function Step({ number, title, body }: { number: string; title: string; body: string }) {
  return <li className="flex gap-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f59e0b] font-black text-[#162033]">{number}</span><div><p className="font-black">{title}</p><p className="mt-1 text-sm leading-6 text-slate-300">{body}</p></div></li>;
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

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function safeInteger(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function safeNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(value);
}

function formatDate(value: string, locale: "en" | "es") {
  return new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", { dateStyle: "medium" }).format(new Date(value));
}
