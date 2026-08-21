import Link from "next/link";
import type { ReactNode } from "react";

import { MetricCard, ModuleHeading, ModuleShell } from "@/components/module-shell";
import {
  billingUnits,
  formatUsd,
  organizationRateTemplate,
  serviceDefinitions,
  serviceLabel,
  unitLabel,
  type OrganizationRateTemplateItem,
} from "@/lib/revenue";
import { getWorkspaceContext } from "@/lib/workspace";

type PageProps = {
  searchParams: Promise<{
    saved?: string | string[];
    scope?: string | string[];
    updated?: string | string[];
    unchanged?: string | string[];
    events?: string | string[];
    exceptions?: string | string[];
    value?: string | string[];
    error?: string | string[];
    customer?: string | string[];
    service?: string | string[];
    unit?: string | string[];
  }>;
};

type CatalogRate = {
  id: string;
  service_code: string;
  unit: string;
  pricing_model: string;
  unit_price: number | string;
  minimum_quantity: number | string | null;
  maximum_quantity: number | string | null;
  effective_from: string;
};

const categoryCopy = {
  reception_storage: {
    en: { eyebrow: "Reception & Storage Services", title: "Inbound and storage", body: "Standard charges for receiving cartons and pallets and holding palletized inventory." },
    es: { eyebrow: "Servicios de recepción y almacenamiento", title: "Inbound y almacenamiento", body: "Cargos estándar por recibir cajas y pallets y almacenar inventario paletizado." },
  },
  labeling: {
    en: { eyebrow: "Volume Pricing", title: "Labeling rates", body: "A monthly base fee plus the applicable piece-volume tier. Tiers remain explicit so billing never assumes the wrong price." },
    es: { eyebrow: "Precios por volumen", title: "Tarifas de etiquetado", body: "Un cargo base mensual más el tramo aplicable por cantidad de piezas. Los tramos permanecen explícitos para evitar aplicar un precio incorrecto." },
  },
  preparation: {
    en: { eyebrow: "Individual Services", title: "Preparation & repackaging", body: "Unit and set prices for common value-added preparation work." },
    es: { eyebrow: "Servicios individuales", title: "Preparación y reempaque", body: "Precios por unidad y set para los trabajos de preparación más habituales." },
  },
  special_jobs: {
    en: { eyebrow: "Special Jobs", title: "Hourly labor", body: "A transparent hourly rate for non-standard warehouse work." },
    es: { eyebrow: "Trabajos especiales", title: "Mano de obra por hora", body: "Una tarifa horaria transparente para trabajos no estándar del almacén." },
  },
} as const;

const copy = {
  en: {
    eyebrow: "Pricing operations",
    title: "Service Rates",
    description: "Maintain your warehouse price card in one place, then create customer-specific agreements only when they are needed.",
    baseCard: "Base rate card",
    services: "Price rules",
    servicesDetail: "Flat, monthly and volume rules in this card",
    categories: "Service groups",
    categoriesDetail: "Receiving, labeling, preparation and special work",
    currency: "Currency",
    currencyDetail: "Current rate-card currency",
    status: "Rate-card status",
    active: "Configured",
    draft: "Template ready",
    statusDetail: "Save once to activate these organization defaults",
    defaultNote: "These are your organization defaults. They do not overwrite customer agreements or historical billing amounts.",
    saveAll: "Save complete rate card",
    mostCommon: "Most common",
    customTitle: "Customer-specific rates",
    customBody: "Create an override when a customer has a negotiated price. Saving it also prices matching unpriced work already captured for that customer.",
    customer: "Customer",
    service: "Service",
    unit: "Billing unit",
    price: "Price per unit",
    saveCustomer: "Save customer rate",
    agreements: "Active customer agreements",
    agreementsBody: "Customer agreements take precedence operationally. Existing priced work retains the amount originally captured.",
    noAgreements: "No customer-specific rates are active. The base price card remains available as your commercial reference.",
    access: "Billing access required",
    accessBody: "Only owners, admins, managers and billing users can view or change service pricing.",
  },
  es: {
    eyebrow: "Operación de precios",
    title: "Tarifas de Servicios",
    description: "Mantén la lista de precios del almacén en un solo lugar y crea acuerdos específicos por cliente únicamente cuando sea necesario.",
    baseCard: "Tarifa base",
    services: "Reglas de precio",
    servicesDetail: "Reglas planas, mensuales y por volumen en esta lista",
    categories: "Grupos de servicios",
    categoriesDetail: "Recepción, etiquetado, preparación y trabajos especiales",
    currency: "Moneda",
    currencyDetail: "Moneda actual de la lista de precios",
    status: "Estado de tarifas",
    active: "Configurada",
    draft: "Plantilla lista",
    statusDetail: "Guarda una vez para activar estos valores de la organización",
    defaultNote: "Estos son los valores base de tu organización. No reemplazan acuerdos por cliente ni importes históricos ya facturados.",
    saveAll: "Guardar lista completa de precios",
    mostCommon: "Más común",
    customTitle: "Tarifas específicas por cliente",
    customBody: "Crea una excepción cuando un cliente tenga un precio negociado. Al guardarla también se valoriza el trabajo pendiente que coincida para ese cliente.",
    customer: "Cliente",
    service: "Servicio",
    unit: "Unidad de cobro",
    price: "Precio por unidad",
    saveCustomer: "Guardar tarifa del cliente",
    agreements: "Acuerdos activos por cliente",
    agreementsBody: "Los acuerdos del cliente tienen prioridad operativa. El trabajo ya valorizado conserva el importe capturado originalmente.",
    noAgreements: "No hay tarifas específicas por cliente activas. La tarifa base sigue disponible como referencia comercial.",
    access: "Se requiere acceso de billing",
    accessBody: "Solo owners, admins, managers y usuarios de billing pueden ver o cambiar precios de servicios.",
  },
} as const;

