import { SignUpForm } from "@/components/sign-up-form";
import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";

export default function Page() {
  return (
    <main className="relative min-h-svh overflow-hidden bg-[#162033] text-white">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute -left-32 top-16 h-96 w-96 rounded-full bg-[#f59e0b] blur-3xl" />
        <div className="absolute -right-28 bottom-0 h-[28rem] w-[28rem] rounded-full bg-emerald-500 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-svh max-w-7xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden flex-col justify-between px-12 py-10 lg:flex xl:px-16">
          <Link href="/" className="flex w-fit items-center gap-3">
            <BrandLogo inverse />
          </Link>

          <div className="max-w-xl pb-10">
            <p className="mb-5 w-fit rounded-full border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-4 py-2 text-sm font-semibold text-[#fdba2d]">
              Welcome to FulfillOS
            </p>
            <h1 className="text-5xl font-black leading-[1.08] tracking-tight xl:text-6xl">
              Build a warehouse operation you can prove.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
              Create your secure workspace and bring customers, receiving, inventory, prep and outbound work together from day one.
            </p>

            <div className="mt-9 space-y-3">
              {[
                ["01", "Create your workspace", "Set up your company and team securely."],
                ["02", "Add customers and products", "Keep every SKU connected to the right client."],
                ["03", "Start operating", "Receive, track and resolve work from one place."],
              ].map(([number, title, description]) => (
                <div key={number} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f59e0b] text-sm font-black text-[#162033]">
                    {number}
                  </span>
                  <div>
                    <p className="font-bold text-white">{title}</p>
                    <p className="mt-1 text-sm text-slate-400">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-500">Every unit accounted for. Every action proven.</p>
        </section>

        <section className="flex items-center justify-center p-5 sm:p-8 lg:bg-[#f5f7fa] lg:text-[#111827]">
          <div className="w-full max-w-md">
            <Link href="/" className="mb-8 flex items-center justify-center lg:hidden">
              <BrandLogo inverse />
            </Link>
            <SignUpForm />
          </div>
        </section>
      </div>
    </main>
  );
}
