import Link from "next/link";
import { ModuleHeading, ModuleShell } from "@/components/module-shell";
import { getWorkspaceContext } from "@/lib/workspace";

type Props = { searchParams: Promise<{ customer?: string | string[] }> };

export default async function ClientPortalPreview({ searchParams }: Props) {
  const { supabase, organization, membership, email } = await getWorkspaceContext();
  const params = await searchParams;
  const requested = Array.isArray(params.customer) ? params.customer[0] : params.customer;
  const { data: customers, error: customersError } = await supabase.from("customers").select("id, company_name, reference_code").eq("organization_id", organization.id).eq("status", "active").order("company_name");
  if (customersError) throw new Error(customersError.message);
  const selected = (customers ?? []).find((customer) => customer.id === requested) ?? customers?.[0];

  let products: Array<{ id: string; sku: string; title: string }> = [];
  let shipments: Array<{ id: string; inbound_number: string; status: string; expected_at: string | null }> = [];
  let available = 0;
  if (selected) {
    const [productsResult, shipmentsResult] = await Promise.all([
      supabase.from("products").select("id, sku, title").eq("organization_id", organization.id).eq("customer_id", selected.id).eq("status", "active").order("title").limit(100),
      supabase.from("inbound_shipments").select("id, inbound_number, status, expected_at").eq("organization_id", organization.id).eq("customer_id", selected.id).is("deleted_at", null).order("created_at", { ascending: false }).limit(10),
    ]);
    if (productsResult.error || shipmentsResult.error) throw new Error(productsResult.error?.message ?? shipmentsResult.error?.message);
    products = productsResult.data ?? []; shipments = shipmentsResult.data ?? [];
    if (shipments.length) {
      const { data: items, error } = await supabase.from("inbound_shipment_items").select("received_quantity, damaged_quantity").in("shipment_id", shipments.map((shipment) => shipment.id));
      if (error) throw new Error(error.message);
      available = (items ?? []).reduce((sum, item) => sum + Math.max(item.received_quantity - item.damaged_quantity, 0), 0);
    }
  }

  return <ModuleShell organizationName={organization.name} email={email} role={membership.role}>
    <ModuleHeading eyebrow="Customer experience" title="Client portal preview" description="Review the simplified, customer-scoped experience before inviting external client users." />
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><strong>Secure preview:</strong> only authenticated warehouse team members can use this page today. External invitations require a verified customer-membership table and Supabase RLS before launch.</div>
    {(customers ?? []).length ? <>
      <form className="mt-6 rounded-2xl border border-slate-200 bg-white p-4"><label className="text-sm font-bold text-[#162033]">Preview customer<select name="customer" defaultValue={selected?.id} className="ml-3 min-h-12 rounded-xl border border-slate-300 bg-white px-4">{(customers ?? []).map((customer) => <option key={customer.id} value={customer.id}>{customer.company_name}</option>)}</select></label><button className="ml-3 min-h-12 rounded-xl bg-[#162033] px-5 font-bold text-white">Open view</button></form>
      <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><header className="bg-[#162033] p-6 text-white"><p className="text-xs font-bold uppercase tracking-wide text-[#fdba2d]">Powered by {organization.name}</p><h2 className="mt-2 text-3xl font-black">Welcome, {selected?.company_name}</h2><p className="mt-2 text-slate-300">Your inventory and inbound activity at a glance.</p></header>
        <div className="grid gap-4 p-6 sm:grid-cols-3"><Metric label="Products shown" value={products.length} /><Metric label="Usable units in recent inbound" value={available} /><Metric label="Recent inbound shipments" value={shipments.length} /></div>
        <div className="grid gap-6 border-t border-slate-100 p-6 lg:grid-cols-2"><div><h3 className="font-black text-[#162033]">Product catalog</h3><div className="mt-3 space-y-2">{products.slice(0, 8).map((product) => <div key={product.id} className="rounded-xl bg-slate-50 p-3"><p className="font-bold text-[#162033]">{product.title}</p><p className="font-mono text-xs text-slate-500">{product.sku}</p></div>)}{!products.length && <Empty text="No products yet." />}</div></div><div><h3 className="font-black text-[#162033]">Inbound activity</h3><div className="mt-3 space-y-2">{shipments.map((shipment) => <Link key={shipment.id} href={`/inbound/${shipment.id}`} className="flex justify-between rounded-xl bg-slate-50 p-3"><span className="font-bold text-[#162033]">{shipment.inbound_number}</span><span className="text-sm capitalize text-slate-500">{shipment.status}</span></Link>)}{!shipments.length && <Empty text="No inbound activity yet." />}</div></div></div>
      </section>
    </> : <section className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><h2 className="text-2xl font-black text-[#162033]">Add a customer first</h2><Link href="/customers/new" className="mt-5 inline-flex rounded-xl bg-[#f59e0b] px-5 py-3 font-bold text-[#162033]">Add customer</Link></section>}
  </ModuleShell>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl bg-slate-50 p-5"><p className="text-xs font-bold uppercase text-slate-400">{label}</p><p className="mt-2 text-3xl font-black text-[#162033]">{value}</p></div>; }
function Empty({ text }: { text: string }) { return <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">{text}</p>; }
