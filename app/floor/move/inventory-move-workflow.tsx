"use client";

import { useState } from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  MapPin,
  PackageSearch,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { QuantityInput } from "@/components/floor/quantity-input";
import { LocationSelect } from "@/components/floor/location-select";
import { ScanInput } from "@/components/floor/scan-input";
import type { Locale } from "@/lib/i18n";

type Warehouse = { id: string; name: string; code: string };
type Location = { id: string; name: string; code: string; barcode: string | null; purpose: string };
type Product = { id: string; sku: string; title: string; customer: string };
type LookupResult = {
  ok?: boolean;
  error?: string;
  location?: Location;
  sourceLocation?: Pick<Location, "id" | "name" | "code">;
  product?: Product;
  available?: number;
};
type MoveResult = {
  ok?: boolean;
  error?: string;
  result?: {
    event_id: string;
    duplicate: boolean;
    quantity: number;
    from_location: string;
    to_location: string;
    balance_after: number;
    billing_status?: string;
  };
};

function newIdempotencyKey() {
  return globalThis.crypto?.randomUUID?.() ?? `move-${Date.now()}-${Math.random()}`;
}

export function InventoryMoveWorkflow({ locale, warehouse, locations }: { locale: Locale; warehouse: Warehouse; locations: Location[] }) {
  const es = locale === "es";
  const [source, setSource] = useState<Location | null>(null);
  const [sourceScan, setSourceScan] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [productScan, setProductScan] = useState("");
  const [available, setAvailable] = useState(0);
  const [destination, setDestination] = useState<Location | null>(null);
  const [destinationScan, setDestinationScan] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [loadingStep, setLoadingStep] = useState<"source" | "product" | "destination" | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [productError, setProductError] = useState<string | null>(null);
  const [destinationError, setDestinationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [success, setSuccess] = useState<{
    product: Product;
    quantity: number;
    from: string;
    to: string;
    balanceAfter: number;
    duplicate: boolean;
  } | null>(null);

  async function lookup(payload: Record<string, string>) {
    const response = await fetch("/api/floor/move/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ warehouseId: warehouse.id, ...payload }),
    });
    const result = (await response.json()) as LookupResult;
    if (!response.ok || !result.ok) {
      throw new Error(result.error ?? (es ? "No se pudo validar el escaneo." : "The scan could not be validated."));
    }
    return result;
  }

  async function scanSource(value: string) {
    setLoadingStep("source");
    setSourceError(null);
    setSubmitError(null);
    setProduct(null);
    setProductScan("");
    setAvailable(0);
    setDestination(null);
    setDestinationScan("");
    setSuccess(null);
    try {
      const result = await lookup({ mode: "location", kind: "source", scan: value });
      if (!result.location) throw new Error(es ? "La ubicación no fue confirmada." : "The location was not confirmed.");
      setSource(result.location);
      setSourceScan(value);
    } catch (error) {
      setSource(null);
      setSourceScan("");
      setSourceError(error instanceof Error ? error.message : es ? "Ubicación no reconocida." : "Location not recognized.");
    } finally {
      setLoadingStep(null);
    }
  }

  function selectSource(locationId: string) {
    const location = locations.find((entry) => entry.id === locationId);
    if (!location) return;
    setSource(location);
    setSourceScan(`menu:${location.code}`);
    setSourceError(null);
    setProduct(null);
    setProductScan("");
    setAvailable(0);
    setDestination(null);
    setDestinationScan("");
    setSubmitError(null);
    setSuccess(null);
  }

  async function scanProduct(value: string) {
    if (!source) return;
    setLoadingStep("product");
    setProductError(null);
    setSubmitError(null);
    setDestination(null);
    setDestinationScan("");
    setSuccess(null);
    try {
      const result = await lookup({ mode: "source-product", sourceLocationId: source.id, productScan: value });
      if (!result.product || !result.available) {
        throw new Error(es ? "No hay unidades disponibles en el origen." : "No units are available at the source.");
      }
      setProduct(result.product);
      setProductScan(value);
      setAvailable(result.available);
      setQuantity(result.available);
    } catch (error) {
      setProduct(null);
      setProductScan("");
      setAvailable(0);
      setProductError(error instanceof Error ? error.message : es ? "Producto no reconocido." : "Product not recognized.");
    } finally {
      setLoadingStep(null);
    }
  }

  async function scanDestination(value: string) {
    if (!source || !product) return;
    setLoadingStep("destination");
    setDestinationError(null);
    setSubmitError(null);
    setSuccess(null);
    try {
      const result = await lookup({
        mode: "location",
        kind: "destination",
        sourceLocationId: source.id,
        scan: value,
      });
      if (!result.location) throw new Error(es ? "El destino no fue confirmado." : "The destination was not confirmed.");
      setDestination(result.location);
      setDestinationScan(value);
    } catch (error) {
      setDestination(null);
      setDestinationScan("");
      setDestinationError(error instanceof Error ? error.message : es ? "Destino no reconocido." : "Destination not recognized.");
    } finally {
      setLoadingStep(null);
    }
  }

  function selectDestination(locationId: string) {
    const location = locations.find((entry) => entry.id === locationId);
    if (!location || location.id === source?.id || location.purpose === "quarantine") return;
    setDestination(location);
    setDestinationScan(`menu:${location.code}`);
    setDestinationError(null);
    setSubmitError(null);
    setSuccess(null);
  }

  async function confirmMove() {
    if (!source || !product || !destination) return;
    if (!navigator.onLine) {
      setSubmitError(
        es
          ? "Conexión perdida. El movimiento NO fue registrado. Reconectate e intentá nuevamente."
          : "Connection lost. The move was NOT recorded. Reconnect and try again.",
      );
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > available) {
      setSubmitError(
        es
          ? `Ingresá una cantidad entre 1 y ${available}.`
          : `Enter a quantity between 1 and ${available}.`,
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/floor/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: warehouse.id,
          sourceScan,
          productScan,
          destinationScan,
          quantity,
          idempotencyKey,
          note: note.trim() || null,
        }),
      });
      const result = (await response.json()) as MoveResult;
      if (!response.ok || !result.ok || !result.result) {
        throw new Error(result.error ?? (es ? "El movimiento no fue confirmado." : "The move was not confirmed."));
      }
      setSuccess({
        product,
        quantity: result.result.quantity,
        from: result.result.from_location,
        to: result.result.to_location,
        balanceAfter: result.result.balance_after,
        duplicate: result.result.duplicate,
      });
      setIdempotencyKey(newIdempotencyKey());
    } catch (error) {
      setSubmitError(
        `${error instanceof Error ? error.message : es ? "No se pudo confirmar." : "Confirmation failed."} ${
          es ? "No se registró un nuevo movimiento." : "No new move was recorded."
        }`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setSource(null);
    setSourceScan("");
    setProduct(null);
    setProductScan("");
    setAvailable(0);
    setDestination(null);
    setDestinationScan("");
    setQuantity(1);
    setNote("");
    setSourceError(null);
    setProductError(null);
    setDestinationError(null);
    setSubmitError(null);
    setSuccess(null);
    setIdempotencyKey(newIdempotencyKey());
  }

  if (success) {
    return (
      <section className="mt-7 rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
        <CheckCircle2 className="h-14 w-14 text-emerald-600" />
        <p className="mt-4 text-sm font-black uppercase tracking-[0.14em] text-emerald-700">
          {success.duplicate
            ? es ? "Movimiento ya confirmado" : "Move already confirmed"
            : es ? "Movimiento confirmado" : "Move confirmed"}
        </p>
        <h2 className="mt-2 text-3xl font-black text-[#162033]">
          {success.quantity} × {success.product.sku}
        </h2>
        <p className="mt-1 text-slate-600">{success.product.title}</p>
        <div className="mt-6 flex items-center gap-3 rounded-2xl bg-slate-100 p-4 font-black text-[#162033]">
          <span>{success.from}</span>
          <ArrowLeftRight className="h-5 w-5 text-[#c7511f]" />
          <span>{success.to}</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
            <ShieldCheck className="mb-2 h-5 w-5" />
            {es ? "Proof of Work: origen, producto y destino guardados" : "Proof of Work: source, product, and destination saved"}
          </div>
          <div className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900">
            <PackageSearch className="mb-2 h-5 w-5" />
            {es ? "Revenue Protection: trabajo capturado sin precio" : "Revenue Protection: unpriced work captured"}
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-600">
          {es ? "Saldo disponible restante en origen" : "Available balance remaining at source"}: {success.balanceAfter}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#162033] px-5 font-black text-white"
        >
          <RotateCcw className="h-5 w-5" />
          {es ? "Mover otro producto" : "Move another product"}
        </button>
      </section>
    );
  }

  return (
    <section className="mt-7 space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <StepLabel number="1" complete={Boolean(source)} label={es ? "Escaneá o elegí el origen" : "Scan or choose the source"} />
        <div className="mt-4">
          <ScanInput
            label={es ? "Origen" : "Source"}
            placeholder={es ? "Código o barcode de ubicación" : "Location code or barcode"}
            autoFocus={!source}
            disabled={loadingStep !== null}
            state={
              source
                ? { kind: "success", message: `${source.code} · ${source.name}` }
                : sourceError
                  ? { kind: "error", message: sourceError }
                  : { kind: "idle", message: loadingStep === "source" ? (es ? "Validando…" : "Validating…") : (es ? "Esperando ubicación de origen." : "Waiting for source location.") }
            }
            onScan={scanSource}
          />
        </div>
        <LocationChoiceDivider es={es} />
        <LocationSelect
          id="move-source-location"
          label={es ? "Ubicación de origen" : "Source location"}
          placeholder={es ? "Elegir ubicación de origen" : "Choose source location"}
          locations={locations}
          selectedId={source?.id}
          disabled={loadingStep !== null}
          onSelect={(entry) => selectSource(entry.id)}
        />
      </div>

      <div className={`rounded-3xl border bg-white p-5 shadow-sm sm:p-6 ${source ? "border-slate-200" : "border-slate-200 opacity-60"}`}>
        <StepLabel number="2" complete={Boolean(product)} label={es ? "Escaneá el producto" : "Scan product"} />
        <div className="mt-4">
          <ScanInput
            label={es ? "Producto" : "Product"}
            placeholder="SKU, UPC, ASIN, FNSKU"
            autoFocus={Boolean(source && !product)}
            disabled={!source || loadingStep !== null}
            state={
              product
                ? { kind: "success", message: `${product.sku} · ${product.title} · ${available} ${es ? "disponibles" : "available"}` }
                : productError
                  ? { kind: "error", message: productError }
                  : { kind: "idle", message: loadingStep === "product" ? (es ? "Buscando stock…" : "Finding stock…") : source ? (es ? "Esperando código de producto." : "Waiting for product code.") : (es ? "Primero escaneá el origen." : "Scan the source first.") }
            }
            onScan={scanProduct}
          />
        </div>
        {product ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4">
            <p className="font-black text-[#162033]">{product.title}</p>
            <p className="mt-1 text-sm text-slate-600">{product.customer} · {product.sku}</p>
          </div>
        ) : null}
      </div>

      <div className={`rounded-3xl border bg-white p-5 shadow-sm sm:p-6 ${product ? "border-slate-200" : "border-slate-200 opacity-60"}`}>
        <StepLabel number="3" complete={Boolean(destination)} label={es ? "Escaneá o elegí el destino" : "Scan or choose the destination"} />
        <div className="mt-4">
          <ScanInput
            label={es ? "Destino" : "Destination"}
            placeholder={es ? "Código o barcode de ubicación" : "Location code or barcode"}
            autoFocus={Boolean(product && !destination)}
            disabled={!product || loadingStep !== null}
            state={
              destination
                ? { kind: "success", message: `${destination.code} · ${destination.name}` }
                : destinationError
                  ? { kind: "error", message: destinationError }
                  : { kind: "idle", message: loadingStep === "destination" ? (es ? "Validando…" : "Validating…") : product ? (es ? "Esperando ubicación de destino." : "Waiting for destination location.") : (es ? "Primero escaneá el producto." : "Scan the product first.") }
            }
            onScan={scanDestination}
          />
        </div>
        <LocationChoiceDivider es={es} />
        <LocationSelect
          id="move-destination-location"
          label={es ? "Ubicación de destino" : "Destination location"}
          placeholder={es ? "Elegir ubicación de destino" : "Choose destination location"}
          locations={locations.filter(
            (entry) => entry.id !== source?.id && entry.purpose !== "quarantine",
          )}
          selectedId={destination?.id}
          disabled={!product || loadingStep !== null}
          onSelect={(entry) => selectDestination(entry.id)}
        />
      </div>

      {destination && product ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <StepLabel number="4" complete={false} label={es ? "Confirmá la cantidad" : "Confirm quantity"} />
          <div className="mt-5">
            <QuantityInput
              id="move-quantity"
              label={es ? "Unidades a mover" : "Units to move"}
              value={quantity}
              minimum={1}
              quickValue={available}
              quickLabel={es ? "Mover todas" : "Move all"}
              onChange={setQuantity}
            />
          </div>
          <label htmlFor="move-note" className="mt-5 block text-sm font-black text-[#162033]">
            {es ? "Nota interna (opcional)" : "Internal note (optional)"}
          </label>
          <textarea
            id="move-note"
            value={note}
            maxLength={500}
            onChange={(event) => setNote(event.target.value)}
            placeholder={es ? "Motivo o contexto del movimiento" : "Reason or context for this move"}
            className="mt-2 min-h-24 w-full rounded-2xl border-2 border-slate-300 bg-white p-4 text-base outline-none focus:border-[#f59e0b]"
          />

          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-950">
            <MapPin className="h-5 w-5 shrink-0" />
            {source?.code} → {destination.code} · {quantity} / {available} {es ? "unidades disponibles" : "available units"}
          </div>
          {submitError ? (
            <div role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-800">
              <TriangleAlert className="h-5 w-5 shrink-0" />
              {submitError}
            </div>
          ) : null}
          <button
            type="button"
            onClick={confirmMove}
            disabled={submitting}
            className="mt-5 flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-[#f59e0b] px-5 text-lg font-black text-[#162033] shadow-sm disabled:cursor-wait disabled:opacity-60"
          >
            <ArrowLeftRight className="h-6 w-6" />
            {submitting ? (es ? "Confirmando…" : "Confirming…") : (es ? "Confirmar movimiento" : "Confirm move")}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function StepLabel({ number, complete, label }: { number: string; complete: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={complete ? "flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-black text-white" : "flex h-9 w-9 items-center justify-center rounded-full bg-[#162033] text-sm font-black text-white"}>
        {complete ? <CheckCircle2 className="h-5 w-5" /> : number}
      </span>
      <h2 className="text-lg font-black text-[#162033]">{label}</h2>
    </div>
  );
}

function LocationChoiceDivider({ es }: { es: boolean }) {
  return (
    <div className="my-4 flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-slate-200" />
      <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
        {es ? "o elegí" : "or choose"}
      </span>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}
