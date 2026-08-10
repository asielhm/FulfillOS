"use client";

import Link from "next/link";
import { useState } from "react";

type CustomerOption = {
  id: string;
  companyName: string;
  referenceCode: string;
};

type ProductFormProps = {
  customers: CustomerOption[];
  defaultCustomerId?: string;
};

export function ProductForm({
  customers,
  defaultCustomerId,
}: ProductFormProps) {
  const [submitting, setSubmitting] =
    useState(false);

  return (
    <form
      action="/api/products"
      method="post"
      onSubmit={() => setSubmitting(true)}
      className="space-y-7"
    >
      <div>
        <label
          htmlFor="customerId"
          className="block text-sm font-bold text-[#162033]"
        >
          Customer
          <span className="ml-1 text-[#c7511f]">
            *
          </span>
        </label>

        <select
          id="customerId"
          name="customerId"
          required
          defaultValue={
            defaultCustomerId ?? ""
          }
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#162033] outline-none transition focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
        >
          <option value="" disabled>
            Select a customer
          </option>

          {customers.map((customer) => (
            <option
              key={customer.id}
              value={customer.id}
            >
              {customer.companyName}
            </option>
          ))}
        </select>

        <p className="mt-2 text-sm text-slate-500">
          This product will belong to this
          customer&apos;s catalog.
        </p>
      </div>

      <div>
        <label
          htmlFor="title"
          className="block text-sm font-bold text-[#162033]"
        >
          Product name
          <span className="ml-1 text-[#c7511f]">
            *
          </span>
        </label>

        <input
          id="title"
          name="title"
          type="text"
          required
          minLength={2}
          maxLength={250}
          autoFocus
          placeholder="Example: Stainless Steel Water Bottle"
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#111827] outline-none transition focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
        />
      </div>

      <div>
        <label
          htmlFor="sku"
          className="block text-sm font-bold text-[#162033]"
        >
          SKU
          <span className="ml-1 text-[#c7511f]">
            *
          </span>
        </label>

        <input
          id="sku"
          name="sku"
          type="text"
          required
          minLength={1}
          maxLength={80}
          placeholder="Example: BOTTLE-BLK-32"
          spellCheck={false}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-[#111827] outline-none transition focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
        />

        <p className="mt-2 text-sm text-slate-500">
          Use the SKU your customer already uses
          whenever possible.
        </p>
      </div>

      <details className="rounded-2xl border border-slate-200 bg-slate-50">
        <summary className="cursor-pointer select-none px-5 py-4 font-bold text-[#162033]">
          Amazon and barcode identifiers
          <span className="ml-2 text-sm font-normal text-slate-500">
            Optional
          </span>
        </summary>

        <div className="space-y-5 border-t border-slate-200 px-5 py-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="asin"
                className="block text-sm font-bold text-[#162033]"
              >
                ASIN
              </label>

              <input
                id="asin"
                name="asin"
                type="text"
                maxLength={30}
                placeholder="B0ABC12345"
                spellCheck={false}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono uppercase outline-none focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
              />
            </div>

            <div>
              <label
                htmlFor="fnsku"
                className="block text-sm font-bold text-[#162033]"
              >
                FNSKU
              </label>

              <input
                id="fnsku"
                name="fnsku"
                type="text"
                maxLength={50}
                placeholder="X001ABC123"
                spellCheck={false}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono uppercase outline-none focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="barcode"
              className="block text-sm font-bold text-[#162033]"
            >
              UPC / EAN / Barcode
            </label>

            <input
              id="barcode"
              name="barcode"
              type="text"
              maxLength={100}
              inputMode="numeric"
              placeholder="850012345678"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono outline-none focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
            />
          </div>

          <div>
            <label
              htmlFor="condition"
              className="block text-sm font-bold text-[#162033]"
            >
              Condition
            </label>

            <select
              id="condition"
              name="condition"
              defaultValue="new"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
            >
              <option value="new">
                New
              </option>

              <option value="used_like_new">
                Used — Like New
              </option>

              <option value="used_very_good">
                Used — Very Good
              </option>

              <option value="used_good">
                Used — Good
              </option>

              <option value="used_acceptable">
                Used — Acceptable
              </option>

              <option value="refurbished">
                Refurbished
              </option>

              <option value="other">
                Other
              </option>
            </select>
          </div>
        </div>
      </details>

      <details className="rounded-2xl border border-slate-200 bg-slate-50">
        <summary className="cursor-pointer select-none px-5 py-4 font-bold text-[#162033]">
          Dimensions and weight
          <span className="ml-2 text-sm font-normal text-slate-500">
            Optional
          </span>
        </summary>

        <div className="border-t border-slate-200 px-5 py-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField
              id="lengthIn"
              label="Length"
              unit="in"
            />

            <NumberField
              id="widthIn"
              label="Width"
              unit="in"
            />

            <NumberField
              id="heightIn"
              label="Height"
              unit="in"
            />

            <NumberField
              id="weightLb"
              label="Weight"
              unit="lb"
            />
          </div>
        </div>
      </details>

      <details className="rounded-2xl border border-slate-200 bg-slate-50">
        <summary className="cursor-pointer select-none px-5 py-4 font-bold text-[#162033]">
          Prep instructions
          <span className="ml-2 text-sm font-normal text-slate-500">
            Optional
          </span>
        </summary>

        <div className="border-t border-slate-200 px-5 py-5">
          <label
            htmlFor="prepNotes"
            className="block text-sm font-bold text-[#162033]"
          >
            Instructions for your team
          </label>

          <textarea
            id="prepNotes"
            name="prepNotes"
            rows={5}
            maxLength={3000}
            placeholder="Example: Apply FNSKU label over the manufacturer's barcode and place the item in a clear polybag."
            className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
          />

          <p className="mt-2 text-sm text-slate-500">
            These instructions will later appear on
            prep work orders.
          </p>
        </div>
      </details>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
        <Link
          href="/products"
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-[#162033] transition hover:bg-slate-50"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-w-48 items-center justify-center rounded-xl bg-[#f59e0b] px-6 py-3 font-bold text-[#162033] transition hover:bg-[#fdba2d] disabled:cursor-wait disabled:opacity-70"
        >
          {submitting
            ? "Creating product..."
            : "Create product"}
        </button>
      </div>
    </form>
  );
}

function NumberField({
  id,
  label,
  unit,
}: {
  id: string;
  label: string;
  unit: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-bold text-[#162033]"
      >
        {label}
      </label>

      <div className="relative mt-2">
        <input
          id={id}
          name={id}
          type="number"
          min="0"
          step="0.001"
          inputMode="decimal"
          placeholder="0.000"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 outline-none focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
        />

        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-bold text-slate-400">
          {unit}
        </span>
      </div>
    </div>
  );
}