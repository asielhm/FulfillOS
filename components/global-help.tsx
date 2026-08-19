"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const answers = [
  { question: "How do I add a customer?", answer: "Open Customers, select Add customer, then complete the company details. Products and shipments can be assigned after saving.", href: "/customers/new", action: "Add customer" },
  { question: "How do I import products?", answer: "Export the workbook as CSV UTF-8, open Products → Import file, select the customer and map each spreadsheet column.", href: "/products/import", action: "Import products" },
  { question: "How do I test a barcode scanner?", answer: "Most USB and Bluetooth scanners work as keyboards. Open Scanner setup, focus the test field and scan a product barcode.", href: "/scanner", action: "Open scanner setup" },
  { question: "Where do I see operational problems?", answer: "The Control Tower prioritizes inbound discrepancies, damage and stalled receipts using real operational data.", href: "/control-tower", action: "Open Control Tower" },
];

export function GlobalHelp() {
  const [authenticated, setAuthenticated] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => setAuthenticated(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setAuthenticated(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!authenticated) return null;
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "asielhernandezmartinez@gmail.com";
  const mailHref = `mailto:${supportEmail}?subject=${encodeURIComponent("FulfillOS support request")}&body=${encodeURIComponent("Hello FulfillOS Support,\n\nWorkspace/company:\nArea (Inbound, Inventory, Products, Billing, Other):\nWhat were you trying to do?\nWhat happened?\n\nScreenshots or record numbers:\n")}`;

  return <>
    {open && <aside aria-label="FulfillOS help" className="fixed bottom-24 right-4 z-[70] w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
      <header className="bg-[#162033] p-5 text-white"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#fdba2d]">Help center</p><h2 className="mt-1 text-xl font-black">How can we help?</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Close help" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl">×</button></div></header>
      <div className="max-h-[65vh] overflow-y-auto p-4">
        <p className="mb-3 text-sm text-slate-600">Choose a common question or create a support request.</p>
        <div className="space-y-2">{answers.map((item, index) => <div key={item.question} className="rounded-xl border border-slate-200"><button type="button" onClick={() => setSelected(selected === index ? null : index)} className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-bold text-[#162033]"><span>{item.question}</span><span>{selected === index ? "−" : "+"}</span></button>{selected === index && <div className="border-t border-slate-100 px-4 pb-4 pt-3"><p className="text-sm leading-6 text-slate-600">{item.answer}</p><Link href={item.href} onClick={() => setOpen(false)} className="mt-3 inline-flex font-bold text-[#c7511f]">{item.action} →</Link></div>}</div>)}</div>
        <a href={mailHref} className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#f59e0b] px-4 text-center font-bold text-[#162033]">I still need help</a>
        <p className="mt-2 text-center text-xs text-slate-400">Opens a pre-filled email support request.</p>
      </div>
    </aside>}
    <button type="button" onClick={() => setOpen((value) => !value)} aria-label="Open FulfillOS help" aria-expanded={open} className="fixed bottom-5 right-5 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-[#f59e0b] text-2xl font-black text-[#162033] shadow-xl ring-4 ring-white/70 transition hover:scale-105">?</button>
  </>;
}
