import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Do not run Proxy on:
     * - /api/config-check
     * - Next.js static files
     * - image optimization files
     * - favicon and common image files
     */
    "/((?!api/config-check|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
