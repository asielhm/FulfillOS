const features = [
  {
    title: "Inbound receiving",
    description:
      "Register cartons, pallets, products, quantities and receiving exceptions.",
  },
  {
    title: "Work orders",
    description:
      "Organize labeling, inspection, polybagging, kitting and repacking jobs.",
  },
  {
    title: "Inventory",
    description:
      "Track stock, storage locations, pallets and inventory movements.",
  },
  {
    title: "Outbound shipments",
    description:
      "Prepare, pack and document shipments to their final destination.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-20">
        <div className="mb-8 inline-flex w-fit rounded-full border border-blue-400/30 bg-blue-400/10 px-4 py-2 text-sm font-semibold text-blue-300">
          Fulfillment Operations Platform
        </div>

        <h1 className="max-w-5xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          Run your fulfillment operation from one place.
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
          FulfillOS helps prep centers and small 3PL companies manage
          receiving, preparation, inventory, storage, work orders and
          outbound shipments.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <a
            href="/sign-in"
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold transition hover:bg-blue-500"
          >
            Sign in
          </a>

          <span className="rounded-xl border border-slate-700 px-6 py-3 text-slate-300">
            Development version
          </span>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
            >
              <h2 className="text-lg font-semibold">{feature.title}</h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}