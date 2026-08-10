export default function ProductsLoading() {
  return (
    <main className="min-h-screen bg-[#f5f7fa] px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="h-5 w-36 animate-pulse rounded bg-slate-200" />

        <div className="mt-4 h-11 w-64 animate-pulse rounded-xl bg-slate-200" />

        <div className="mt-8 h-16 animate-pulse rounded-2xl bg-white" />

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-64 animate-pulse rounded-3xl bg-white"
            />
          ))}
        </div>
      </div>
    </main>
  );
}