export default async function ServiceRatesPage({ searchParams }: PageProps) {
  const { supabase, organization, membership, email, locale } = await getWorkspaceContext();
  const messages = copy[locale];
  const params = await searchParams;
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

  const [catalogResult, customersResult, customerRatesResult] = await Promise.all([
    supabase
      .from("organization_service_rates")
      .select("id, service_code, unit, pricing_model, unit_price, minimum_quantity, maximum_quantity, effective_from")
      .eq("organization_id", organization.id)
      .is("effective_to", null)
      .order("effective_from", { ascending: false }),
    supabase
      .from("customers")
      .select("id, company_name, reference_code, status")
      .eq("organization_id", organization.id)
      .neq("status", "inactive")
      .order("company_name"),
    supabase
      .from("customer_service_rates")
      .select("id, customer_id, service_code, service_name, unit, unit_price, currency_code, effective_from")
      .eq("organization_id", organization.id)
      .is("effective_to", null)
      .order("effective_from", { ascending: false })
      .limit(500),
  ]);

  if (catalogResult.error || customersResult.error || customerRatesResult.error) {
    throw new Error(
      catalogResult.error?.message
        ?? customersResult.error?.message
        ?? customerRatesResult.error?.message
        ?? "Service Rates could not be loaded.",
    );
  }

  const catalogRates = (catalogResult.data ?? []) as CatalogRate[];
  const customers = customersResult.data ?? [];
  const customerRates = customerRatesResult.data ?? [];
  const customerNames = new Map(customers.map((customer) => [customer.id, customer.company_name]));
  const serviceCodes = Array.from(new Set([
    ...serviceDefinitions.map((definition) => definition.code),
    ...customerRates.map((rate) => rate.service_code),
  ])).sort((left, right) => serviceLabel(left, locale).localeCompare(serviceLabel(right, locale)));

  const saved = first(params.saved) === "1";
  const savedScope = first(params.scope);
  const error = first(params.error);
  const requestedCustomer = validOption(first(params.customer), customers.map((customer) => customer.id));
  const requestedService = validOption(first(params.service), serviceCodes) || "receiving_unit";
  const requestedUnit = validOption(first(params.unit), [...billingUnits]) || "unit";

  return (
    <ModuleShell organizationName={organization.name} email={email} role={membership.role}>
      <ModuleHeading
        eyebrow={messages.eyebrow}
        title={messages.title}
        description={messages.description}
        action={<Link href="/revenue-protection" className="inline-flex min-h-12 items-center rounded-xl border border-slate-300 bg-white px-5 font-bold text-[#162033]">{locale === "es" ? "Ver Protección de Ingresos" : "View Revenue Protection"}</Link>}
      />

      {saved ? (
        <div role="status" className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
          <p className="font-black">
            {savedScope === "customer"
              ? (locale === "es" ? "Tarifa del cliente guardada correctamente." : "Customer rate saved successfully.")
              : (locale === "es" ? "Lista de precios guardada correctamente." : "Rate card saved successfully.")}
          </p>
          <p className="mt-1">
            {savedScope === "customer"
              ? customerSuccessText(params, locale)
              : catalogSuccessText(params, locale)}
          </p>
        </div>
      ) : null}
      {error ? <div role="alert" className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-800">{error}</div> : null}

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={messages.baseCard} value={organization.name} detail={messages.defaultNote} />
        <MetricCard label={messages.services} value={String(organizationRateTemplate.length)} detail={messages.servicesDetail} />
        <MetricCard label={messages.categories} value="4" detail={messages.categoriesDetail} />
        <MetricCard label={messages.status} value={catalogRates.length ? messages.active : messages.draft} detail={messages.statusDetail} />
      </section>

      <form action="/api/service-rates" method="post" className="mt-7 space-y-6">
        <div className="overflow-hidden rounded-3xl bg-[#162033] text-white shadow-sm">
          <div className="grid gap-5 p-7 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#fdba2d]">{messages.baseCard}</p>
              <h2 className="mt-2 text-2xl font-black">{organization.name}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{messages.defaultNote}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-300">{messages.currency}</p>
              <p className="mt-1 text-2xl font-black text-white">USD</p>
            </div>
          </div>
        </div>

        {(Object.keys(categoryCopy) as Array<keyof typeof categoryCopy>).map((category) => {
          const categoryMessages = categoryCopy[category][locale];
          const definitions = organizationRateTemplate.filter((definition) => definition.category === category);
          return (
            <section key={category} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c7511f]">{categoryMessages.eyebrow}</p>
              <h2 className="mt-2 text-2xl font-black text-[#162033]">{categoryMessages.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{categoryMessages.body}</p>
              <div className={`mt-6 grid gap-4 ${category === "labeling" ? "lg:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>
                {definitions.map((definition) => (
                  <RateEditor
                    key={definition.key}
                    definition={definition}
                    locale={locale}
                    currentPrice={catalogPrice(definition, catalogRates)}
                    mostCommon={messages.mostCommon}
                  />
                ))}
              </div>
            </section>
          );
        })}

        <div className="sticky bottom-4 z-10 flex justify-end">
          <button type="submit" className="min-h-14 rounded-2xl bg-[#f59e0b] px-7 font-black text-[#162033] shadow-lg shadow-amber-900/15 transition hover:bg-[#fdba2d]">
            {messages.saveAll}
          </button>
        </div>
      </form>

      <section id="customer-rate" className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">{locale === "es" ? "Acuerdos comerciales" : "Commercial agreements"}</p>
        <h2 className="mt-2 text-2xl font-black text-[#162033]">{messages.customTitle}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{messages.customBody}</p>
        {customers.length ? (
          <form action="/api/revenue-protection/rates" method="post" className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label={messages.customer}>
              <select name="customerId" defaultValue={requestedCustomer} required className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4">
                <option value="">{locale === "es" ? "Selecciona un cliente" : "Choose a customer"}</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.company_name} · {customer.reference_code}</option>)}
              </select>
            </Field>
            <Field label={messages.service}>
              <select name="serviceCode" defaultValue={requestedService} required className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4">
                {serviceCodes.map((code) => <option key={code} value={code}>{serviceLabel(code, locale)}</option>)}
              </select>
            </Field>
            <Field label={messages.unit}>
              <select name="unit" defaultValue={requestedUnit} required className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4">
                {billingUnits.map((unit) => <option key={unit} value={unit}>{unitLabel(unit, locale)}</option>)}
              </select>
            </Field>
            <Field label={`${messages.price} (USD)`}>
              <input name="unitPrice" type="number" min="0" max="1000000" step="0.0001" inputMode="decimal" placeholder="0.00" required className="min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-[#f59e0b]" />
            </Field>
            <input type="hidden" name="currencyCode" value="USD" />
            <button type="submit" className="min-h-12 rounded-xl bg-violet-700 px-5 font-black text-white transition hover:bg-violet-800 md:col-span-2">
              {messages.saveCustomer}
            </button>
          </form>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
            {locale === "es" ? "Agrega un cliente antes de configurar acuerdos." : "Add a customer before configuring agreements."} <Link href="/customers/new" className="font-bold text-[#067d62] underline">{locale === "es" ? "Agregar cliente" : "Add customer"}</Link>
          </div>
        )}
      </section>

      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <h2 className="text-2xl font-black text-[#162033]">{messages.agreements}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{messages.agreementsBody}</p>
        {customerRates.length ? (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400"><th className="pb-3 pr-4">{messages.customer}</th><th className="pb-3 pr-4">{messages.service}</th><th className="pb-3 pr-4">{messages.unit}</th><th className="pb-3 pr-4">{messages.price}</th><th className="pb-3">{locale === "es" ? "Vigente desde" : "Effective from"}</th></tr></thead>
              <tbody>{customerRates.map((rate) => <tr key={rate.id} className="border-b border-slate-100 last:border-0"><td className="py-4 pr-4 font-bold text-[#162033]">{customerNames.get(rate.customer_id) ?? (locale === "es" ? "Cliente" : "Customer")}</td><td className="py-4 pr-4">{serviceLabel(rate.service_code, locale)}</td><td className="py-4 pr-4">{unitLabel(rate.unit, locale)}</td><td className="py-4 pr-4 font-black text-[#067d62]">{formatUsd(numeric(rate.unit_price), locale)}</td><td className="py-4 text-slate-500">{formatDate(rate.effective_from, locale)}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <p className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">{messages.noAgreements}</p>}
      </section>
    </ModuleShell>
  );
}

function RateEditor({
  definition,
  locale,
  currentPrice,
  mostCommon,
}: {
  definition: OrganizationRateTemplateItem;
  locale: "en" | "es";
  currentPrice: number;
  mostCommon: string;
}) {
  return (
    <label className={`relative block rounded-2xl border p-5 transition focus-within:ring-2 focus-within:ring-[#f59e0b] ${definition.featured ? "border-[#f59e0b] bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
      {definition.featured ? <span className="absolute right-4 top-4 rounded-full bg-[#f59e0b] px-3 py-1 text-[10px] font-black uppercase tracking-wide text-[#162033]">{mostCommon}</span> : null}
      <span className={`block font-black text-[#162033] ${definition.featured ? "pr-28" : ""}`}>{definition.name[locale]}</span>
      <span className="mt-1 block min-h-10 text-sm leading-5 text-slate-500">{definition.description[locale]}</span>
      <span className="mt-4 flex items-center gap-2">
        <span className="text-lg font-black text-slate-500">$</span>
        <input
          name={`price-${definition.key}`}
          type="number"
          min="0"
          max="1000000"
          step="0.0001"
          inputMode="decimal"
          defaultValue={formatInputPrice(currentPrice)}
          required
          aria-label={`${definition.name[locale]} USD`}
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-lg font-black text-[#162033] outline-none focus:border-[#f59e0b]"
        />
        <span className="max-w-24 text-xs font-semibold leading-4 text-slate-500">USD {definition.priceSuffix[locale]}</span>
      </span>
    </label>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold text-[#162033]">{label}</span>{children}</label>;
}

function catalogPrice(definition: OrganizationRateTemplateItem, rates: CatalogRate[]) {
  const rate = rates.find((candidate) => (
    candidate.service_code === definition.serviceCode
    && candidate.unit === definition.unit
    && candidate.pricing_model === definition.pricingModel
    && nullableNumeric(candidate.minimum_quantity) === definition.minimumQuantity
    && nullableNumeric(candidate.maximum_quantity) === definition.maximumQuantity
  ));
  return rate ? numeric(rate.unit_price) : definition.defaultPrice;
}

function nullableNumeric(value: number | string | null) {
  if (value === null) return null;
  return numeric(value);
}

function numeric(value: number | string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatInputPrice(value: number) {
  return value.toFixed(4).replace(/\.?0+$/, "");
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

function validOption(value: string, allowed: readonly string[]) {
  return allowed.includes(value) ? value : "";
}

function catalogSuccessText(params: Awaited<PageProps["searchParams"]>, locale: "en" | "es") {
  const updated = safeInteger(first(params.updated));
  const unchanged = safeInteger(first(params.unchanged));
  return locale === "es"
    ? `${updated} regla(s) actualizada(s) · ${unchanged} sin cambios.`
    : `${updated} rule(s) updated · ${unchanged} unchanged.`;
}

function customerSuccessText(params: Awaited<PageProps["searchParams"]>, locale: "en" | "es") {
  const events = safeInteger(first(params.events));
  const exceptions = safeInteger(first(params.exceptions));
  const value = safeNumber(first(params.value));
  return locale === "es"
    ? `${events} evento(s) valorizado(s) · ${formatUsd(value, locale)} capturados · ${exceptions} excepción(es) resuelta(s).`
    : `${events} event(s) priced · ${formatUsd(value, locale)} captured · ${exceptions} exception(s) resolved.`;
}

function formatDate(value: string, locale: "en" | "es") {
  return new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", { dateStyle: "medium" }).format(new Date(value));
}
