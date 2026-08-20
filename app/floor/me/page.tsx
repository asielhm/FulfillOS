import type { ReactNode } from "react";
import { BadgeCheck, Building2, LogOut, MapPin, UserRound } from "lucide-react";

import { signOut } from "@/app/dashboard/actions";
import { FloorShell } from "@/components/floor/floor-shell";
import { getFloorContext } from "@/lib/floor";

export default async function FloorProfilePage() {
  const {
    organization,
    membership,
    email,
    locale,
    worker,
    defaultWarehouse,
  } = await getFloorContext();
  const es = locale === "es";

  return (
    <FloorShell
      organizationName={organization.name}
      workerName={worker.displayName}
      warehouseName={defaultWarehouse?.name}
      role={membership.role}
      locale={locale}
    >
      <p className="text-sm font-black uppercase tracking-[0.16em] text-[#c7511f]">
        {es ? "Identidad de trabajo" : "Worker identity"}
      </p>
      <h1 className="mt-2 text-3xl font-black text-[#162033]">
        {es ? "Mi perfil" : "My profile"}
      </h1>

      <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-[#162033] p-6 text-white">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f59e0b] text-[#162033]">
            <UserRound className="h-8 w-8" />
          </span>
          <h2 className="mt-4 text-2xl font-black">{worker.displayName}</h2>
          <p className="mt-1 break-all text-sm text-slate-300">{email}</p>
        </div>
        <dl className="divide-y divide-slate-100 p-2">
          <IdentityRow icon={<BadgeCheck className="h-5 w-5" />} label={es ? "Rol" : "Role"} value={membership.role} />
          <IdentityRow icon={<Building2 className="h-5 w-5" />} label={es ? "Organización" : "Organization"} value={organization.name} />
          <IdentityRow icon={<MapPin className="h-5 w-5" />} label={es ? "Almacén predeterminado" : "Default warehouse"} value={defaultWarehouse ? `${defaultWarehouse.name} · ${defaultWarehouse.code}` : es ? "Sin configurar" : "Not configured"} />
        </dl>
      </section>

      <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
        <strong>{es ? "Proof of Work activo." : "Proof of Work active."}</strong>{" "}
        {es
          ? "Las operaciones confirmadas se vinculan a tu identidad, fecha, hora, ubicación y producto."
          : "Confirmed operations are linked to your identity, time, location, and product."}
      </div>

      <form action={signOut} className="mt-6">
        <button type="submit" className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 bg-white px-5 font-black text-[#162033]">
          <LogOut className="h-5 w-5" />
          {es ? "Cerrar sesión" : "Sign out"}
        </button>
      </form>
    </FloorShell>
  );
}

function IdentityRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl p-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#162033]">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</dt>
        <dd className="mt-1 truncate font-bold capitalize text-[#162033]">{value}</dd>
      </div>
    </div>
  );
}
