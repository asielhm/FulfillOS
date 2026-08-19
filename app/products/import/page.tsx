import Link from "next/link";
import { redirect } from "next/navigation";

import { ProductImport } from "./product-import";
import { getWorkspaceContext } from "@/lib/workspace";

export default async function ProductImportPage() {
  const { supabase, organization, membership } = await getWorkspaceContext();
  if (!["owner", "admin", "manager"].includes(membership.role)) redirect("/products?error=You do not have permission to import products.");

  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, company_name, reference_code")
    .eq("organization_id", organization.id)
    .eq("status", "active")
    .order("company_name");
  if (error) throw new Error(error.message);
  if (!customers?.length) redirect("/customers?error=Add an active customer before importing products.");

  return (
    <main className="min-h-screen bg-[#f5f7fa] px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/products" className="text-sm font-bold text-[#162033] hover:text-[#c7511f]">← Back to products</Link>
        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          <header className="bg-[#162033] px-6 py-8 text-white sm:px-9">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#fdba2d]">Bulk product onboarding</p>
            <h1 className="mt-3 text-3xl font-black">Import products from Excel-compatible files</h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-300">Upload a CSV or TSV exported from Excel, choose what every column means, review the preview, then import it into one customer catalog.</p>
          </header>
          <ProductImport customers={(customers ?? []).map((customer) => ({ id: customer.id, name: customer.company_name, code: customer.reference_code }))} />
        </section>
      </div>
    </main>
  );
}
