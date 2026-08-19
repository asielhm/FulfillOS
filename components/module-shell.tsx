import Link from "next/link";
import type { ReactNode } from "react";

import { AppNavigation } from "@/components/app-navigation";
import { BrandLogo } from "@/components/brand-logo";

type ModuleShellProps = {
  children: ReactNode;
  organizationName: string;
  email: string;
  role: string;
};

export function ModuleShell({ children, organizationName, email, role }: ModuleShellProps) {
  return (
    <main className="min-h-screen bg-[#f5f7fa] text-[#111827]">
      <header className="border-b border-white/10 bg-[#162033] text-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <Link href="/dashboard" aria-label="FulfillOS dashboard">
            <BrandLogo inverse />
          </Link>
          <div className="min-w-0 text-right">
            <p className="max-w-64 truncate text-sm font-semibold">{organizationName}</p>
            <p className="max-w-64 truncate text-xs capitalize text-slate-300">{email} · {role}</p>
          </div>
        </div>
      </header>
      <AppNavigation variant="mobile" />
      <div className="mx-auto flex max-w-[1600px]">
        <AppNavigation variant="desktop" />
        <section className="min-w-0 flex-1 px-5 py-8 sm:px-8 xl:px-10">{children}</section>
      </div>
    </main>
  );
}

export function ModuleHeading({ eyebrow, title, description, action }: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#c7511f]">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#162033] sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-slate-600">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black text-[#162033]">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}
