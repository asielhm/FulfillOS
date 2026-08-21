"use client";

import { PackageSearch } from "lucide-react";

type SelectableProduct = {
  id: string;
  expected_quantity: number;
  received_quantity: number;
  product: {
    sku: string;
    title: string;
  };
};

export function ProductSelect({
  id,
  label,
  placeholder,
  items,
  selectedId,
  locale,
  disabled = false,
  onSelect,
}: {
  id: string;
  label: string;
  placeholder: string;
  items: SelectableProduct[];
  selectedId?: string | null;
  locale: "en" | "es";
  disabled?: boolean;
  onSelect: (itemId: string) => void;
}) {
  const remainingLabel = locale === "es" ? "restantes" : "remaining";

  return (
    <div>
      <label htmlFor={id} className="text-sm font-black text-[#162033]">
        {label}
      </label>
      <div className="relative mt-2">
        <PackageSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <select
          id={id}
          value={selectedId ?? ""}
          disabled={disabled}
          onChange={(event) => {
            const item = items.find((entry) => entry.id === event.target.value);
            if (item) onSelect(item.id);
          }}
          className="min-h-14 w-full appearance-none rounded-2xl border-2 border-slate-300 bg-white py-3 pl-12 pr-10 text-base font-bold text-[#162033] outline-none transition focus:border-[#f59e0b] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          <option value="">{placeholder}</option>
          {items.map((item) => {
            const remaining = Math.max(item.expected_quantity - item.received_quantity, 0);
            return (
              <option key={item.id} value={item.id}>
                {item.product.sku} · {item.product.title} · {remaining} {remainingLabel}
              </option>
            );
          })}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
          ▾
        </span>
      </div>
    </div>
  );
}
