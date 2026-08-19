import { cookies } from "next/headers";
import type { Locale } from "@/lib/i18n";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return cookieStore.get("fulfillos_locale")?.value === "es" ? "es" : "en";
}
