import Image from "next/image";
import { Camera, CheckCircle2, MapPin, PackageCheck, ShieldCheck, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import { ProofPhotoUploader } from "@/components/proof-photo-uploader";
import type { Locale } from "@/lib/i18n";

export type ProofEvidenceView = {
  id: string;
  type: string;
  text: string | null;
  capturedAt: string;
  capturedBy: string;
  photoUrl: string | null;
};

export type ProofEventView = {
  id: string;
  eventType: string;
  happenedAt: string;
  actor: string;
  productTitle: string;
  sku: string;
  receivedQuantity: number;
  goodQuantity: number;
  damagedQuantity: number;
  location: string;
  note: string | null;
  evidence: ProofEvidenceView[];
};

export function ProofOfWorkTimeline({
  locale,
  events,
  canAttachPhoto = false,
}: {
  locale: Locale;
  events: ProofEventView[];
  canAttachPhoto?: boolean;
}) {
  const es = locale === "es";
  const photoCount = events.reduce(
    (total, event) => total + event.evidence.filter((item) => item.type === "photo").length,
    0,
  );
  const damagedWithoutPhoto = events.filter(
    (event) => event.damagedQuantity > 0 && !event.evidence.some((item) => item.type === "photo"),
  ).length;

  return (
    <section id="proof-of-work" className="scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#c7511f]">
            Proof of Work
          </p>
          <h2 className="mt-2 text-xl font-extrabold text-[#162033]">
            {es ? "Evidencia del trabajo físico" : "Physical work evidence"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {es
              ? "Cada recepción conserva empleado, hora, producto, cantidad, ubicación y evidencia asociada."
              : "Every receipt preserves the employee, time, product, quantity, location, and linked evidence."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-800">
            {events.length} {es ? "eventos" : "events"}
          </span>
          <span className="rounded-full bg-sky-100 px-3 py-1.5 text-sky-800">
            {photoCount} {es ? "fotos" : "photos"}
          </span>
          {damagedWithoutPhoto > 0 ? (
            <span className="rounded-full bg-red-100 px-3 py-1.5 text-red-800">
              {damagedWithoutPhoto} {es ? "daños sin foto" : "damage events missing a photo"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 font-bold text-[#162033]">
              {es ? "La evidencia comenzará con la primera recepción" : "Evidence starts with the first receipt"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {es
                ? "FulfillOS mostrará aquí el historial verificable sin mezclarlo con cambios administrativos."
                : "FulfillOS will show the verifiable history here, separately from administrative record changes."}
            </p>
          </div>
        ) : (
          events.map((event) => {
            const photos = event.evidence.filter(
              (item): item is ProofEvidenceView & { photoUrl: string } => Boolean(item.photoUrl),
            );
            const hasPhotoEvidence = event.evidence.some((item) => item.type === "photo");
            const systemEvidence = event.evidence.filter((item) => !item.photoUrl && item.text);

            return (
              <article key={event.id} className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="border-b border-slate-100 bg-slate-50 p-5">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="flex gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                        <PackageCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-extrabold text-[#162033]">
                          {es ? "Unidades recibidas" : "Units received"} · {event.sku}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{event.productTitle}</p>
                      </div>
                    </div>
                    <time className="text-sm font-semibold text-slate-500" dateTime={event.happenedAt}>
                      {new Intl.DateTimeFormat(es ? "es-AR" : "en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(event.happenedAt))}
                    </time>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Fact icon={<UserRound className="h-4 w-4" />} label={es ? "Empleado" : "Employee"} value={event.actor} />
                    <Fact icon={<MapPin className="h-4 w-4" />} label={es ? "Ubicación" : "Location"} value={event.location} />
                    <Fact icon={<CheckCircle2 className="h-4 w-4" />} label={es ? "Recibidas" : "Received"} value={String(event.receivedQuantity)} />
                    <Fact
                      icon={<ShieldCheck className="h-4 w-4" />}
                      label={es ? "Resultado" : "Result"}
                      value={`${event.goodQuantity} ${es ? "buenas" : "good"} · ${event.damagedQuantity} ${es ? "dañadas" : "damaged"}`}
                      alert={event.damagedQuantity > 0}
                    />
                  </div>

                  {event.note ? (
                    <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-slate-600">
                      <strong>{es ? "Nota:" : "Note:"}</strong> {event.note}
                    </p>
                  ) : null}
                </div>

                <div className="p-5">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#162033]">
                    <Camera className="h-4 w-4" />
                    {es ? "Evidencia vinculada" : "Linked evidence"}
                  </div>

                  {photos.length > 0 ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {photos.map((proof) => (
                        <a
                          key={proof.id}
                          href={proof.photoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                        >
                          <div className="relative aspect-[4/3] bg-slate-100">
                            <Image
                              src={proof.photoUrl}
                              alt={es ? `Evidencia fotográfica de ${event.sku}` : `Photo evidence for ${event.sku}`}
                              fill
                              unoptimized
                              className="object-cover transition duration-200 group-hover:scale-[1.02]"
                            />
                          </div>
                          <div className="p-3 text-xs text-slate-500">
                            <p className="font-bold text-[#162033]">{proof.capturedBy}</p>
                            <p className="mt-1">
                              {new Intl.DateTimeFormat(es ? "es-AR" : "en-US", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              }).format(new Date(proof.capturedAt))}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : hasPhotoEvidence ? (
                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                      {es
                        ? "La foto está vinculada, pero la vista previa no está disponible temporalmente."
                        : "The photo is linked, but its preview is temporarily unavailable."}
                    </p>
                  ) : event.damagedQuantity > 0 ? (
                    <div className="mt-3">
                      <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
                        {es
                          ? "Falta una foto de soporte para esta recepción con daño."
                          : "A supporting photo is missing for this damaged receipt."}
                      </p>
                      {canAttachPhoto ? (
                        <ProofPhotoUploader operationalEventId={event.id} locale={locale} />
                      ) : null}
                    </div>
                  ) : null}

                  {systemEvidence.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {systemEvidence.map((proof) => (
                        <p key={proof.id} className="flex gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                          {proof.text}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function Fact({
  icon,
  label,
  value,
  alert = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${alert ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </p>
      <p className={`mt-1 text-sm font-bold ${alert ? "text-red-800" : "text-[#162033]"}`}>{value}</p>
    </div>
  );
}
