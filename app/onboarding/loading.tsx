export default function OnboardingLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-xl bg-[#f59e0b] text-2xl font-black text-[#162033]">
          F
        </div>

        <p className="mt-5 font-bold text-[#162033]">
          Loading workspace setup...
        </p>
      </div>
    </main>
  );
}