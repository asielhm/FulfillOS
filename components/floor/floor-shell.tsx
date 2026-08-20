import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeftRight, ClipboardList, Home, LayoutDashboard, ScanLine, UserRound } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { Locale } from "@/lib/i18n";

type FloorShellProps = {
  children: ReactNode;
  organizationName: string;
  workerName: string;
  warehouseName?: string | null;
  role: string;
  locale: Locale;
};

export function FloorShell({
  children,
  organizationName,
  workerName,
  warehouseName,
  role,
  locale,
}: FloorShellProps) {
  const es = locale === "es";
  const canManage = ["owner", "admin", "manager"].includes(role);

  return (
    <main className="min-h-svh bg-[#eef1f5] pb-24 text-[#111827]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#162033] text-white shadow-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/floor" aria-label={es ? "Inicio de Modo Piso" : "Floor Mode home"}>
            <BrandLogo inverse />
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            {canManage && (
              <Link
                href="/dashboard"
                className="hidden min-h-11 items-center gap-2 rounded-xl border border-white/20 px-3 text-xs font-bold transition hover:bg-white/10 sm:inline-flex"
              >
                <LayoutDashboard className="h-4 w-4" />
                {es ? "Modo manager" : "Manager Mode"}
              </Link>
            )}
            <LanguageSwitcher locale={locale} inverse />
            <div className="hidden min-w-0 text-right md:block">
              <p className="max-w-48 truncate text-sm font-bold">{workerName}</p>
              <p className="max-w-48 truncate text-xs text-slate-300">
                {warehouseName ?? organizationName}
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </section>

      <nav
        aria-label={es ? "Navegación de piso" : "Floor navigation"}
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur"
      >
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
          <FloorNavItem href="/floor" label={es ? "Inicio" : "Home"} icon={<Home className="h-5 w-5" />} />
          <FloorNavItem href="/floor/receive" label={es ? "Recibir" : "Receive"} icon={<ClipboardList className="h-5 w-5" />} />
          <FloorNavItem href="/floor/move" label={es ? "Mover" : "Move"} icon={<ArrowLeftRight className="h-5 w-5" />} />
          <FloorNavItem href="/scanner" label="Scan" icon={<ScanLine className="h-5 w-5" />} />
          <FloorNavItem href="/floor/me" label={es ? "Yo" : "Me"} icon={<UserRound className="h-5 w-5" />} />
        </div>
      </nav>
    </main>
  );
}

function FloorNavItem({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  return (
    <Link
      href={href}
      className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs font-bold text-slate-600 transition active:bg-amber-50 active:text-[#162033]"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
