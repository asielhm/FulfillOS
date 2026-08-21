import { updateSession } from "@/lib/supabase/proxy";
import { isUnsafeCrossSiteMutation } from "@/lib/security";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  if (isUnsafeCrossSiteMutation(request)) {
    return NextResponse.json(
      { error: "Cross-site request blocked." },
      {
        status: 403,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
