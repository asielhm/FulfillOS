"use client";

import { MapPin } from "lucide-react";

type SelectableLocation = {
  id: string;
  name: string;
  code: string;
  purpose: string;
};

export function LocationSelect({
  id,
  label,
  placeholder,
  locations,
  selectedId,
  disabled = false,
  onSelect,
}: {
  id: string;
  label: string;
  placeholder: string;
  locations: SelectableLocation[];
  selectedId?: string | null;
  disabled?: boolean;
  onSelect: (location: SelectableLocation) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-black text-[#162033]">
        {label}
      </label>
      <div className="relative mt-2">
        <MapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <select
          id={id}
          value={selectedId ?? ""}
          disabled={disabled}
          onChange={(event) => {
            const location = locations.find((entry) => entry.id === event.target.value);
            if (location) onSelect(location);
          }}
          className="min-h-14 w-full appearance-none rounded-2xl border-2 border-slate-300 bg-white py-3 pl-12 pr-10 text-base font-bold text-[#162033] outline-none transition focus:border-[#f59e0b] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          <option value="">{placeholder}</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.code} · {location.name}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
          ▾
        </span>
      </div>
    </div>
  );
}
