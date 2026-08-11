"use client";

import Link from "next/link";
import {
  useMemo,
  useRef,
  useState,
} from "react";

type CustomerOption = {
  id: string;
  companyName: string;
};

type WarehouseOption = {
  id: string;
  name: string;
  code: string;
};

type ProductOption = {
  id: string;
  customerId: string;
  title: string;
  sku: string;
};

type InboundFormProps = {
  customers: CustomerOption[];
  warehouses: WarehouseOption[];
  products: ProductOption[];
};

type ProductLine = {
  key: number;
  productId: string;
  quantity: string;
};

export function InboundForm({
  customers,
  warehouses,
  products,
}: InboundFormProps) {
  const [customerId, setCustomerId] =
    useState(
      customers.length === 1
        ? customers[0].id
        : "",
    );

  const [warehouseId, setWarehouseId] =
    useState(
      warehouses.length === 1
        ? warehouses[0].id
        : "",
    );

  const [lines, setLines] = useState<
    ProductLine[]
  >([
    {
      key: 1,
      productId: "",
      quantity: "",
    },
  ]);

  const [submitting, setSubmitting] =
    useState(false);

  const nextKey = useRef(2);

  const customerProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.customerId === customerId,
      ),
    [products, customerId],
  );

  const validItems = lines
    .filter(
      (line) =>
        line.productId &&
        Number(line.quantity) > 0,
    )
    .map((line) => ({
      product_id: line.productId,
      expected_quantity: Number(
        line.quantity,
      ),
    }));

  const duplicateProducts =
    new Set(
      validItems.map(
        (item) => item.product_id,
      ),
    ).size !== validItems.length;

  const totalUnits = validItems.reduce(
    (sum, item) =>
      sum + item.expected_quantity,
    0,
  );

  const canSubmit =
    customerId &&
    warehouseId &&
    validItems.length > 0 &&
    !duplicateProducts;

  function changeCustomer(
    newCustomerId: string,
  ) {
    setCustomerId(newCustomerId);

    setLines([
      {
        key: nextKey.current++,
        productId: "",
        quantity: "",
      },
    ]);
  }

  function addLine() {
    setLines((current) => [
      ...current,
      {
        key: nextKey.current++,
        productId: "",
        quantity: "",
      },
    ]);
  }

  function removeLine(key: number) {
    setLines((current) => {
      const remaining =
        current.filter(
          (line) => line.key !== key,
        );

      return remaining.length > 0
        ? remaining
        : [
            {
              key: nextKey.current++,
              productId: "",
              quantity: "",
            },
          ];
    });
  }

  function updateLine(
    key: number,
    field:
      | "productId"
      | "quantity",
    value: string,
  ) {
    setLines((current) =>
      current.map((line) =>
        line.key === key
          ? {
              ...line,
              [field]: value,
            }
          : line,
      ),
    );
  }

  return (
    <form
      action="/api/inbound"
      method="post"
      onSubmit={() =>
        setSubmitting(true)
      }
      className="space-y-8"
    >
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          validItems,
        )}
      />

      <div className="grid gap-5 md:grid-cols-2">
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
            value={customerId}
            onChange={(event) =>
              changeCustomer(
                event.target.value,
              )
            }
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
          >
            <option value="">
              Select customer
            </option>

            {customers.map(
              (customer) => (
                <option
                  key={customer.id}
                  value={customer.id}
                >
                  {
                    customer.companyName
                  }
                </option>
              ),
            )}
          </select>
        </div>

        <div>
          <label
            htmlFor="warehouseId"
            className="block text-sm font-bold text-[#162033]"
          >
            Destination warehouse
            <span className="ml-1 text-[#c7511f]">
              *
            </span>
          </label>

          <select
            id="warehouseId"
            name="warehouseId"
            required
            value={warehouseId}
            onChange={(event) =>
              setWarehouseId(
                event.target.value,
              )
            }
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15"
          >
            <option value="">
              Select warehouse
            </option>

            {warehouses.map(
              (warehouse) => (
                <option
                  key={warehouse.id}
                  value={warehouse.id}
                >
                  {warehouse.name} ·{" "}
                  {warehouse.code}
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="expectedDate"
          className="block text-sm font-bold text-[#162033]"
        >
          Expected arrival
        </label>

        <input
          id="expectedDate"
          name="expectedDate"
          type="date"
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/15 sm:max-w-xs"
        />
      </div>

      <section className="rounded-2xl border border-slate-200">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-extrabold text-[#162033]">
              Products expected
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Add each SKU and the
              quantity you expect to
              receive.
            </p>
          </div>

          {validItems.length >
            0 && (
            <div className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#162033] shadow-sm">
              {totalUnits}{" "}
              {totalUnits === 1
                ? "unit"
                : "units"}{" "}
              expected
            </div>
          )}
        </div>

        <div className="space-y-4 p-5">
          {!customerId ? (
            <div className="rounded-xl bg-amber-50 px-5 py-6 text-center text-sm font-medium text-amber-800">
              Select a customer to see
              their products.
            </div>
          ) : customerProducts.length ===
            0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
              <p className="font-bold text-[#162033]">
                This customer has no
                active products.
              </p>

              <Link
                href={`/products/new?customerId=${customerId}`}
                className="mt-4 inline-flex rounded-xl bg-[#f59e0b] px-5 py-3 text-sm font-bold text-[#162033]"
              >
                Add product
              </Link>
            </div>
          ) : (
            <>
              {lines.map(
                (line, index) => (
                  <div
                    key={line.key}
                    className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-[1fr_160px_auto]"
                  >
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Product{" "}
                        {index + 1}
                      </label>

                      <select
                        value={
                          line.productId
                        }
                        onChange={(
                          event,
                        ) =>
                          updateLine(
                            line.key,
                            "productId",
                            event.target
                              .value,
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#f59e0b]"
                      >
                        <option value="">
                          Select SKU
                        </option>

                        {customerProducts.map(
                          (product) => (
                            <option
                              key={
                                product.id
                              }
                              value={
                                product.id
                              }
                            >
                              {
                                product.sku
                              }{" "}
                              —{" "}
                              {
                                product.title
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Quantity
                      </label>

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={
                          line.quantity
                        }
                        onChange={(
                          event,
                        ) =>
                          updateLine(
                            line.key,
                            "quantity",
                            event.target
                              .value,
                          )
                        }
                        placeholder="0"
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#f59e0b]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeLine(
                          line.key,
                        )
                      }
                      className="self-end rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ),
              )}

              <button
                type="button"
                onClick={addLine}
                className="rounded-xl border border-dashed border-slate-300 px-5 py-3 text-sm font-bold text-[#162033] transition hover:border-[#f59e0b] hover:bg-amber-50"
              >
                + Add another product
              </button>

              {duplicateProducts && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
                >
                  The same product cannot
                  appear twice. Combine the
                  quantities into one line.
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <details className="rounded-2xl border border-slate-200 bg-slate-50">
        <summary className="cursor-pointer px-5 py-4 font-bold text-[#162033]">
          Shipping information
          <span className="ml-2 text-sm font-normal text-slate-500">
            Optional
          </span>
        </summary>

        <div className="space-y-5 border-t border-slate-200 px-5 py-5">
          <div>
            <label className="block text-sm font-bold text-[#162033]">
              Customer reference
            </label>

            <input
              name="customerReference"
              type="text"
              maxLength={150}
              placeholder="PO, shipment name or customer reference"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#f59e0b]"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-bold text-[#162033]">
                Carrier
              </label>

              <input
                name="carrier"
                type="text"
                maxLength={100}
                placeholder="UPS, FedEx, LTL..."
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#f59e0b]"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[#162033]">
                Tracking number
              </label>

              <input
                name="trackingNumber"
                type="text"
                maxLength={200}
                placeholder="Tracking or PRO number"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#f59e0b]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#162033]">
              Internal notes
            </label>

            <textarea
              name="notes"
              rows={4}
              maxLength={3000}
              placeholder="Anything the receiving team should know..."
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#f59e0b]"
            />
          </div>
        </div>
      </details>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
        <Link
          href="/inbound"
          className="inline-flex justify-center rounded-xl border border-slate-300 px-5 py-3 font-bold text-[#162033]"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={
            !canSubmit ||
            submitting
          }
          className="inline-flex min-w-52 justify-center rounded-xl bg-[#f59e0b] px-6 py-3 font-bold text-[#162033] transition hover:bg-[#fdba2d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? "Creating inbound..."
            : "Create inbound shipment"}
        </button>
      </div>
    </form>
  );
}