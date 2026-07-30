export default function WarehousesLoading() {
  return (
    <main className="min-h-screen bg-[#f5f7fa] px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="h-8 w-52 animate-pulse rounded-xl bg-slate-200" />

        <div className="mt-4 h-5 w-96 max-w-full animate-pulse rounded-lg bg-slate-200" />

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-64 animate-pulse rounded-3xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      </div>
    </main>
  );
}