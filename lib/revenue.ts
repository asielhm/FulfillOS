import type { Locale } from "@/lib/i18n";

export const serviceDefinitions = [
  { code: "receiving_unit", unit: "unit", en: "Receiving · per unit", es: "Recepción · por unidad" },
  { code: "carton_inbound", unit: "carton", en: "Carton inbound", es: "Recepción de cajas" },
  { code: "pallet_inbound", unit: "pallet", en: "Pallet inbound", es: "Recepción de pallets" },
  { code: "monthly_pallet_storage", unit: "pallet_month", en: "Monthly pallet storage", es: "Almacenamiento mensual de pallets" },
  { code: "labeling_monthly_base", unit: "month", en: "Labeling monthly base fee", es: "Cargo base mensual de etiquetado" },
  { code: "inventory_transfer", unit: "unit", en: "Inventory transfer · per unit", es: "Movimiento de inventario · por unidad" },
  { code: "fnsku_label", unit: "unit", en: "FNSKU labeling · per unit", es: "Etiquetado FNSKU · por unidad" },
  { code: "polybag", unit: "unit", en: "Polybag · per unit", es: "Polybag · por unidad" },
  { code: "bundle", unit: "bundle", en: "Bundle assembly · per bundle", es: "Armado de bundle · por bundle" },
  { code: "simple_repackaging", unit: "unit", en: "Simple repackaging", es: "Reempaque simple" },
  { code: "special_packaging", unit: "unit", en: "Special packaging", es: "Empaque especial" },
  { code: "kits_assembly", unit: "set", en: "Kits assembly", es: "Armado de kits" },
  { code: "special_jobs", unit: "hour", en: "Special jobs", es: "Trabajos especiales" },
  { code: "inspection", unit: "unit", en: "Inspection · per unit", es: "Inspección · por unidad" },
  { code: "storage_day", unit: "day", en: "Storage · per day", es: "Almacenamiento · por día" },
  { code: "outbound_handling", unit: "unit", en: "Outbound handling · per unit", es: "Manejo outbound · por unidad" },
] as const;

export const billingUnits = ["unit", "piece", "case", "carton", "pallet", "bundle", "set", "order", "hour", "day", "month", "pallet_month"] as const;

export type OrganizationRateTemplateItem = {
  key: string;
  category: "reception_storage" | "labeling" | "preparation" | "special_jobs";
  serviceCode: string;
  unit: string;
  pricingModel: "flat" | "volume_tier" | "monthly_base";
  minimumQuantity: number | null;
  maximumQuantity: number | null;
  featured: boolean;
  defaultPrice: number;
  name: { en: string; es: string };
  description: { en: string; es: string };
  priceSuffix: { en: string; es: string };
};

