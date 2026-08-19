"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavigationSection = {
  label: string;
  items: Array<{ label: string; icon: string; href: string }>;
};

const sections: NavigationSection[] = [
  {
    label: "Operations",
    items: [
      { label: "Overview", icon: "⌂", href: "/dashboard" },
      { label: "Inbound", icon: "↓", href: "/inbound" },
      { label: "Inventory", icon: "□", href: "/inventory" },
      { label: "Prep & Orders", icon: "✓", href: "/work-orders" },
      { label: "Outbound", icon: "→", href: "/outbound" },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Customers", icon: "♙", href: "/customers" },
      { label: "Products", icon: "▦", href: "/products" },
      { label: "Warehouses", icon: "⌂", href: "/warehouses" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Reports", icon: "▥", href: "/reports" },
      { label: "Settings", icon: "⚙", href: "/settings" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavigation({ variant }: { variant: "mobile" | "desktop" }) {
  const pathname = usePathname();

  if (variant === "mobile") {
    return (
      <div className="border-b border-slate-200 bg-white lg:hidden">
        <nav aria-label="Workspace navigation" className="flex gap-2 overflow-x-auto px-4 py-3">
          {sections.flatMap((section) => section.items).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(pathname, item.href)
                ? "shrink-0 rounded-xl bg-[#162033] px-4 py-2 text-sm font-bold text-white"
                : "shrink-0 rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"}
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
