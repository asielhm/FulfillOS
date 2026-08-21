"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, LoaderCircle, SearchCheck, XCircle } from "lucide-react";

import type { Locale } from "@/lib/i18n";

export function ExceptionActions({
  exceptionId,
  status,
  locale,
  canManage,
}: {
  exceptionId: string;
  status: "open" | "reviewing";
  locale: Locale;
  canManage: boolean;
}) {
  const router = useRouter();
  const es = locale === "es";
  const [note, setNote] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "start_review" | "resolve" | "dismiss") {
    setError(null);
    setPendingAction(action);

    try {
      const response = await fetch(`/api/exceptions/${exceptionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || (es ? "No se pudo actualizar la excepción." : "The exception could not be updated."));
      }

      setNote("");
      router.refresh();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : es
            ? "No se pudo actualizar la excepción."
            : "The exception could not be updated.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  if (status === "open") {
    return (
      <div>
        <button
          type="button"
          onClick={() => run("start_review")}
          disabled={Boolean(pendingAction)}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#162033] px-5 font-bold text-white transition hover:bg-[#243247] disabled:cursor-wait disabled:opacity-60"
        >
          {pendingAction ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <SearchCheck className="h-4 w-4" />}
          {es ? "Iniciar revisión" : "Start review"}
        </button>
        {error ? <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{error}</p> : null}
      </div>
    );
  }

  if (!canManage) {
    return (
      <p className="rounded-xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800">
        {es ? "Revisión en curso. Un manager puede cerrar el caso." : "Review in progress. A manager can close the case."}
      </p>
    );
  }

  return (
    <details className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:max-w-xl">
      <summary className="cursor-pointer font-bold text-[#162033]">
        {es ? "Resolver o descartar" : "Resolve or dismiss"}
      </summary>
      <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-slate-500" htmlFor={`resolution-${exceptionId}`}>
        {es ? "Motivo obligatorio" : "Required reason"}
      </label>
      <textarea
        id={`resolution-${exceptionId}`}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={2000}
        rows={3}
        placeholder={es ? "Qué se verificó y por qué se cierra el caso…" : "What was verified and why the case is being closed…"}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#c7511f]"
      />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => run("resolve")}
          disabled={note.trim().length < 3 || Boolean(pendingAction)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendingAction === "resolve" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {es ? "Resolver" : "Resolve"}
        </button>
        <button
          type="button"
          onClick={() => run("dismiss")}
          disabled={note.trim().length < 3 || Boolean(pendingAction)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendingAction === "dismiss" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          {es ? "Descartar" : "Dismiss"}
        </button>
      </div>
      {error ? <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
    </details>
  );
}
