"use client";

import { useMemo, useState } from "react";

import type { Locale } from "@/lib/i18n";
import { billingUnits, organizationRateTemplate, unitLabel } from "@/lib/revenue";

export type ServiceRateDraft = {
  key: string;
  serviceCode: string;
  name: string;
  category: string;
  description: string;
  unit: string;
  pricingModel: "flat" | "volume_tier" | "monthly_base";
  price: string;
  minimumQuantity: string;
  maximumQuantity: string;
  featured: boolean;
};

const categories = [
  { value: "reception_storage", en: "Reception & storage", es: "Recepción y almacenamiento" },
  { value: "labeling", en: "Labeling", es: "Etiquetado" },
  { value: "preparation", en: "Preparation & repackaging", es: "Preparación y reempaque" },
  { value: "inventory", en: "Inventory services", es: "Servicios de inventario" },
  { value: "outbound", en: "Outbound", es: "Despachos" },
  { value: "special_jobs", en: "Special jobs", es: "Trabajos especiales" },
  { value: "custom", en: "Other services", es: "Otros servicios" },
] as const;

const pricingModels = [
  { value: "flat", en: "Price per billing unit", es: "Precio por unidad de cobro" },
  { value: "monthly_base", en: "Monthly base fee", es: "Cargo base mensual" },
  { value: "volume_tier", en: "Volume tier", es: "Tramo por volumen" },
] as const;

const copy = {
  en: {
    eyebrow: "Build your price card",
    title: "Services and pricing rules",
    body: "Create simple rates, recurring base fees or multi-tier volume pricing. Nothing affects customer billing until you explicitly create or update a customer agreement.",
    addUnit: "Add unit service",
    addMonthly: "Add monthly fee",
    addVolume: "Add volume plan",
    loadTemplate: "Load Treemoon template",
    rules: "pricing rules",
    groups: "service groups",
    serviceName: "Service name",
    description: "Description shown on the price card",
    category: "Category",
    model: "Pricing model",
    unit: "Billing unit",
    price: "Price",
    minimum: "From quantity",
    maximum: "Through quantity (optional)",
    openEnded: "Leave empty for no upper limit.",
    featured: "Mark as most common",
    addTier: "Add another tier",
    duplicate: "Duplicate",
    remove: "Remove",
    save: "Save complete price card",
    saveNote: "Saving versions changed rules and archives removed rules. Historical prices remain intact.",
    empty: "Add at least one service to build your price card.",
    monthlyName: "New monthly service",
    monthlyDescription: "Recurring monthly service fee",
    unitName: "New warehouse service",
    unitDescription: "Describe the work included in this service",
    volumeName: "New volume service",
    volumeDescription: "Pricing based on the number of pieces processed",
    tier: "Volume tier",
    base: "Monthly base",
    mostCommon: "Most common",
  },
  es: {
    eyebrow: "Arma tu lista de precios",
    title: "Servicios y reglas de precio",
    body: "Crea tarifas simples, cargos base recurrentes o precios por volumen con varios tramos. Nada afecta la facturación del cliente hasta que crees o actualices explícitamente su acuerdo.",
    addUnit: "Agregar servicio por unidad",
    addMonthly: "Agregar cargo mensual",
    addVolume: "Agregar plan por volumen",
    loadTemplate: "Cargar plantilla Treemoon",
    rules: "reglas de precio",
    groups: "grupos de servicios",
    serviceName: "Nombre del servicio",
    description: "Descripción visible en la lista de precios",
    category: "Categoría",
    model: "Modelo de precio",
    unit: "Unidad de cobro",
    price: "Precio",
    minimum: "Desde cantidad",
    maximum: "Hasta cantidad (opcional)",
    openEnded: "Déjalo vacío si no existe límite superior.",
    featured: "Marcar como más común",
    addTier: "Agregar otro tramo",
    duplicate: "Duplicar",
    remove: "Quitar",
    save: "Guardar lista completa de precios",
    saveNote: "Al guardar se crean versiones de los cambios y se archivan las reglas quitadas. Los precios históricos permanecen intactos.",
    empty: "Agrega al menos un servicio para construir tu lista de precios.",
    monthlyName: "Nuevo servicio mensual",
    monthlyDescription: "Cargo mensual recurrente del servicio",
    unitName: "Nuevo servicio de almacén",
    unitDescription: "Describe el trabajo incluido en este servicio",
    volumeName: "Nuevo servicio por volumen",
    volumeDescription: "Precio según la cantidad de piezas procesadas",
    tier: "Tramo por volumen",
    base: "Base mensual",
    mostCommon: "Más común",
  },
} as const;

