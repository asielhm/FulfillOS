export const dynamic = "force-dynamic";

export async function GET() {
  const rawUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  let supabaseHost: string | null = null;

  try {
    supabaseHost = rawUrl
      ? new URL(rawUrl).host
      : null;
  } catch {
    supabaseHost = "invalid-url";
  }

  return Response.json(
    {
      environment:
        process.env.VERCEL_ENV ?? "local",
      urlConfigured: Boolean(rawUrl),
      keyConfigured: Boolean(
        process.env
          .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      ),
      supabaseHost,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}