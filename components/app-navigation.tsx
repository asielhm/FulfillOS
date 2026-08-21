"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationMessages, type Locale } from "@/lib/i18n";

type NavigationSection = {
  label: string;
  items: Array<{ label: string; icon: string; href: string }>;
};

function createManagerSections(locale: Locale): NavigationSection[] {
  const messages = navigationMessages[locale];
  return [
  {
    label: messages.operations,
    items: [
      { label: messages.overview, icon: "⌂", href: "/dashboard" },
      { label: messages.controlTower, icon: "!", href: "/control-tower" },
      { label: messages.revenueProtection, icon: "$", href: "/revenue-protection" },
      { label: messages.inbound, icon: "↓", href: "/inbound" },
      { label: messages.inventory, icon: "□", href: "/inventory" },
      { label: messages.workOrders, icon: "✓", href: "/work-orders" },
      { label: messages.outbound, icon: "→", href: "/outbound" },
      { label: messages.scanner, icon: "⌁", href: "/scanner" },
    ],
  },
  {
    label: messages.management,
    items: [
      { label: messages.customers, icon: "♙", href: "/customers" },
      { label: messages.products, icon: "▦", href: "/products" },
      { label: messages.warehouses, icon: "⌂", href: "/warehouses" },
      { label: messages.clientPortal, icon: "◉", href: "/client-portal" },
    ],
  },
  {
    label: messages.workspace,
    items: [
      { label: messages.team, icon: "♟", href: "/team" },
      { label: messages.reports, icon: "▥", href: "/reports" },
      { label: messages.settings, icon: "⚙", href: "/settings" },
    ],
  },
  ];
}

function createFloorSections(locale: Locale): NavigationSection[] {
  const es = locale === "es";
  return [
    {
      label: es ? "Trabajo de piso" : "Floor work",
      items: [
        { label: es ? "Inicio" : "Home", icon: "⌂", href: "/floor" },
        { label: es ? "Recibir" : "Receive", icon: "↓", href: "/floor/receive" },
        { label: es ? "Mover" : "Move", icon: "↔", href: "/floor/move" },
        { label: es ? "Cola de prep" : "Prep queue", icon: "✓", href: "/work-orders" },
        { label: es ? "Scanner" : "Scanner", icon: "⌁", href: "/scanner" },
      ],
    },
  ];
}

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavigation({ variant, locale, role }: { variant: "mobile" | "desktop"; locale: Locale; role: string }) {
  const pathname = usePathname();
  const floorExperience = role === "operator" || pathname.startsWith("/floor");
  const sections = floorExperience ? createFloorSections(locale) : createManagerSections(locale);

  if (variant === "mobile") {
    return (
      <div className="border-b border-slate-200 bg-white lg:hidden">
        <nav aria-label="Workspace navigation" className="flex gap-2 overflow-x-auto px-4 py-3">
          {sections.flatMap((section) => section.items).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(pathname, item.href)
                ? "inline-flex min-h-11 shrink-0 items-center rounded-xl bg-[#162033] px-4 py-2 text-sm font-bold text-white"
                : "inline-flex min-h-11 shrink-0 items-center rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    );
  }

  return (
      <aside className="hidden min-h-[calc(100vh-77px)] w-64 shrink-0 border-r border-slate-200 bg-white p-5 lg:block">
        <nav aria-label="Workspace navigation" className="sticky top-5">
          {sections.map((section, index) => (
            <div key={section.label} className={index === 0 ? "" : "mt-8"}>
              <p className="mb-3 px-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive(pathname, item.href) ? "page" : undefined}
                    className={isActive(pathname, item.href)
                      ? "flex items-center gap-3 rounded-xl bg-[#162033] px-4 py-3 text-sm font-bold text-white"
                      : "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-[#162033]"}
                  >
                    <span aria-hidden="true" className="flex w-5 justify-center text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
  );
}
