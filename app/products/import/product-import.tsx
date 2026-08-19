"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Customer = { id: string; name: string; code: string };
type Field = "ignore" | "sku" | "title" | "asin" | "fnsku" | "barcode" | "condition" | "length_in" | "width_in" | "height_in" | "weight_lb" | "prep_notes";
const fields: Array<{ value: Field; label: string; aliases: string[] }> = [
  { value: "ignore", label: "Do not import", aliases: [] },
  { value: "sku", label: "SKU (required)", aliases: ["sku", "seller sku", "merchant sku"] },
  { value: "title", label: "Product name (required)", aliases: ["title", "product", "product name", "name", "description"] },
  { value: "asin", label: "Amazon ASIN", aliases: ["asin"] },
  { value: "fnsku", label: "Amazon FNSKU", aliases: ["fnsku", "fba sku"] },
  { value: "barcode", label: "UPC / EAN / GTIN / Barcode", aliases: ["upc", "ean", "gtin", "barcode", "upc/ean"] },
  { value: "condition", label: "Condition", aliases: ["condition"] },
  { value: "length_in", label: "Length (in)", aliases: ["length", "length in", "length (in)"] },
  { value: "width_in", label: "Width (in)", aliases: ["width", "width in", "width (in)"] },
  { value: "height_in", label: "Height (in)", aliases: ["height", "height in", "height (in)"] },
  { value: "weight_lb", label: "Weight (lb)", aliases: ["weight", "weight lb", "weight (lb)"] },
  { value: "prep_notes", label: "Prep instructions", aliases: ["prep", "prep notes", "prep instructions", "notes"] },
];

export function ProductImport({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(customers.length === 1 ? customers[0].id : "");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Field[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requiredReady = mapping.includes("sku") && mapping.includes("title") && new Set(mapping.filter((field) => field !== "ignore")).size === mapping.filter((field) => field !== "ignore").length;
  const preview = rows.slice(0, 5);

  async function readFile(file: File) {
    setError(null);
    if (file.size > 5_000_000) return setError("The file is larger than 5 MB.");
    const text = await file.text();
    const delimiter = file.name.toLowerCase().endsWith(".tsv") ? "\t" : detectDelimiter(text);
    const parsed = parseDelimited(text, delimiter).filter((row) => row.some((cell) => cell.trim()));
    if (parsed.length < 2) return setError("The file needs a header row and at least one product row.");
    if (parsed.length > 501) return setError("Import up to 500 products at a time.");
    const nextHeaders = parsed[0].map((header, index) => header.trim() || `Column ${index + 1}`);
    setHeaders(nextHeaders);
    setRows(parsed.slice(1));
    setMapping(nextHeaders.map(suggestField));
    setFileName(file.name);
  }

  async function importProducts() {
    if (!customerId) return setError("Select the customer that owns these products.");
    if (!requiredReady) return setError("Map one SKU column and one Product name column. Each field can only be used once.");
    setLoading(true);
    setError(null);
    const products = rows.map((row) => Object.fromEntries(mapping.flatMap((field, index) => field === "ignore" ? [] : [[field, row[index]?.trim() ?? ""]])));
    const response = await fetch("/api/products/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId, products }) });
    const result = await response.json().catch(() => ({ error: "Import response could not be read." }));
    if (!response.ok) { setError(result.error ?? "Products could not be imported."); setLoading(false); return; }
    router.push(`/products?imported=${result.created}`);
    router.refresh();
  }

  return (
    <div className="p-6 sm:p-9">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="block"><span className="text-sm font-bold text-[#162033]">Customer *</span><select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4"><option value="">Select a customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.code}</option>)}</select></label>
        <label className="block"><span className="text-sm font-bold text-[#162033]">CSV or TSV file *</span><input type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" onChange={(event) => event.target.files?.[0] && void readFile(event.target.files[0])} className="mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-amber-100 file:px-3 file:py-2 file:font-bold file:text-[#162033]" /></label>
      </div>

      <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900"><strong>Common US prep-center fields:</strong> SKU, product name, ASIN, FNSKU, UPC/EAN/GTIN, condition, dimensions in inches, weight in pounds and prep instructions. In Excel choose <em>Save As → CSV UTF-8</em>.</div>
      {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {headers.length > 0 && <>
        <div className="mt-8 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-[#c7511f]">Map columns</p><h2 className="mt-1 text-2xl font-black text-[#162033]">{fileName} · {rows.length} products</h2></div><p className={requiredReady ? "text-sm font-bold text-emerald-700" : "text-sm font-bold text-amber-700"}>{requiredReady ? "Required fields ready" : "Map SKU and Product name"}</p></div>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-full divide-y divide-slate-200 text-left text-sm"><thead className="bg-slate-50"><tr>{headers.map((header, index) => <th key={`${header}-${index}`} className="min-w-48 p-3"><span className="block truncate font-bold text-[#162033]">{header}</span><select aria-label={`Map ${header}`} value={mapping[index]} onChange={(event) => setMapping((current) => current.map((value, position) => position === index ? event.target.value as Field : value))} className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2">{fields.map((field) => <option key={field.value} value={field.value}>{field.label}</option>)}</select></th>)}</tr></thead><tbody className="divide-y divide-slate-100">{preview.map((row, rowIndex) => <tr key={rowIndex}>{headers.map((_, columnIndex) => <td key={columnIndex} className="max-w-64 truncate p-3 text-slate-600">{row[columnIndex] || "—"}</td>)}</tr>)}</tbody></table></div>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Link href="/products" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-5 font-bold text-[#162033]">Cancel</Link><button type="button" onClick={() => void importProducts()} disabled={loading || !requiredReady} className="min-h-12 rounded-xl bg-[#f59e0b] px-6 font-bold text-[#162033] disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Importing..." : `Import ${rows.length} products`}</button></div>
      </>}
    </div>
  );
}

function suggestField(header: string): Field { const normalized = header.toLowerCase().trim().replace(/[_-]+/g, " "); return fields.find((field) => field.aliases.includes(normalized))?.value ?? "ignore"; }
function detectDelimiter(text: string) { const line = text.split(/\r?\n/, 1)[0] ?? ""; return line.split("\t").length > line.split(",").length ? "\t" : ","; }
function parseDelimited(text: string, delimiter: string) {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let index = 0; index < text.length; index++) { const char = text[index]; const next = text[index + 1]; if (char === '"' && quoted && next === '"') { cell += '"'; index++; } else if (char === '"') quoted = !quoted; else if (char === delimiter && !quoted) { row.push(cell); cell = ""; } else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && next === "\n") index++; row.push(cell); rows.push(row); row = []; cell = ""; } else cell += char; }
  if (cell.length || row.length) { row.push(cell); rows.push(row); } return rows;
}
