"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { PhotoEvidenceCapture } from "@/components/floor/photo-evidence-capture";
import { LocationSelect } from "@/components/floor/location-select";
import { QuantityInput } from "@/components/floor/quantity-input";
import { ScanInput } from "@/components/floor/scan-input";
import type { Locale } from "@/lib/i18n";

type Location = {
  id: string;
  name: string;
  code: string;
  barcode: string | null;
  purpose: string;
};

type ReceivingItem = {
  id: string;
  product_id: string;
  expected_quantity: number;
  received_quantity: number;
  damaged_quantity: number;
  product: {
    id: string;
    title: string;
    sku: string;
    barcode: string | null;
    asin: string | null;
    fnsku: string | null;
  };
};

type ApiResult = {
  ok?: boolean;
  error?: string;
  operationalEventId?: string | null;
  item?: {
    id: string;
    expected_quantity: number;
    received_quantity: number;
    damaged_quantity: number;
  };
};

type EvidenceApiResult = {
  ok?: boolean;
  error?: string;
};

type PhotoStatus = "not-needed" | "uploading" | "attached" | "missing" | "failed";

function normalized(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function newIdempotencyKey() {
  return globalThis.crypto?.randomUUID?.() ?? `receive-${Date.now()}-${Math.random()}`;
}

export function ReceivingWorkflow({
  locale,
  shipment,
  initialItems,
  locations,
}: {
  locale: Locale;
  shipment: {
    id: string;
    inboundNumber: string;
    customer: string;
    warehouse: string;
    warehouseCode: string;
  };
  initialItems: ReceivingItem[];
  locations: Location[];
}) {
  const es = locale === "es";
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [location, setLocation] = useState<Location | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [damaged, setDamaged] = useState(0);
  const [note, setNote] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [locationMessage, setLocationMessage] = useState(
    es ? "Esperando el código de una ubicación." : "Waiting for a location code.",
  );
  const [locationError, setLocationError] = useState(false);
  const [productMessage, setProductMessage] = useState(
    es ? "Escaneá un producto incluido en este inbound." : "Scan a product included in this inbound.",
  );
  const [productError, setProductError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [success, setSuccess] = useState<{
    sku: string;
    total: number;
    damaged: number;
    location: string;
    operationalEventId: string | null;
    photoStatus: PhotoStatus;
    photoError: string | null;
  } | null>(null);

  const activeItem = items.find((item) => item.id === activeItemId) ?? null;
  const totals = useMemo(
    () =>
      items.reduce(
        (sum, item) => ({
          expected: sum.expected + item.expected_quantity,
          received: sum.received + item.received_quantity,
          damaged: sum.damaged + item.damaged_quantity,
        }),
        { expected: 0, received: 0, damaged: 0 },
      ),
    [items],
  );
  const remaining = activeItem
    ? Math.max(activeItem.expected_quantity - activeItem.received_quantity, 0)
    : 0;

  function scanLocation(value: string) {
    const code = normalized(value);
    const match = locations.find(
      (entry) => normalized(entry.code) === code || normalized(entry.barcode) === code,
    );
    if (!match) {
      setLocationError(true);
      setLocationMessage(
        es
          ? `Ubicación no reconocida: ${value}. Revisá el código e intentá otra vez.`
          : `Location not recognized: ${value}. Check the code and try again.`,
      );
      return;
    }
    setLocation(match);
    setLocationError(false);
    setLocationMessage(`${match.code} · ${match.name}`);
    setSubmitError(null);
  }

  function selectLocation(locationId: string) {
    const match = locations.find((entry) => entry.id === locationId);
    if (!match) return;
    setLocation(match);
    setLocationError(false);
    setLocationMessage(`${match.code} · ${match.name}`);
    setSubmitError(null);
  }

  function scanProduct(value: string) {
    const code = normalized(value);
    const match = items.find((item) =>
      [item.product.sku, item.product.barcode, item.product.asin, item.product.fnsku]
        .map(normalized)
        .filter(Boolean)
        .includes(code),
    );
    if (!match) {
      setProductError(true);
      setProductMessage(
        es
          ? `Este código no pertenece a ${shipment.inboundNumber}: ${value}`
          : `This code does not belong to ${shipment.inboundNumber}: ${value}`,
      );
      setActiveItemId(null);
      return;
    }
    const nextRemaining = Math.max(
      match.expected_quantity - match.received_quantity,
      0,
    );
    setActiveItemId(match.id);
    setQuantity(nextRemaining || 1);
    setDamaged(0);
    setNote("");
    setPhotoFile(null);
    setProductError(false);
    setProductMessage(`${match.product.sku} · ${match.product.title}`);
    setSubmitError(null);
  }

  async function attachPhoto(operationalEventId: string, file: File) {
    const formData = new FormData();
    formData.set("operationalEventId", operationalEventId);
    formData.set("context", "damaged_inbound");
    formData.set("photo", file);

    const response = await fetch("/api/floor/evidence", {
      method: "POST",
      body: formData,
    });
    const result = (await response.json()) as EvidenceApiResult;
    if (!response.ok || !result.ok) {
      throw new Error(
        result.error ??
          (es ? "No se pudo guardar la foto." : "The photo could not be saved."),
      );
    }
  }

  async function retryPhotoEvidence() {
    if (!success?.operationalEventId || !photoFile) return;
    setSuccess((current) =>
      current ? { ...current, photoStatus: "uploading", photoError: null } : current,
    );
    try {
      await attachPhoto(success.operationalEventId, photoFile);
      setSuccess((current) =>
        current ? { ...current, photoStatus: "attached", photoError: null } : current,
      );
      setPhotoFile(null);
    } catch (error) {
      setSuccess((current) =>
        current
          ? {
              ...current,
              photoStatus: "failed",
              photoError:
                error instanceof Error
                  ? error.message
                  : es
                    ? "No se pudo guardar la foto."
                    : "The photo could not be saved.",
            }
          : current,
      );
    }
  }

  async function receive() {
    if (!location || !activeItem) return;
    if (!navigator.onLine) {
      setSubmitError(
        es
          ? "Conexión perdida. Esta recepción NO fue registrada. Reconectate y presioná Reintentar."
          : "Connection lost. This receipt has NOT been recorded. Reconnect and press Retry.",
      );
      return;
    }
    if (quantity <= 0 || !Number.isInteger(quantity)) {
      setSubmitError(es ? "Ingresá una cantidad entera mayor que cero." : "Enter a whole quantity greater than zero.");
      return;
    }
    if (damaged < 0 || damaged > quantity) {
      setSubmitError(es ? "Las unidades dañadas no pueden superar el total recibido." : "Damaged units cannot exceed the total received.");
      return;
    }
    if (damaged > 0 && note.trim().length < 3) {
      setSubmitError(es ? "Agregá una nota breve que describa el daño." : "Add a short note describing the damage.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/floor/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inboundItemId: activeItem.id,
          locationId: location.id,
          receivedQuantity: quantity,
          damagedQuantity: damaged,
          idempotencyKey,
          note: note.trim() || null,
        }),
      });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.ok || !result.item) {
        throw new Error(result.error ?? (es ? "La recepción no fue confirmada." : "The receipt was not confirmed."));
      }

      setItems((current) =>
        current.map((item) =>
          item.id === result.item?.id
            ? {
                ...item,
                expected_quantity: result.item.expected_quantity,
                received_quantity: result.item.received_quantity,
                damaged_quantity: result.item.damaged_quantity,
              }
            : item,
        ),
      );
      const operationalEventId = result.operationalEventId ?? null;
      const shouldAttachPhoto = damaged > 0 && Boolean(photoFile);
      setSuccess({
        sku: activeItem.product.sku,
        total: quantity,
        damaged,
        location: location.code,
        operationalEventId,
        photoStatus:
          damaged === 0
            ? "not-needed"
            : shouldAttachPhoto && operationalEventId
              ? "uploading"
              : "missing",
        photoError:
          damaged > 0 && shouldAttachPhoto && !operationalEventId
            ? es
              ? "La recepción se guardó, pero no se pudo vincular la foto al evento operacional."
              : "The receipt was saved, but the photo could not be linked to its operational event."
            : null,
      });
      setActiveItemId(null);
      setQuantity(0);
      setDamaged(0);
      setNote("");
      setProductMessage(
        es ? "Escaneá el próximo producto." : "Scan the next product.",
      );
      setIdempotencyKey(newIdempotencyKey());

      if (shouldAttachPhoto && operationalEventId && photoFile) {
        try {
          await attachPhoto(operationalEventId, photoFile);
          setSuccess((current) =>
            current ? { ...current, photoStatus: "attached", photoError: null } : current,
          );
          setPhotoFile(null);
        } catch (error) {
          setSuccess((current) =>
            current
              ? {
                  ...current,
                  photoStatus: "failed",
                  photoError:
                    error instanceof Error
                      ? error.message
                      : es
                        ? "La recepción está confirmada, pero la foto no se guardó."
                        : "The receipt is confirmed, but the photo was not saved.",
                }
              : current,
          );
        }
      } else if (damaged === 0) {
        setPhotoFile(null);
      }
      router.refresh();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? `${error.message} ${es ? "No se registró una nueva recepción." : "No new receipt was recorded."}`
          : es
            ? "No se pudo confirmar. Esta recepción NO fue registrada."
            : "Confirmation failed. This receipt has NOT been recorded.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (locations.length === 0) {
    return (
      <section className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm">
        <TriangleAlert className="h-10 w-10 text-amber-600" />
        <h1 className="mt-4 text-2xl font-black text-[#162033]">
          {es ? "Se necesita una ubicación" : "A location is required"}
        </h1>
        <p className="mt-2 leading-6 text-slate-600">
          {es
            ? "Este almacén no tiene ubicaciones activas. Un manager debe configurar al menos una antes de recibir."
            : "This warehouse has no active locations. A manager must configure at least one before receiving."}
        </p>
        <Link href="/floor/receive" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-[#162033] px-5 font-black text-white">
          <ArrowLeft className="mr-2 h-5 w-5" />
          {es ? "Volver" : "Go back"}
        </Link>
      </section>
    );
  }

  return (
    <>
      <Link href="/floor/receive" className="inline-flex min-h-11 items-center gap-2 text-sm font-black text-[#162033]">
        <ArrowLeft className="h-5 w-5" />
        {es ? "Recepciones" : "Receipts"}
      </Link>

      <section className="mt-3 rounded-3xl bg-[#162033] p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#fdba2d]">
              {es ? "Recibiendo" : "Receiving"}
            </p>
            <h1 className="mt-2 text-3xl font-black">{shipment.inboundNumber}</h1>
            <p className="mt-2 font-semibold">{shipment.customer}</p>
            <p className="mt-1 text-sm text-slate-300">
              {shipment.warehouse} · {shipment.warehouseCode}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs font-bold uppercase text-slate-300">{es ? "Recibido" : "Received"}</p>
              <p className="mt-1 text-2xl font-black">{totals.received}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs font-bold uppercase text-slate-300">{es ? "Esperado" : "Expected"}</p>
              <p className="mt-1 text-2xl font-black">{totals.expected}</p>
            </div>
          </div>
        </div>
      </section>

      {success ? (
        <section aria-labelledby="receipt-success-title" className="mt-5 rounded-3xl border-2 border-emerald-300 bg-emerald-50 p-6 text-emerald-950 shadow-sm">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="h-10 w-10 shrink-0 text-emerald-600" />
            <div>
              <p role="status" className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                {es ? "Recepción confirmada" : "Receipt confirmed"}
              </p>
              <h2 id="receipt-success-title" className="mt-1 text-2xl font-black">
                {success.total} {es ? "unidades" : "units"} · {success.sku}
              </h2>
              <p className="mt-2 text-sm font-semibold">
                {success.location} · {success.damaged} {es ? "dañadas" : "damaged"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-white px-3 py-2">✓ {es ? "Servidor confirmado" : "Server confirmed"}</span>
                <span className="rounded-full bg-white px-3 py-2">
                  {success.photoStatus === "attached"
                    ? `✓ ${es ? "Foto adjunta" : "Photo attached"}`
                    : success.photoStatus === "not-needed"
                      ? "✓ Proof of Work"
                      : success.photoStatus === "uploading"
                        ? `… ${es ? "Guardando foto" : "Saving photo"}`
                        : `! ${es ? "Foto pendiente" : "Photo pending"}`}
                </span>
                <span className="rounded-full bg-white px-3 py-2">✓ Revenue Protection</span>
              </div>
              {success.damaged > 0 && ["missing", "failed"].includes(success.photoStatus) ? (
                <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
                  <p className="text-sm font-black">
                    {es
                      ? "La recepción está guardada. Falta la evidencia fotográfica."
                      : "The receipt is saved. Photo evidence is still missing."}
                  </p>
                  {success.photoError ? (
                    <p className="mt-1 text-xs font-semibold leading-5">{success.photoError}</p>
                  ) : null}
                  {success.operationalEventId ? (
                    <>
                      <PhotoEvidenceCapture locale={es ? "es" : "en"} file={photoFile} onChange={setPhotoFile} />
                      <button
                        type="button"
                        disabled={!photoFile}
                        onClick={() => void retryPhotoEvidence()}
                        className="mt-3 min-h-12 w-full rounded-xl bg-amber-600 px-5 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {es ? "ADJUNTAR A ESTA RECEPCIÓN" : "ATTACH TO THIS RECEIPT"}
                      </button>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSuccess(null);
              setPhotoFile(null);
            }}
            className="mt-5 min-h-12 w-full rounded-xl bg-emerald-700 px-5 font-black text-white"
          >
            {es ? "RECIBIR PRÓXIMO PRODUCTO" : "RECEIVE NEXT PRODUCT"}
          </button>
        </section>
      ) : null}

      <div className={success ? "hidden" : "mt-5 grid gap-5 lg:grid-cols-2"}>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 font-black text-amber-800">1</span>
            <div>
              <h2 className="font-black text-[#162033]">{es ? "Escaneá ubicación" : "Scan location"}</h2>
              <p className="text-sm text-slate-500">{es ? "Destino del inventario" : "Inventory destination"}</p>
            </div>
          </div>
          <div className="mt-5">
            <ScanInput
              label={es ? "Código de ubicación" : "Location code"}
              placeholder={es ? "Escaneá o ingresá el código" : "Scan or enter the code"}
              autoFocus={!location}
              state={{
                kind: locationError ? "error" : location ? "success" : "idle",
                message: locationMessage,
              }}
              onScan={scanLocation}
            />
          </div>
          <div className="my-4 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              {es ? "o elegí" : "or choose"}
            </span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <LocationSelect
            id="receiving-location"
            label={es ? "Ubicación del menú" : "Location menu"}
            placeholder={es ? "Elegir una ubicación" : "Choose a location"}
            locations={locations}
            selectedId={location?.id}
            onSelect={(entry) => selectLocation(entry.id)}
          />
        </section>

        <section className={location ? "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" : "rounded-3xl border border-slate-200 bg-slate-100 p-5 opacity-60 sm:p-6"}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 font-black text-amber-800">2</span>
            <div>
              <h2 className="font-black text-[#162033]">{es ? "Escaneá producto" : "Scan product"}</h2>
              <p className="text-sm text-slate-500">SKU · UPC/EAN · ASIN · FNSKU</p>
            </div>
          </div>
          {location ? (
            <div className="mt-5">
              <ScanInput
                label={es ? "Código de producto" : "Product code"}
                placeholder={es ? "Escaneá un producto" : "Scan a product"}
                autoFocus={Boolean(location) && !activeItem}
                state={{
                  kind: productError ? "error" : activeItem ? "success" : "idle",
                  message: productMessage,
                }}
                onScan={scanProduct}
              />
            </div>
          ) : (
            <p className="mt-5 rounded-xl bg-white p-4 text-sm font-semibold text-slate-500">
              {es ? "Primero confirmá una ubicación." : "Confirm a location first."}
            </p>
          )}
        </section>
      </div>

      {activeItem ? (
        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c7511f]">3 · {es ? "Confirmar" : "Confirm"}</p>
              <h2 className="mt-2 text-2xl font-black text-[#162033]">{activeItem.product.title}</h2>
              <p className="mt-1 font-mono text-sm font-bold text-slate-500">SKU {activeItem.product.sku}</p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-right">
              <p className="text-xs font-bold uppercase text-slate-500">{es ? "Restante" : "Remaining"}</p>
              <p className="text-2xl font-black text-[#162033]">{remaining}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <QuantityInput
              id="receive-quantity"
              label={es ? "Total recibido ahora" : "Total received now"}
              value={quantity}
              onChange={setQuantity}
              minimum={0}
              quickValue={remaining}
              quickLabel={es ? "Todo lo restante" : "All remaining"}
            />
            <QuantityInput
              id="damaged-quantity"
              label={es ? "Incluidas dañadas" : "Damaged within total"}
              value={damaged}
              onChange={setDamaged}
              minimum={0}
            />
          </div>

          {quantity > remaining ? (
            <div role="alert" className="mt-5 flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-900">
              <TriangleAlert className="h-5 w-5 shrink-0" />
              {es
                ? `La cantidad supera lo restante por ${quantity - remaining}. FulfillOS registrará un sobrante para revisión.`
                : `Quantity exceeds the remaining amount by ${quantity - remaining}. FulfillOS will record an overage for review.`}
            </div>
          ) : null}

          {damaged > 0 ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
              <label htmlFor="damage-note" className="text-sm font-black text-red-900">
                {es ? "Descripción del daño (requerida)" : "Damage description (required)"}
              </label>
              <textarea
                id="damage-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder={es ? "Ej.: caja aplastada, sello roto…" : "Example: crushed carton, broken seal…"}
                className="mt-2 w-full rounded-xl border border-red-200 bg-white p-3 text-base outline-none focus:border-red-400"
              />
              <PhotoEvidenceCapture locale={es ? "es" : "en"} file={photoFile} onChange={setPhotoFile} />
            </div>
          ) : null}

          {submitError ? (
            <div role="alert" className="mt-5 rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-sm font-bold leading-6 text-red-900">
              <div className="flex gap-3">
                <TriangleAlert className="h-6 w-6 shrink-0" />
                <span>{submitError}</span>
              </div>
              <button type="button" onClick={() => void receive()} className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-red-700 px-5 font-black text-white">
                <RotateCcw className="mr-2 h-5 w-5" />
                {es ? "REINTENTAR" : "RETRY"}
              </button>
            </div>
          ) : null}

          <button
            type="button"
            disabled={submitting || quantity <= 0 || damaged > quantity}
            onClick={() => void receive()}
            className="mt-6 flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-[#f59e0b] px-6 text-lg font-black text-[#162033] shadow-md transition active:bg-[#fdba2d] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              es ? "CONFIRMANDO CON EL SERVIDOR…" : "CONFIRMING WITH SERVER…"
            ) : (
              <>
                <PackageCheck className="h-6 w-6" />
                {es ? `RECIBIR ${quantity} UNIDADES` : `RECEIVE ${quantity} UNITS`}
              </>
            )}
          </button>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
            <ShieldCheck className="h-4 w-4 text-[#067d62]" />
            {es
              ? "Inventario, Proof of Work y facturación permanecen vinculados."
              : "Inventory, Proof of Work, and billing capture stay linked."}
          </div>
        </section>
      ) : null}
    </>
  );
}
