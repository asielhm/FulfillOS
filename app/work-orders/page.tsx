import Link from "next/link";

import { MetricCard, ModuleHeading, ModuleShell } from "@/components/module-shell";
import { getWorkspaceContext } from "@/lib/workspace";

export default async function WorkOrdersPage() {
  const { supabase, organization, membership, email } = await getWorkspaceContext();
  const [productsResult, customersResult] = await Promise.all([
    supabase.from("products").select("id, customer_id, sku, title, prep_notes, status").eq("organization_id", organization.id).eq("status", "active").order("title"),
    supabase.from("customers").select("id, company_name").eq("organization_id", organization.id),
  ]);
  const error = productsResult.error ?? customersResult.error;
  if (error) throw new Error(error.message);

  const customers = new Map((customersResult.data ?? []).map((customer) => [customer.id, customer.company_name]));
  const requirements = (productsResult.data ?? []).filter((product) => Boolean(product.prep_notes?.trim()));

  return (
    <ModuleShell organizationName={organization.name} email={email} role={membership.role}>
      <ModuleHeading eyebrow="Execution queue" title="Prep & Orders" description="Turn customer-specific SKU instructions into clear, traceable work for the warehouse team." action={<Link href="/products/new" className="rounded-xl bg-[#f59e0b] px-5 py-3 font-bold text-[#162033]">+ Add prep SKU</Link>} />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Prep requirements" value={String(requirements.length)} detail="Active SKUs with instructions" />
        <MetricCard label="Ready to define" value={String((productsResult.data ?? []).length - requirements.length)} detail="SKUs without prep notes" />
        <MetricCard label="Proof of work" value="Required" detail="Every future completion will be auditable" />
      </div>
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-extrabold text-[#162033]">Prep instruction queue</h2><p className="mt-1 text-sm text-slate-500">Operational requirements ready to become work orders.</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">MVP queue</span></div>
        {requirements.length === 0 ? <div className="py-14 text-center"><p className="font-bold text-[#162033]">No prep instructions yet</p><p className="mt-2 text-sm text-slate-500">Add prep notes to a product to make it visible here.</p></div> : <div className="mt-6 grid gap-4 lg:grid-cols-2">{requirements.map((product) => <article key={product.id} className="rounded-xl border border-slate-200 p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-bold text-[#162033]">{product.title}</p><p className="mt-1 text-xs text-slate-500">{customers.get(product.customer_id) ?? "Customer"} · <span className="font-mono">{product.sku}</span></p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-[#067d62]">Defined</span></div><p className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">{product.prep_notes}</p><Link href={`/products/${product.id}`} className="mt-4 inline-flex text-sm font-bold text-[#c7511f] hover:underline">Review product →</Link></article>)}</div>}
      </section>
    </ModuleShell>
  );
}
