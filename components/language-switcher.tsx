"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export function LanguageSwitcher({ locale, inverse = false }: { locale: Locale; inverse?: boolean }) {
  const router = useRouter();

  function changeLocale(nextLocale: Locale) {
    document.cookie = `fulfillos_locale=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <div className={inverse ? "flex rounded-lg border border-white/20 bg-white/5 p-1" : "flex rounded-lg border border-slate-200 bg-slate-50 p-1"} aria-label="Language / Idioma">
      {(["en", "es"] as const).map((option) => (
        <button key={option} type="button" onClick={() => changeLocale(option)} aria-pressed={locale === option} className={locale === option ? "rounded-md bg-[#f59e0b] px-2.5 py-1 text-xs font-black uppercase text-[#162033] shadow-sm" : inverse ? "rounded-md px-2.5 py-1 text-xs font-bold uppercase text-slate-300 hover:text-white" : "rounded-md px-2.5 py-1 text-xs font-bold uppercase text-slate-500 hover:text-[#162033]"}>
          {option}
        </button>
      ))}
    </div>
  );
}
