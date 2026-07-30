export default function DashboardLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-xl bg-[#f59e0b] text-2xl font-black text-[#162033]">
          F
        </div>

        <p className="mt-5 font-bold text-[#162033]">
          Loading your workspace...
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Verifying your account and organization.
        </p>
      </div>
    </main>
  );
}