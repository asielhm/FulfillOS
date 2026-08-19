export type PlanId = "starter" | "growth" | "control" | "enterprise";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  price: number;
  promise: string;
  warehouses: number | null;
  customers: number | null;
  monthlyOperations: number | null;
  highlighted?: boolean;
  features: string[];
};

export const plans: PlanDefinition[] = [
  { id: "starter", name: "Starter", price: 99, promise: "Replace spreadsheets with one operating workspace.", warehouses: 1, customers: 5, monthlyOperations: 2000, features: ["Customers and product catalog", "CSV product imports", "Inbound and inventory visibility", "Warehouse locations", "Basic reports and audit activity", "Email support"] },
  { id: "growth", name: "Growth", price: 299, promise: "Run a growing prep center with connected floor tools.", warehouses: 2, customers: 25, monthlyOperations: 10000, highlighted: true, features: ["Everything in Starter", "Prep and outbound workspaces", "Barcode scanner setup and lookup", "Client portal preview", "Expanded operational reporting", "Priority email support"] },
  { id: "control", name: "Control", price: 499, promise: "Know what needs attention before it becomes expensive.", warehouses: 5, customers: null, monthlyOperations: 30000, features: ["Everything in Growth", "FulfillOS Control Tower", "Deterministic exception detection", "Inbound shortage and overage alerts", "Damage and stalled-receipt alerts", "Prioritized operational inbox"] },
  { id: "enterprise", name: "Enterprise", price: 899, promise: "Operate larger multi-site teams from one system.", warehouses: null, customers: null, monthlyOperations: null, features: ["Everything in Control", "Unlimited warehouses", "Unlimited customers", "Custom operational volume", "30–60 day guided pilot", "Priority product support"] },
];

export function isPlanId(value: unknown): value is PlanId { return plans.some((plan) => plan.id === value); }
export function getPlan(value: unknown) { return plans.find((plan) => plan.id === value) ?? plans[0]; }

export function planFromClaims(claims: unknown) {
  if (!claims || typeof claims !== "object") return plans[3];
  const record = claims as { user_metadata?: unknown };
  if (!record.user_metadata || typeof record.user_metadata !== "object") return plans[3];
  const metadata = record.user_metadata as { selected_plan?: unknown; trial_plan?: unknown; trial_expires_at?: unknown };
  if (metadata.trial_plan === "control" && typeof metadata.trial_expires_at === "string" && new Date(metadata.trial_expires_at).getTime() > Date.now()) return getPlan("control");
  const selected = metadata.selected_plan;
  return isPlanId(selected) ? getPlan(selected) : plans[3];
}

export function trialFromClaims(claims: unknown) {
  if (!claims || typeof claims !== "object") return null;
  const metadata = (claims as { user_metadata?: unknown }).user_metadata;
  if (!metadata || typeof metadata !== "object") return null;
  const expiresAt = (metadata as { trial_expires_at?: unknown }).trial_expires_at;
  if (typeof expiresAt !== "string") return null;
  const expires = new Date(expiresAt);
  if (!Number.isFinite(expires.getTime())) return null;
  return { expiresAt: expires, daysRemaining: Math.max(0, Math.ceil((expires.getTime() - Date.now()) / 86_400_000)), active: expires.getTime() > Date.now() };
}
