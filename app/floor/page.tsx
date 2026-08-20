import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  ClipboardCheck,
  PackageCheck,
  ScanLine,
} from "lucide-react";

import { FloorShell } from "@/components/floor/floor-shell";
import { getFloorContext } from "@/lib/floor";

export default async function FloorHomePage() {
  const { organization, membership, locale, worker, defaultWarehouse } =
    await getFloorContext();
  const es = locale === "es";

  if (membership.role === "viewer") redirect("/dashboard");

  const actions = [
    {
      label: es ? "RECIBIR" : "RECEIVE",
      detail: es ? "Recepciones esperadas" : "Expected inbound",
      href: "/floor/receive",
      icon: PackageCheck,
      active: true,
    },
    {
      label: "PREP",
      detail: es ? "Ver instrucciones" : "View instructions",
      href: "/work-orders",
      icon: ClipboardCheck,
      active: true,
    },
    {
      label: "SCANNER",
      detail: es ? "Probar códigos" : "Test barcodes",
      href: "/scanner",
      icon: ScanLine,
      active: true,
    },
    {
      label: es ? "MOVER" : "MOVE",
      detail: es ? "Próxima fase" : "Next phase",
      icon: ArrowLeftRight,
      active: false,
    },
    {
      label: es ? "CONTAR" : "COUNT",
      detail: es ? "Próxima fase" : "Next phase",
      icon: Boxes,
      active: false,
    },
    {
      label: es ? "REPORTAR PROBLEMA" : "REPORT A PROBLEM",
      detail: es ? "Próxima fase" : "Next phase",
      icon: AlertTriangle,
      active: false,
    },
  ];

  return (
    <FloorShell
      organizationName={organization.name}
      workerName={worker.displayName}
      warehouseName={defaultWarehouse?.name}
      role={membership.role}
      locale={locale}
    >
      <section className="rounded-3xl bg-[#162033] p-6 text-white shadow-xl sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#fdba2d]">
          {es ? "Modo Piso" : "Floor Mode"}
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
          {es ? "Buen día" : "Good morning"}, {worker.displayName.split(" ")[0]}
        </h1>
        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-white/10 px-3 py-2 font-semibold">
            {defaultWarehouse
              ? `${defaultWarehouse.name} · ${defaultWarehouse.code}`
              : es
                ? "Sin almacén configurado"
                : "No warehouse configured"}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-2 font-semibold capitalize">
            {membership.role}
          </span>
        </div>
      </section>

      <div className="mt-7">
        <h2 className="text-xl font-black text-[#162033]">
          {es ? "¿En qué vas a trabajar?" : "What are you working on?"}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {es
            ? "Elegí una tarea. Las acciones operativas registran tu identidad automáticamente."
            : "Choose a task. Operational actions record your identity automatically."}
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          const content = (
            <>
              <span className={action.active ? "flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f59e0b] text-[#162033]" : "flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 text-slate-500"}>
                <Icon className="h-7 w-7" />
              </span>
              <span>
                <span className="block text-lg font-black">{action.label}</span>
                <span className={action.active ? "mt-1 block text-sm text-slate-500" : "mt-1 block text-sm font-semibold text-amber-700"}>
                  {action.detail}
                </span>
              </span>
            </>
          );

          return action.active && action.href ? (
            <Link
              key={action.label}
              href={action.href}
              className="flex min-h-28 items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 text-[#162033] shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md active:translate-y-0"
            >
              {content}
            </Link>
          ) : (
            <div
              key={action.label}
              aria-disabled="true"
              className="flex min-h-28 items-center gap-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-slate-500"
            >
              {content}
            </div>
          );
        })}
      </div>
    </FloorShell>
  );
}
