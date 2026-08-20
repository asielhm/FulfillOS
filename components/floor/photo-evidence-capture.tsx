"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";

const maximumBytes = 10 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function PhotoEvidenceCapture({
  locale,
  file,
  onChange,
}: {
  locale: "en" | "es";
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const es = locale === "es";
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function chooseFile(nextFile: File | null) {
    if (!nextFile) return;
    if (!allowedTypes.has(nextFile.type)) {
      setValidationError(
        es ? "Usá una imagen JPEG, PNG o WebP." : "Use a JPEG, PNG, or WebP image.",
      );
      onChange(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (nextFile.size > maximumBytes) {
      setValidationError(
        es ? "La foto debe pesar 10 MB o menos." : "Photo must be 10 MB or smaller.",
      );
      onChange(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setValidationError(null);
    onChange(nextFile);
  }

  return (
    <div className="mt-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
      />
      {previewUrl && file ? (
        <div className="overflow-hidden rounded-2xl border border-red-200 bg-white">
          <div className="relative aspect-[4/3] w-full bg-slate-100">
            <Image
              src={previewUrl}
              alt={es ? "Vista previa de evidencia del daño" : "Damage evidence preview"}
              fill
              unoptimized
              className="object-cover"
            />
          </div>
          <div className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#162033]">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setValidationError(null);
                onChange(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              aria-label={es ? "Quitar foto" : "Remove photo"}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-red-300 bg-white px-5 font-black text-red-800"
        >
          <Camera className="h-6 w-6" />
          {es ? "TOMAR FOTO DEL DAÑO" : "TAKE DAMAGE PHOTO"}
        </button>
      )}
      <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-red-700">
        <ImagePlus className="h-4 w-4 shrink-0" />
        {es
          ? "Recomendada para proteger al almacén y resolver reclamos."
          : "Recommended to protect the warehouse and resolve disputes."}
      </p>
      {validationError ? (
        <p role="alert" className="mt-2 rounded-xl bg-red-100 px-3 py-2 text-xs font-bold text-red-900">
          {validationError}
        </p>
      ) : null}
    </div>
  );
}
