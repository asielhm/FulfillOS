import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { GlobalHelp } from "@/components/global-help";
import { PwaRegistration } from "@/components/pwa-registration";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "FulfillOS",
    template: "%s | FulfillOS",
  },
  description:
    "Operations, inventory and client management platform for prep centers and small 3PL companies.",
  applicationName: "FulfillOS",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FulfillOS",
  },
  icons: {
    icon: "/brand/fulfillos-mark.png",
    apple: "/brand/fulfillos-mark.png",
  },
  keywords: ["fulfillment", "3PL", "prep center", "warehouse operations", "inventory"],
  openGraph: {
    type: "website",
    title: "FulfillOS — Fulfillment Operations Platform",
    description: "Run receiving, inventory, prep, and outbound operations from one place.",
    siteName: "FulfillOS",
  },
  twitter: {
    card: "summary_large_image",
    title: "FulfillOS — Fulfillment Operations Platform",
    description: "Run receiving, inventory, prep, and outbound operations from one place.",
  },
};

export const viewport: Viewport = {
  themeColor: "#162033",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <PwaRegistration />
          <GlobalHelp />
        </ThemeProvider>
      </body>
    </html>
  );
}
