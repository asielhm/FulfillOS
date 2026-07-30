"use client";

import Link from "next/link";
import { useState } from "react";

export function WarehouseForm() {
  const [submitting, setSubmitting] =
    useState(false);

  return (
    <form
      action="/api/warehouses"
      method="post"
      onSubmit={() => setSubmitting(true)}
      className="space-y-7"
    >
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-bold text-[#162033]"
        >
          Warehouse name
        </label>

        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={120}
          autoFocus
          autoComplete="organization"
          placeholder="Atlanta Warehouse"
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#111827] outline-none transition focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
        />

        <p className="mt-2 text-sm text-slate-500">
          Use a name your employees will recognize
          immediately.
        </p>
      </div>

      <details className="rounded-2xl border border-slate-200 bg-slate-50">
        <summary className="cursor-pointer select-none px-5 py-4 font-bold text-[#162033]">
          Add address and operational details
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
              Warehouse code
            </label>

            <input
              id="code"
              name="code"
              type="text"
              maxLength={30}
              placeholder="ATL-01"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
            />

            <p className="mt-2 text-sm text-slate-500">
              Leave blank and FulfillOS will create one
              automatically.
            </p>
          </div>

          <div>
            <label
              htmlFor="addressLine1"
              className="block text-sm font-bold text-[#162033]"
            >
              Street address
            </label>

            <input
              id="addressLine1"
              name="addressLine1"
              type="text"
              autoComplete="address-line1"
              placeholder="123 Logistics Avenue"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
            />
          </div>

          <div>
            <label
              htmlFor="addressLine2"
              className="block text-sm font-bold text-[#162033]"
            >
              Suite, unit or building
            </label>

            <input
              id="addressLine2"
              name="addressLine2"
              type="text"
              autoComplete="address-line2"
              placeholder="Suite 200"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="city"
                className="block text-sm font-bold text-[#162033]"
              >
                City
              </label>

              <input
                id="city"
                name="city"
                type="text"
                autoComplete="address-level2"
                placeholder="Atlanta"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
              />
            </div>

            <div>
              <label
                htmlFor="stateRegion"
                className="block text-sm font-bold text-[#162033]"
              >
                State or region
              </label>

              <input
                id="stateRegion"
                name="stateRegion"
                type="text"
                autoComplete="address-level1"
                placeholder="Georgia"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="postalCode"
                className="block text-sm font-bold text-[#162033]"
              >
                ZIP or postal code
              </label>

              <input
                id="postalCode"
                name="postalCode"
                type="text"
                autoComplete="postal-code"
                placeholder="30301"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
              />
            </div>

            <div>
              <label
                htmlFor="countryCode"
                className="block text-sm font-bold text-[#162033]"
              >
                Country
              </label>

              <select
                id="countryCode"
                name="countryCode"
                defaultValue="US"
                autoComplete="country"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
              >
                <option value="US">
                  United States
                </option>
                <option value="CA">
                  Canada
                </option>
                <option value="MX">
                  Mexico
                </option>
                <option value="AR">
                  Argentina
                </option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="timezone"
              className="block text-sm font-bold text-[#162033]"
            >
              Time zone
            </label>

            <select
              id="timezone"
              name="timezone"
              defaultValue="America/New_York"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
            >
              <option value="America/New_York">
                Eastern Time
              </option>

              <option value="America/Chicago">
                Central Time
              </option>

              <option value="America/Denver">
                Mountain Time
              </option>

              <option value="America/Los_Angeles">
                Pacific Time
              </option>

              <option value="America/Anchorage">
                Alaska Time
              </option>

              <option value="Pacific/Honolulu">
                Hawaii Time
              </option>
            </select>
          </div>
        </div>
      </details>

      <div
        aria-live="polite"
        className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end"
      >
        <Link
          href="/warehouses"
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
            ? "Creating warehouse..."
            : "Create warehouse"}
        </button>
      </div>
    </form>
  );
}