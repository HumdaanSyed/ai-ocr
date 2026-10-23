"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { OcrResult } from "@/lib/schema";

type Tab = "fields" | "items" | "raw" | "json";

function confidenceColor(c: number) {
  return c >= 0.9 ? "bg-emerald-500" : c >= 0.7 ? "bg-amber-500" : "bg-rose-500";
}

const money = (n: number | null) => (n == null ? "—" : n.toFixed(2));

export function ResultsTabs({ result, onFieldChange }: { result: OcrResult; onFieldChange: (i: number, v: string) => void }) {
  const [tab, setTab] = useState<Tab>("fields");
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(result, null, 2);
  const tabs: [Tab, string][] = [
    ["fields", `Fields (${result.fields.length})`],
    ["items", `Line items (${result.lineItems.length})`],
    ["raw", "Raw text"],
    ["json", "JSON"],
  ];

  return (
    <div>
      <div role="tablist" className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              tab === id ? "bg-white shadow-sm dark:bg-slate-950" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "fields" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="pb-2 pr-3 font-medium">Field</th>
                <th className="pb-2 pr-3 font-medium">Value</th>
                <th className="pb-2 font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {result.fields.map((f, i) => (
                <tr key={`${f.key}-${i}`} className="animate-[fade-in_0.3s_ease-out_both]" style={{ animationDelay: `${i * 40}ms` }}>
                  <td className="py-2 pr-3 align-middle">
                    <div className="font-medium">{f.label}</div>
                    <div className="text-xs text-slate-400">{f.type}</div>
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      aria-label={f.label}
                      value={f.value}
                      onChange={(e) => onFieldChange(i, e.target.value)}
                      className="w-full min-w-40 rounded-md border border-transparent bg-transparent px-2 py-1 hover:border-slate-200 focus:border-indigo-500 focus:outline-none dark:hover:border-slate-700"
                    />
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className={`h-full ${confidenceColor(f.confidence)}`} style={{ width: `${f.confidence * 100}%` }} />
                      </div>
                      <span className="w-9 text-xs tabular-nums text-slate-500">{Math.round(f.confidence * 100)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!result.fields.length && <p className="py-6 text-center text-sm text-slate-500">No fields found.</p>}
        </div>
      )}

      {tab === "items" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="pb-2 pr-3 font-medium">Description</th>
                <th className="pb-2 pr-3 text-right font-medium">Qty</th>
                <th className="pb-2 pr-3 text-right font-medium">Unit price</th>
                <th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums dark:divide-slate-800">
              {result.lineItems.map((li, i) => (
                <tr key={i}>
                  <td className="py-2 pr-3">{li.description}</td>
                  <td className="py-2 pr-3 text-right">{li.quantity ?? "—"}</td>
                  <td className="py-2 pr-3 text-right">{money(li.unitPrice)}</td>
                  <td className="py-2 text-right">{money(li.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="tabular-nums">
              {(
                [
                  ["Subtotal", result.totals.subtotal],
                  ["Tax", result.totals.tax],
                  ["Total", result.totals.total],
                ] as const
              )
                .filter(([, v]) => v != null)
                .map(([label, v]) => (
                  <tr key={label} className={label === "Total" ? "font-semibold" : "text-slate-500"}>
                    <td colSpan={3} className="pt-2 pr-3 text-right">
                      {label}
                    </td>
                    <td className="pt-2 text-right">
                      {money(v)} {label === "Total" && result.totals.currency}
                    </td>
                  </tr>
                ))}
            </tfoot>
          </table>
          {!result.lineItems.length && <p className="py-6 text-center text-sm text-slate-500">No line items on this document.</p>}
        </div>
      )}

      {tab === "raw" && (
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 font-mono text-sm dark:bg-slate-950">
          {result.rawText || "No text found."}
        </pre>
      )}

      {tab === "json" && (
        <div className="relative">
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(json);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-xs text-white hover:bg-slate-700"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <pre className="max-h-96 overflow-auto rounded-xl bg-slate-950 p-4 font-mono text-xs text-emerald-300">{json}</pre>
        </div>
      )}
    </div>
  );
}
