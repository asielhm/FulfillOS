"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Camera, LoaderCircle } from "lucide-react";

import { PhotoEvidenceCapture } from "@/components/floor/photo-evidence-capture";
import type { Locale } from "@/lib/i18n";

type EvidenceResponse = {
  ok?: boolean;
  error?: string;
};

export function ProofPhotoUploader({
  operationalEventId,
  locale,
}: {
  operationalEventId: string;
  locale: Locale;
}) {
  const es = locale === "es";
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function attachPhoto() {
    if (!file || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("operationalEventId", operationalEventId);
      formData.set("context", "damaged_inbound");
      formData.set("photo", file);

      const response = await fetch("/api/floor/evidence", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as EvidenceResponse;
      if (!response.ok || !result.ok) {
        throw new Error(
          result.error ?? (es ? "No se pudo guardar la foto." : "The photo could not be saved."),
        );
      }

      setSaved(true);
      setFile(null);
      router.refresh();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : es
            ? "No se pudo guardar la foto. Intentá otra vez."
            : "The photo could not be saved. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (saved) {
    return (
      <p role="status" className="mt-3 rounded-xl bg-emerald-100 px-4 py-3 text-sm font-bold text-emerald-900">
        ✓ {es ? "Foto vinculada a esta recepción." : "Photo linked to this receipt."}
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-4">
      <PhotoEvidenceCapture locale={locale} file={file} onChange={setFile} />
      <button
        type="button"
        disabled={!file || submitting}
        onClick={() => void attachPhoto()}
        className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-5 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
        {submitting
          ? es ? "GUARDANDO FOTO…" : "SAVING PHOTO…"
          : es ? "VINCULAR FOTO A ESTA RECEPCIÓN" : "LINK PHOTO TO THIS RECEIPT"}
      </button>
      {error ? (
        <p role="alert" className="mt-3 rounded-xl bg-white px-3 py-2 text-sm font-bold text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
