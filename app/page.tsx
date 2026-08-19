import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

const features = [
  {
    title: "Inbound Receiving",
    description:
      "Register cartons, pallets, products, quantities and receiving exceptions.",
    icon: "↙",
  },
  {
    title: "Work Orders",
    description:
      "Organize labeling, inspection, polybagging, kitting and repacking jobs.",
    icon: "✓",
  },
  {
    title: "Inventory",
    description:
      "Track available stock, storage locations, pallets and inventory movements.",
    icon: "▦",
  },
  {
    title: "Outbound Shipments",
    description:
      "Prepare, document and track shipments to Amazon, customers or warehouses.",
    icon: "↗",
  },
];

const stats = [
  {
    value: "24/7",
    label: "Operation visibility",
  },
  {
    value: "1",
    label: "Central platform",
  },
  {
    value: "100%",
    label: "Cloud based",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f5f7fa] text-[#111827]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#162033]/95 text-white shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" aria-label="FulfillOS home">
            <BrandLogo inverse />
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
            <a
              href="#features"
              className="text-slate-200 transition hover:text-white"
            >
              Features
            </a>

            <a
              href="#about"
              className="text-slate-200 transition hover:text-white"
            >
              About
            </a>

            <Link
              href="/auth/login"
              className="rounded-lg border border-slate-500 px-4 py-2 transition hover:border-white hover:bg-white/10"
            >
              Sign in
            </Link>

            <Link
              href="/auth/sign-up"
              className="rounded-lg bg-[#f59e0b] px-5 py-2 font-bold text-[#162033] transition hover:bg-[#fdba2d]"
            >
              Start free
            </Link>
          </nav>

          <Link
            href="/auth/login"
            className="rounded-lg bg-[#f59e0b] px-4 py-2 text-sm font-bold text-[#162033] md:hidden"
          >
            Sign in
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#162033] text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-[#f59e0b] blur-3xl" />
          <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-blue-500 blur-3xl" />
        </div>

        <div className="relative mx-auto grid min-h-[650px] max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-4 py-2 text-sm font-semibold text-[#fdba2d]">
              <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
              Built for prep centers and small 3PLs
            </div>

            <h1 className="max-w-4xl text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
              Run your fulfillment operation
              <span className="block text-[#f59e0b]">
                from one place.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              FulfillOS helps fulfillment companies manage receiving,
              preparation, inventory, storage, work orders, customer
              communication and outbound shipments.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/auth/sign-up"
                className="rounded-xl bg-[#f59e0b] px-7 py-4 font-bold text-[#162033] shadow-lg shadow-orange-950/20 transition hover:-translate-y-0.5 hover:bg-[#fdba2d]"
              >
                Create your workspace
              </Link>

              <a
                href="#features"
                className="rounded-xl border border-slate-500 px-7 py-4 font-semibold text-white transition hover:border-white hover:bg-white/10"
              >
                Explore features
              </a>
            </div>

            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-300">
              <span>✓ Multi-company architecture</span>
              <span>✓ Mobile-ready</span>
              <span>✓ Secure cloud access</span>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#243247] p-4 shadow-2xl shadow-black/30">
            <div className="rounded-2xl bg-[#f5f7fa] p-5 text-[#111827]">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <p className="text-sm text-slate-500">
                    Operations dashboard
                  </p>

                  <h2 className="text-xl font-bold">
                    Treemoon Prep
                  </h2>
                </div>

                <div className="rounded-lg bg-[#067d62]/10 px-3 py-2 text-xs font-bold text-[#067d62]">
                  Live
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <DashboardCard
                  label="Inbound today"
                  value="18"
                  detail="+4 from yesterday"
                />

                <DashboardCard
                  label="Work orders"
                  value="12"
                  detail="5 in progress"
                />

                <DashboardCard
                  label="Units in stock"
                  value="8,420"
                  detail="Across 42 locations"
                />

                <DashboardCard
                  label="Ready to ship"
                  value="7"
                  detail="3 priority orders"
                />
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold">
                    Recent activity
                  </h3>

                  <span className="text-sm font-semibold text-[#c7511f]">
                    View all
                  </span>
                </div>

                <div className="space-y-3">
                  <ActivityItem
                    color="#067d62"
                    title="Shipment received"
                    subtitle="TM-IN-00128 · 10 cartons"
                  />

                  <ActivityItem
                    color="#f59e0b"
                    title="Work order started"
                    subtitle="TM-WO-00214 · 600 units"
                  />

                  <ActivityItem
                    color="#2563eb"
                    title="Outbound shipment ready"
                    subtitle="TM-OUT-00087 · 4 cartons"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="border-b border-slate-200 bg-white py-24"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#c7511f]">
              Core operations
            </p>

            <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-[#162033] sm:text-5xl">
              Everything your warehouse team needs
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              A single platform for receiving, preparation, inventory,
              outbound operations and customer visibility.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#f59e0b] hover:shadow-xl"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#162033] text-xl font-black text-[#f59e0b] transition group-hover:bg-[#f59e0b] group-hover:text-[#162033]">
                  {feature.icon}
                </div>

                <h3 className="mt-6 text-xl font-bold text-[#162033]">
                  {feature.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {feature.description}
                </p>

                <Link
                  href="/auth/login"
                  className="mt-6 inline-flex text-sm font-bold text-[#c7511f]"
                >
                  Learn more →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="about"
        className="bg-[#f5f7fa] py-24"
      >
        <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#c7511f]">
              Built to scale
            </p>

            <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-[#162033]">
              One platform. Multiple companies.
            </h2>

            <p className="mt-6 text-lg leading-8 text-slate-600">
              FulfillOS is designed as a multi-tenant SaaS platform.
              Each company operates in its own secure workspace with its
              own employees, customers, inventory, rates and documents.
            </p>

            <div className="mt-8 space-y-4">
              <Benefit text="Separate and secure company data" />
              <Benefit text="Custom services, rates and warehouse settings" />
              <Benefit text="Employee and customer access permissions" />
              <Benefit text="Ready for future Android and iOS applications" />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-1">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
              >
                <p className="text-4xl font-black text-[#162033]">
                  {stat.value}
                </p>

                <p className="mt-2 font-medium text-slate-600">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#243247] py-20 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#fdba2d]">
              Start building
            </p>

            <h2 className="mt-3 text-4xl font-extrabold">
              Your operation deserves better tools.
            </h2>

            <p className="mt-4 max-w-2xl text-slate-300">
              Manage every operational step from receiving to final
              shipment with one secure cloud platform.
            </p>
          </div>

          <Link
            href="/auth/sign-up"
            className="rounded-xl bg-[#f59e0b] px-7 py-4 font-bold text-[#162033] transition hover:bg-[#fdba2d]"
          >
            Create an account
          </Link>
        </div>
      </section>

      <footer className="bg-[#162033] text-slate-300">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 px-6 py-8 sm:flex-row">
          <p>
            © 2026 FulfillOS. All rights reserved.
          </p>

          <p>
            Receive. Prep. Store. Ship.
          </p>
        </div>
      </footer>
    </main>
  );
}

function DashboardCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black text-[#162033]">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {detail}
      </p>
    </div>
  );
}

function ActivityItem({
  color,
  title,
  subtitle,
}: {
  color: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="mt-1.5 h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />

      <div>
        <p className="text-sm font-semibold text-[#162033]">
          {title}
        </p>

        <p className="text-xs text-slate-500">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function Benefit({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#067d62] text-sm font-bold text-white">
        ✓
      </div>

      <p className="font-medium text-slate-700">
        {text}
      </p>
    </div>
  );
}
