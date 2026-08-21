"use client";

import {
  Ban,
  CalendarClock,
  LoaderCircle,
  PackageCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Locale } from "@/lib/i18n";

type LifecycleAction = "reschedule" | "mark_arrived" | "cancel";

type LifecycleResponse = {
  ok?: boolean;
  error?: string;
};

export function InboundLifecycleActions({
  shipmentId,
  status,
  expectedAt,
  receivedUnits,
  canManage,
  canMarkArrived,
  locale,
}: {
  shipmentId: string;
  status: string;
  expectedAt: string | null;
  receivedUnits: number;
  canManage: boolean;
  canMarkArrived: boolean;
  locale: Locale;
}) {
  const es = locale === "es";
  const router = useRouter();
  const [expectedDate, setExpectedDate] = useState(
    expectedAt?.slice(0, 10) ?? "",
  );
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [pendingAction, setPendingAction] = useState<LifecycleAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canReschedule = canManage && ["draft", "expected"].includes(status);
  const canCancel =
    canManage &&
    !["completed", "cancelled"].includes(status) &&
    receivedUnits === 0;
  const showArrived = canMarkArrived && status === "expected";

  async function run(action: LifecycleAction) {
    if (pendingAction) return;

    setPendingAction(action);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/inbound/${shipmentId}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          expectedDate: action === "reschedule" ? expectedDate : undefined,
          reason:
            action === "reschedule"
              ? rescheduleReason
              : action === "cancel"
                ? cancelReason
                : undefined,
        }),
      });
      const result = (await response.json()) as LifecycleResponse;

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error ??
            (es
              ? "No se pudo actualizar el inbound."
              : "The inbound shipment could not be updated."),
        );
      }

      setSuccess(
        action === "mark_arrived"
          ? es
            ? "Inbound marcado como llegado."
            : "Inbound marked as arrived."
          : action === "reschedule"
            ? es
              ? "Nueva fecha esperada guardada."
              : "New expected date saved."
            : es
              ? "Inbound cancelado y excepción cerrada."
              : "Inbound cancelled and exception closed.",
      );
      setRescheduleReason("");
      setCancelReason("");
      router.refresh();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : es
            ? "No se pudo actualizar el inbound."
            : "The inbound shipment could not be updated.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  if (!canReschedule && !canCancel && !showArrived) {
    if (receivedUnits > 0 && !["completed", "cancelled"].includes(status)) {
      return (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          {es
            ? "Este inbound ya tiene unidades recibidas. Para proteger el inventario, no puede cancelarse directamente."
            : "This inbound already has received units. To protect inventory, it cannot be cancelled directly."}
        </p>
      );
    }

    return null;
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#c7511f]">
        {es ? "Estado operativo" : "Operational status"}
      </p>
      <h2 className="mt-2 text-xl font-extrabold text-[#162033]">
        {es ? "¿Qué ocurrió con este inbound?" : "What happened to this inbound?"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {es
          ? "Actualiza el estado real para que Control Tower muestre únicamente lo que requiere atención."
          : "Update the real status so Control Tower only shows work that still needs attention."}
      </p>

      {showArrived ? (
        <button
          type="button"
          disabled={Boolean(pendingAction)}
          onClick={() => void run("mark_arrived")}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 font-black text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
        >
          {pendingAction === "mark_arrived" ? (
            <LoaderCircle className="h-5 w-5 animate-spin" />
          ) : (
            <PackageCheck className="h-5 w-5" />
          )}
          {es ? "MARCAR COMO LLEGADO" : "MARK AS ARRIVED"}
        </button>
      ) : null}

      {canReschedule ? (
        <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-bold text-[#162033]">
            <CalendarClock className="h-5 w-5 text-[#c7511f]" />
            {es ? "Reprogramar fecha esperada" : "Reschedule expected date"}
          </summary>
          <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-slate-500">
            {es ? "Nueva fecha esperada" : "New expected date"}
            <input
              type="date"
              value={expectedDate}
              onChange={(event) => setExpectedDate(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-[#162033]"
            />
          </label>
          <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-slate-500">
            {es ? "Motivo" : "Reason"}
            <textarea
              value={rescheduleReason}
              onChange={(event) => setRescheduleReason(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder={es ? "Ej.: demora informada por el proveedor" : "Example: supplier reported a delay"}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-[#162033]"
            />
          </label>
          <button
            type="button"
            disabled={
              !expectedDate ||
              rescheduleReason.trim().length < 3 ||
              Boolean(pendingAction)
            }
            onClick={() => void run("reschedule")}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#162033] px-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendingAction === "reschedule" ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarClock className="h-4 w-4" />
            )}
            {es ? "Guardar nueva fecha" : "Save new date"}
          </button>
        </details>
      ) : null}

      {canCancel ? (
        <details className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-bold text-red-800">
            <Ban className="h-5 w-5" />
            {es ? "Cancelar inbound" : "Cancel inbound"}
          </summary>
          <p className="mt-3 text-sm leading-6 text-red-800">
            {es
              ? "Úsalo únicamente si la mercadería no llegará. La acción conserva el historial y cierra la alerta de demora."
              : "Use this only when the goods will not arrive. The action preserves history and closes the delay alert."}
          </p>
          <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-red-700">
            {es ? "Motivo obligatorio" : "Required reason"}
            <textarea
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder={es ? "Ej.: el cliente canceló el envío" : "Example: customer cancelled the shipment"}
              className="mt-2 w-full rounded-xl border border-red-300 bg-white px-3 py-2 text-sm text-[#162033]"
            />
          </label>
          <button
            type="button"
            disabled={cancelReason.trim().length < 3 || Boolean(pendingAction)}
            onClick={() => void run("cancel")}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-4 font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendingAction === "cancel" ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Ban className="h-4 w-4" />
            )}
            {es ? "Confirmar cancelación" : "Confirm cancellation"}
          </button>
        </details>
      ) : null}

      <div aria-live="polite">
        {success ? (
          <p className="mt-4 rounded-xl bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-900">
            ✓ {success}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-4 rounded-xl bg-red-100 px-3 py-2 text-sm font-bold text-red-900">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
