import { LoginForm } from "@/components/login-form";
import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function Page({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="relative min-h-svh overflow-hidden bg-[#162033] text-white">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute -left-32 top-16 h-96 w-96 rounded-full bg-[#f59e0b] blur-3xl" />
        <div className="absolute -right-28 bottom-0 h-[28rem] w-[28rem] rounded-full bg-blue-500 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-svh max-w-7xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden flex-col justify-between px-12 py-10 lg:flex xl:px-16">
          <Link href="/" className="flex w-fit items-center gap-3">
            <BrandLogo inverse />
          </Link>

          <div className="max-w-xl pb-16">
            <p className="mb-5 w-fit rounded-full border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-4 py-2 text-sm font-semibold text-[#fdba2d]">
              Operations you can prove
            </p>
            <h1 className="text-5xl font-black leading-[1.08] tracking-tight xl:text-6xl">
              Run every fulfillment workflow from one place.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
              Keep receiving, inventory, prep, and outbound work visible while protecting revenue and catching exceptions early.
            </p>

            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3 text-sm">
              {[
                ["Proof of Work", "Trace every action"],
                ["Revenue Protection", "Capture billable work"],
                ["AI Exceptions", "Resolve issues faster"],
              ].map(([title, description]) => (
                <div key={title} className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <p className="font-bold text-white">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-500">FulfillOS · Built for prep centers and modern 3PL teams</p>
        </section>

        <section className="flex items-center justify-center p-5 sm:p-8 lg:bg-[#f5f7fa] lg:text-[#111827]">
          <div className="w-full max-w-md">
            <Link href="/" className="mb-8 flex items-center justify-center gap-3 lg:hidden">
              <BrandLogo inverse className="lg:hidden" />
            </Link>
            <LoginForm initialError={error} />
          </div>
        </section>
      </div>
    </main>
  );
}