export function ServiceRateBuilder({ initialRates, locale }: { initialRates: ServiceRateDraft[]; locale: Locale }) {
  const messages = copy[locale];
  const [rates, setRates] = useState<ServiceRateDraft[]>(initialRates);
  const categoryCount = useMemo(() => new Set(rates.map((rate) => rate.category)).size, [rates]);

  function updateRate(key: string, changes: Partial<ServiceRateDraft>) {
    setRates((current) => current.map((rate) => rate.key === key ? { ...rate, ...changes } : rate));
  }

  function addUnitRate() {
    const suffix = newSuffix();
    setRates((current) => [...current, {
      key: `rate_${suffix}`,
      serviceCode: `warehouse_service_${suffix}`,
      name: messages.unitName,
      category: "preparation",
      description: messages.unitDescription,
      unit: "unit",
      pricingModel: "flat",
      price: "0.00",
      minimumQuantity: "",
      maximumQuantity: "",
      featured: false,
    }]);
  }

  function addMonthlyRate() {
    const suffix = newSuffix();
    setRates((current) => [...current, {
      key: `rate_${suffix}`,
      serviceCode: `monthly_service_${suffix}`,
      name: messages.monthlyName,
      category: "custom",
      description: messages.monthlyDescription,
      unit: "month",
      pricingModel: "monthly_base",
      price: "0.00",
      minimumQuantity: "",
      maximumQuantity: "",
      featured: false,
    }]);
  }

  function addVolumePlan() {
    const suffix = newSuffix();
    const serviceCode = `volume_service_${suffix}`;
    const shared = {
      serviceCode,
      name: messages.volumeName,
      category: "labeling",
      description: messages.volumeDescription,
      unit: "piece",
      pricingModel: "volume_tier" as const,
      price: "0.00",
      featured: false,
    };
    setRates((current) => [...current,
      { ...shared, key: `rate_${suffix}_tier_1`, minimumQuantity: "1", maximumQuantity: "1000" },
      { ...shared, key: `rate_${suffix}_tier_2`, minimumQuantity: "1001", maximumQuantity: "5000", featured: true },
      { ...shared, key: `rate_${suffix}_tier_3`, minimumQuantity: "5001", maximumQuantity: "" },
    ]);
  }

  function addTier(source: ServiceRateDraft) {
    const suffix = newSuffix();
    setRates((current) => {
      const group = current.filter((rate) => rate.pricingModel === "volume_tier" && rate.serviceCode === source.serviceCode && rate.unit === source.unit);
      const openEnded = group.find((rate) => rate.maximumQuantity === "");
      if (openEnded) {
        const start = Number.isFinite(Number(openEnded.minimumQuantity)) ? Number(openEnded.minimumQuantity) : 1;
        const end = start + 4999;
        return [
          ...current.map((rate) => rate.key === openEnded.key ? { ...rate, minimumQuantity: String(end + 1) } : rate),
          { ...source, key: `rate_${suffix}`, price: "0.00", minimumQuantity: String(start), maximumQuantity: String(end), featured: false },
        ];
      }

      const highestMaximum = group.reduce((highest, rate) => Math.max(highest, Number(rate.maximumQuantity) || 0), 0);
      return [...current, {
        ...source,
        key: `rate_${suffix}`,
        price: "0.00",
        minimumQuantity: String(highestMaximum + 1),
        maximumQuantity: "",
        featured: false,
      }];
    });
  }

  function duplicateRate(source: ServiceRateDraft) {
    const suffix = newSuffix();
    setRates((current) => [...current, {
      ...source,
      key: `rate_${suffix}`,
      serviceCode: `${source.serviceCode}_${suffix}`.slice(0, 80),
      name: `${source.name} ${locale === "es" ? "(copia)" : "(copy)"}`.slice(0, 120),
      featured: false,
    }]);
  }

  function loadTemplate() {
    setRates(templateRates(locale));
  }

  return (
    <form action="/api/service-rates" method="post" className="mt-7 space-y-6">
      <input type="hidden" name="ratesJson" value={JSON.stringify(rates)} readOnly />

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-[#162033] p-6 text-white sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#fdba2d]">{messages.eyebrow}</p>
          <h2 className="mt-2 text-2xl font-black">{messages.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{messages.body}</p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs font-bold text-slate-200">
            <span className="rounded-full bg-white/10 px-3 py-2">{rates.length} {messages.rules}</span>
            <span className="rounded-full bg-white/10 px-3 py-2">{categoryCount} {messages.groups}</span>
            <span className="rounded-full bg-white/10 px-3 py-2">USD</span>
          </div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <AddButton symbol="+" label={messages.addUnit} onClick={addUnitRate} />
          <AddButton symbol="↻" label={messages.addMonthly} onClick={addMonthlyRate} />
          <AddButton symbol="≋" label={messages.addVolume} onClick={addVolumePlan} featured />
          <AddButton symbol="▦" label={messages.loadTemplate} onClick={loadTemplate} />
        </div>
      </section>

      {rates.length ? (
        <div className="space-y-4">
          {rates.map((rate, index) => (
            <RateRuleEditor
              key={rate.key}
              rate={rate}
              index={index}
              locale={locale}
              messages={messages}
              onChange={(changes) => updateRate(rate.key, changes)}
              onAddTier={() => addTier(rate)}
              onDuplicate={() => duplicateRate(rate)}
              onRemove={() => setRates((current) => current.filter((candidate) => candidate.key !== rate.key))}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-amber-300 bg-amber-50 p-8 text-center font-semibold text-amber-900">{messages.empty}</div>
      )}

      <div className="sticky bottom-4 z-10 flex flex-col items-end gap-2">
        <p className="max-w-xl rounded-xl bg-white/95 px-4 py-2 text-right text-xs leading-5 text-slate-500 shadow-sm">{messages.saveNote}</p>
        <button type="submit" disabled={!rates.length} className="min-h-14 rounded-2xl bg-[#f59e0b] px-7 font-black text-[#162033] shadow-lg shadow-amber-900/15 transition hover:bg-[#fdba2d] disabled:cursor-not-allowed disabled:bg-slate-300">
          {messages.save}
        </button>
      </div>
    </form>
  );
}

function AddButton({ symbol, label, onClick, featured = false }: { symbol: string; label: string; onClick: () => void; featured?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`flex min-h-14 items-center justify-center gap-3 rounded-2xl border px-4 text-sm font-black transition ${featured ? "border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100" : "border-slate-200 bg-slate-50 text-[#162033] hover:border-slate-300 hover:bg-slate-100"}`}>
      <span aria-hidden="true" className="text-xl">{symbol}</span>
      {label}
    </button>
  );
}

function RateRuleEditor({ rate, index, locale, messages, onChange, onAddTier, onDuplicate, onRemove }: {
  rate: ServiceRateDraft;
  index: number;
  locale: Locale;
  messages: typeof copy.en | typeof copy.es;
  onChange: (changes: Partial<ServiceRateDraft>) => void;
  onAddTier: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const isVolume = rate.pricingModel === "volume_tier";
  const label = isVolume ? messages.tier : rate.pricingModel === "monthly_base" ? messages.base : categories.find((item) => item.value === rate.category)?.[locale] ?? rate.category;
  const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-[#162033] outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-amber-100";

  return (
    <article className={`rounded-3xl border bg-white p-5 shadow-sm sm:p-6 ${rate.featured ? "border-[#f59e0b] ring-1 ring-[#f59e0b]" : "border-slate-200"}`}>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#162033] text-sm font-black text-white">{index + 1}</span>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#c7511f]">{label}</p>
            <p className="mt-1 font-black text-[#162033]">{rate.name || messages.serviceName}</p>
          </div>
          {rate.featured ? <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-amber-900">{messages.mostCommon}</span> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {isVolume ? <SmallButton label={messages.addTier} onClick={onAddTier} /> : null}
          <SmallButton label={messages.duplicate} onClick={onDuplicate} />
          <SmallButton label={messages.remove} onClick={onRemove} danger />
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label={messages.serviceName} wide>
          <input value={rate.name} onChange={(event) => onChange({ name: event.target.value })} minLength={2} maxLength={120} required className={inputClass} />
        </Field>
        <Field label={messages.description} wide>
          <input value={rate.description} onChange={(event) => onChange({ description: event.target.value })} maxLength={240} className={inputClass} />
        </Field>
        <Field label={messages.category}>
          <select value={rate.category} onChange={(event) => onChange({ category: event.target.value })} className={inputClass}>
            {categories.map((category) => <option key={category.value} value={category.value}>{category[locale]}</option>)}
          </select>
        </Field>
        <Field label={messages.model}>
          <select
            value={rate.pricingModel}
            onChange={(event) => {
              const pricingModel = event.target.value as ServiceRateDraft["pricingModel"];
              onChange({ pricingModel, unit: pricingModel === "monthly_base" ? "month" : rate.unit, minimumQuantity: pricingModel === "volume_tier" ? rate.minimumQuantity || "1" : "", maximumQuantity: pricingModel === "volume_tier" ? rate.maximumQuantity : "", featured: pricingModel === "volume_tier" ? rate.featured : false });
            }}
            className={inputClass}
          >
            {pricingModels.map((model) => <option key={model.value} value={model.value}>{model[locale]}</option>)}
          </select>
        </Field>
        <Field label={messages.unit}>
          <select value={rate.unit} onChange={(event) => onChange({ unit: event.target.value })} className={inputClass}>
            {billingUnits.map((unit) => <option key={unit} value={unit}>{unitLabel(unit, locale)}</option>)}
          </select>
        </Field>
        <Field label={`${messages.price} (USD)`}>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-[22px] font-black text-slate-400">$</span>
            <input value={rate.price} onChange={(event) => onChange({ price: event.target.value })} type="number" min="0" max="1000000" step="0.0001" inputMode="decimal" required className={`${inputClass} pl-8 font-black`} />
          </div>
        </Field>
        {isVolume ? (
          <>
            <Field label={messages.minimum}>
              <input value={rate.minimumQuantity} onChange={(event) => onChange({ minimumQuantity: event.target.value })} type="number" min="0" step="1" inputMode="numeric" required className={inputClass} />
            </Field>
            <Field label={messages.maximum} help={messages.openEnded}>
              <input value={rate.maximumQuantity} onChange={(event) => onChange({ maximumQuantity: event.target.value })} type="number" min="0" step="1" inputMode="numeric" className={inputClass} />
            </Field>
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 md:col-span-2 xl:col-span-4">
              <input type="checkbox" checked={rate.featured} onChange={(event) => onChange({ featured: event.target.checked })} className="h-5 w-5 rounded border-slate-300 text-amber-500" />
              <span className="text-sm font-bold text-[#162033]">{messages.featured}</span>
            </label>
          </>
        ) : null}
      </div>
    </article>
  );
}

function Field({ label, help, wide = false, children }: { label: string; help?: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={wide ? "md:col-span-2" : ""}><span className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>{children}{help ? <span className="mt-1 block text-xs text-slate-400">{help}</span> : null}</label>;
}

function SmallButton({ label, onClick, danger = false }: { label: string; onClick: () => void; danger?: boolean }) {
  return <button type="button" onClick={onClick} className={`min-h-10 rounded-xl px-3 text-xs font-black ${danger ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{label}</button>;
}

function templateRates(locale: Locale): ServiceRateDraft[] {
  return organizationRateTemplate.map((definition) => ({
    key: definition.key,
    serviceCode: definition.serviceCode,
    name: definition.name[locale],
    category: definition.category,
    description: definition.description[locale],
    unit: definition.unit,
    pricingModel: definition.pricingModel,
    price: formatPrice(definition.defaultPrice),
    minimumQuantity: definition.minimumQuantity === null ? "" : String(definition.minimumQuantity),
    maximumQuantity: definition.maximumQuantity === null ? "" : String(definition.maximumQuantity),
    featured: definition.featured,
  }));
}

function newSuffix() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatPrice(value: number) {
  return value.toFixed(4).replace(/\.?0+$/, "");
}