export const organizationRateTemplate: OrganizationRateTemplateItem[] = [
  {
    key: "carton_inbound",
    category: "reception_storage",
    serviceCode: "carton_inbound",
    unit: "carton",
    pricingModel: "flat",
    minimumQuantity: null,
    maximumQuantity: null,
    featured: false,
    defaultPrice: 1.5,
    name: { en: "Carton inbound", es: "Recepción de cajas" },
    description: { en: "Cartons received into the warehouse", es: "Cajas recibidas en el almacén" },
    priceSuffix: { en: "per carton received", es: "por caja recibida" },
  },
  {
    key: "pallet_inbound",
    category: "reception_storage",
    serviceCode: "pallet_inbound",
    unit: "pallet",
    pricingModel: "flat",
    minimumQuantity: null,
    maximumQuantity: null,
    featured: false,
    defaultPrice: 15,
    name: { en: "Pallet inbound", es: "Recepción de pallets" },
    description: { en: "Pallets received into the warehouse", es: "Pallets recibidos en el almacén" },
    priceSuffix: { en: "per pallet received", es: "por pallet recibido" },
  },
  {
    key: "monthly_pallet_storage",
    category: "reception_storage",
    serviceCode: "monthly_pallet_storage",
    unit: "pallet_month",
    pricingModel: "flat",
    minimumQuantity: null,
    maximumQuantity: null,
    featured: false,
    defaultPrice: 25,
    name: { en: "Monthly pallet storage", es: "Almacenamiento mensual de pallets" },
    description: { en: "Pallet storage billed monthly", es: "Almacenamiento de pallets facturado mensualmente" },
    priceSuffix: { en: "per pallet, per month", es: "por pallet, por mes" },
  },
  {
    key: "labeling_monthly_base",
    category: "labeling",
    serviceCode: "labeling_monthly_base",
    unit: "month",
    pricingModel: "monthly_base",
    minimumQuantity: null,
    maximumQuantity: null,
    featured: false,
    defaultPrice: 100,
    name: { en: "Monthly base fee", es: "Cargo base mensual" },
    description: { en: "Recurring labeling program base fee", es: "Cargo recurrente base del programa de etiquetado" },
    priceSuffix: { en: "per month", es: "por mes" },
  },
  {
    key: "labeling_500_1000",
    category: "labeling",
    serviceCode: "fnsku_label",
    unit: "piece",
    pricingModel: "volume_tier",
    minimumQuantity: 500,
    maximumQuantity: 1000,
    featured: false,
    defaultPrice: 0.5,
    name: { en: "500–1,000 pieces", es: "500–1.000 piezas" },
    description: { en: "Volume labeling tier", es: "Tramo de etiquetado por volumen" },
    priceSuffix: { en: "per piece", es: "por pieza" },
  },
  {
    key: "labeling_1001_5000",
    category: "labeling",
    serviceCode: "fnsku_label",
    unit: "piece",
    pricingModel: "volume_tier",
    minimumQuantity: 1001,
    maximumQuantity: 5000,
    featured: true,
    defaultPrice: 0.35,
    name: { en: "1,001–5,000 pieces", es: "1.001–5.000 piezas" },
    description: { en: "Most common labeling tier", es: "Tramo de etiquetado más común" },
    priceSuffix: { en: "per piece", es: "por pieza" },
  },
  {
    key: "labeling_5001_plus",
    category: "labeling",
    serviceCode: "fnsku_label",
    unit: "piece",
    pricingModel: "volume_tier",
    minimumQuantity: 5001,
    maximumQuantity: null,
    featured: false,
    defaultPrice: 0.25,
    name: { en: "More than 5,000 pieces", es: "Más de 5.000 piezas" },
    description: { en: "High-volume labeling tier", es: "Tramo de etiquetado de alto volumen" },
    priceSuffix: { en: "per piece", es: "por pieza" },
  },
  {
    key: "simple_repackaging",
    category: "preparation",
    serviceCode: "simple_repackaging",
    unit: "unit",
    pricingModel: "flat",
    minimumQuantity: null,
    maximumQuantity: null,
    featured: false,
    defaultPrice: 0.55,
    name: { en: "Simple repackaging", es: "Reempaque simple" },
    description: { en: "Box or bag change", es: "Cambio de caja o bolsa" },
    priceSuffix: { en: "per unit", es: "por unidad" },
  },
  {
    key: "special_packaging",
    category: "preparation",
    serviceCode: "special_packaging",
    unit: "unit",
    pricingModel: "flat",
    minimumQuantity: null,
    maximumQuantity: null,
    featured: false,
    defaultPrice: 1.2,
    name: { en: "Special packaging", es: "Empaque especial" },
    description: { en: "Bubble wrapping", es: "Envoltura con burbujas" },
    priceSuffix: { en: "per unit", es: "por unidad" },
  },
  {
    key: "kits_assembly",
    category: "preparation",
    serviceCode: "kits_assembly",
    unit: "set",
    pricingModel: "flat",
    minimumQuantity: null,
    maximumQuantity: null,
    featured: false,
    defaultPrice: 2.05,
    name: { en: "Kits assembly", es: "Armado de kits" },
    description: { en: "Multi-pack or bundling", es: "Multi-pack o bundling" },
    priceSuffix: { en: "per set", es: "por set" },
  },
  {
    key: "special_jobs",
    category: "special_jobs",
    serviceCode: "special_jobs",
    unit: "hour",
    pricingModel: "flat",
    minimumQuantity: null,
    maximumQuantity: null,
    featured: false,
    defaultPrice: 50,
    name: { en: "Special jobs", es: "Trabajos especiales" },
    description: { en: "Hourly labor", es: "Mano de obra por hora" },
    priceSuffix: { en: "per hour", es: "por hora" },
  },
];

export function serviceLabel(serviceCode: string, locale: Locale) {
  const definition = serviceDefinitions.find((item) => item.code === serviceCode);
  if (definition) return definition[locale];

  return serviceCode
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function unitLabel(unit: string, locale: Locale) {
  const labels: Record<string, { en: string; es: string }> = {
    unit: { en: "unit", es: "unidad" },
    piece: { en: "piece", es: "pieza" },
    case: { en: "case", es: "caja" },
    carton: { en: "carton", es: "caja" },
    pallet: { en: "pallet", es: "pallet" },
    bundle: { en: "bundle", es: "bundle" },
    set: { en: "set", es: "set" },
    order: { en: "order", es: "orden" },
    hour: { en: "hour", es: "hora" },
    day: { en: "day", es: "día" },
    month: { en: "month", es: "mes" },
    pallet_month: { en: "pallet/month", es: "pallet/mes" },
  };

  return labels[unit]?.[locale] ?? unit;
}

export function formatUsd(amount: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "es" ? "es-US" : "en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
