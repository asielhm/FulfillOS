import type { NextConfig } from "next";

const serverActionOrigins = Array.from(
  new Set(
    [
      "*.app.github.dev",
      process.env.VERCEL_URL,
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
    ].filter(
      (origin): origin is string =>
        typeof origin === "string" &&
        origin.length > 0,
    ),
  ),
);

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.app.github.dev",
  ],

  experimental: {
    serverActions: {
      allowedOrigins: serverActionOrigins,
    },
  },
};

export default nextConfig;