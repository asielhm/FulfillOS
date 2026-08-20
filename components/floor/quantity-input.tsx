"use client";

import { Minus, Plus } from "lucide-react";

export function QuantityInput({
  id,
  label,
  value,
  onChange,
  minimum = 0,
  quickValue,
  quickLabel,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  minimum?: number;
  quickValue?: number;
  quickLabel?: string;
}) {
  function setSafe(next: number) {
    onChange(Math.max(minimum, Math.floor(Number.isFinite(next) ? next : minimum)));
  }

  return (
    <div>
      <label htmlFor={id} className="text-sm font-black text-[#162033]">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSafe(value - 1)}
          aria-label={`Decrease ${label}`}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-slate-300 bg-white text-[#162033] active:bg-slate-100"
        >
          <Minus className="h-6 w-6" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={minimum}
          step={1}
          value={value}
          onChange={(event) => setSafe(Number(event.target.value))}
          className="h-14 min-w-0 flex-1 rounded-2xl border-2 border-slate-300 bg-white px-3 text-center text-2xl font-black text-[#162033] outline-none focus:border-[#f59e0b]"
        />
        <button
          type="button"
          onClick={() => setSafe(value + 1)}
          aria-label={`Increase ${label}`}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-slate-300 bg-white text-[#162033] active:bg-slate-100"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
      {typeof quickValue === "number" && quickLabel ? (
        <button
          type="button"
          onClick={() => setSafe(quickValue)}
          className="mt-2 min-h-11 w-full rounded-xl bg-amber-50 px-4 text-sm font-black text-amber-800"
        >
          {quickLabel}: {quickValue}
        </button>
      ) : null}
    </div>
  );
}
