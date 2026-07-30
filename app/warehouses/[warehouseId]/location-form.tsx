"use client";

import { useState } from "react";

type LocationFormProps = {
  warehouseId: string;
};

export function LocationForm({
  warehouseId,
}: LocationFormProps) {
  const [submitting, setSubmitting] =
    useState(false);

  return (
    <form
      action={`/api/warehouses/${warehouseId}/locations`}
      method="post"
      onSubmit={() => setSubmitting(true)}
      className="space-y-6"
    >
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-bold text-[#162033]"
        >
          Area name
        </label>

        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={1}
          maxLength={120}
          placeholder="Example: Main Receiving Area"
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#111827] outline-none transition focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
        />

        <p className="mt-2 text-sm text-slate-500">
          Use a name employees can recognize quickly.
        </p>
      </div>

      <div>
        <label
          htmlFor="purpose"
          className="block text-sm font-bold text-[#162033]"
        >
          What happens here?
        </label>

        <select
          id="purpose"
          name="purpose"
          defaultValue="storage"
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#162033] outline-none focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
        >
          <option value="receiving">
            Receiving — incoming shipments
          </option>

          <option value="storage">
            Storage — inventory storage
          </option>

          <option value="prep">
            Prep — labeling and preparation
          </option>

          <option value="packing">
            Packing — packing orders
          </option>

          <option value="outbound">
            Outbound — ready to ship
          </option>

          <option value="returns">
            Returns — returned products
          </option>

          <option value="quarantine">
            Quarantine — damaged or pending review
          </option>

          <option value="general">
            General purpose
          </option>
        </select>
      </div>

      <div>
        <label
          htmlFor="locationKind"
          className="block text-sm font-bold text-[#162033]"
        >
          Location type
        </label>

        <select
          id="locationKind"
          name="locationKind"
          defaultValue="zone"
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#162033] outline-none focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
        >
          <option value="zone">
            Zone or area
          </option>

          <option value="room">
            Room
          </option>

          <option value="dock">
            Loading dock
          </option>

          <option value="workstation">
            Workstation
          </option>

          <option value="aisle">
            Aisle
          </option>

          <option value="rack">
            Rack
          </option>

          <option value="shelf">
            Shelf
          </option>

          <option value="bin">
            Bin
          </option>

          <option value="other">
            Other
          </option>
        </select>
      </div>

      <details className="rounded-2xl border border-slate-200 bg-slate-50">
        <summary className="cursor-pointer select-none px-5 py-4 font-bold text-[#162033]">
          Additional details
          <span className="ml-2 text-sm font-normal text-slate-500">
            Optional
          </span>
        </summary>

        <div className="space-y-5 border-t border-slate-200 px-5 py-5">
          <div>
            <label
              htmlFor="code"
              className="block text-sm font-bold text-[#162033]"
            >
              Location code
            </label>

            <input
              id="code"
              name="code"
              type="text"
              maxLength={40}
              placeholder="REC-01"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
            />

            <p className="mt-2 text-sm text-slate-500">
              Leave blank and FulfillOS will generate one.
            </p>
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-bold text-[#162033]"
            >
              Notes
            </label>

            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={500}
              placeholder="Example: Use this area for pallet deliveries."
              className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
            />
          </div>
        </div>
      </details>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center rounded-xl bg-[#f59e0b] px-6 py-3 font-bold text-[#162033] transition hover:bg-[#fdba2d] disabled:cursor-wait disabled:opacity-70"
      >
        {submitting
          ? "Adding area..."
          : "Add area"}
      </button>
    </form>
  );
}