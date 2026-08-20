"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ScanLine, TriangleAlert } from "lucide-react";

type ScanState =
  | { kind: "idle"; message: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function ScanInput({
  label,
  placeholder,
  state,
  autoFocus = false,
  disabled = false,
  onScan,
}: {
  label: string;
  placeholder: string;
  state: ScanState;
  autoFocus?: boolean;
  disabled?: boolean;
  onScan: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus, state.kind]);

  function submit() {
    if (disabled) return;
    const normalized = value.trim();
    if (!normalized) return;
    onScan(normalized);
    setValue("");
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div>
      <label htmlFor={`scan-${label.replaceAll(" ", "-").toLowerCase()}`} className="text-sm font-black text-[#162033]">
        {label}
      </label>
      <div className="relative mt-2">
        <ScanLine className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          id={`scan-${label.replaceAll(" ", "-").toLowerCase()}`}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={disabled}
          inputMode="text"
          placeholder={placeholder}
          className="min-h-16 w-full rounded-2xl border-2 border-slate-300 bg-white py-3 pl-14 pr-24 font-mono text-lg font-bold text-[#162033] outline-none transition focus:border-[#f59e0b] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled}
          className="absolute right-2 top-2 min-h-12 rounded-xl bg-[#162033] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          Scan
        </button>
      </div>
      <div
        aria-live="polite"
        className={
          state.kind === "success"
            ? "mt-3 flex min-h-12 items-center gap-2 rounded-xl bg-emerald-50 px-4 text-sm font-bold text-emerald-800"
            : state.kind === "error"
              ? "mt-3 flex min-h-12 items-center gap-2 rounded-xl bg-red-50 px-4 text-sm font-bold text-red-800"
              : "mt-3 flex min-h-12 items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-600"
        }
      >
        {state.kind === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : state.kind === "error" ? <TriangleAlert className="h-5 w-5 shrink-0" /> : <ScanLine className="h-5 w-5 shrink-0" />}
        <span>{state.message}</span>
      </div>
    </div>
  );
}
