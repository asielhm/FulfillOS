import type { Locale } from "@/lib/i18n";

export const serviceDefinitions = [
  { code: "receiving_unit", unit: "unit", en: "Receiving · per unit", es: "Recepción · por unidad" },
  { code: "inventory_transfer", unit: "unit", en: "Inventory transfer · per unit", es: "Movimiento de inventario · por unidad" },
  { code: "fnsku_label", unit: "unit", en: "FNSKU labeling · per unit", es: "Etiquetado FNSKU · por unidad" },
  { code: "polybag", unit: "unit", en: "Polybag · per unit", es: "Polybag · por unidad" },
  { code: "bundle", unit: "bundle", en: "Bundle assembly · per bundle", es: "Armado de bundle · por bundle" },
  { code: "inspection", unit: "unit", en: "Inspection · per unit", es: "Inspección · por unidad" },
  { code: "storage_day", unit: "day", en: "Storage · per day", es: "Almacenamiento · por día" },
  { code: "outbound_handling", unit: "unit", en: "Outbound handling · per unit", es: "Manejo outbound · por unidad" },
] as const;

export const billingUnits = ["unit", "case", "pallet", "bundle", "order", "hour", "day"] as const;

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
    case: { en: "case", es: "caja" },
    pallet: { en: "pallet", es: "pallet" },
    bundle: { en: "bundle", es: "bundle" },
    order: { en: "order", es: "orden" },
    hour: { en: "hour", es: "hora" },
    day: { en: "day", es: "día" },
  };

  return labels[unit]?.[locale] ?? unit;
}

export function formatUsd(amount: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "es" ? "es-US" : "en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
