"use client";

import { Download, FileText, RotateCcw, ScanText, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { ChecksPanel } from "@/components/ChecksPanel";
import { PipelineSteps, STEPS, type StepState } from "@/components/PipelineSteps";
import { ResultsTabs } from "@/components/ResultsTabs";
import { StatsBar } from "@/components/StatsBar";
import { Uploader } from "@/components/Uploader";
import { runChecks } from "@/lib/checks";
import { ACCEPTED_TYPES, type OcrEvent, type Stats, type StepId } from "@/lib/events";
import { optimizeImage } from "@/lib/image";
import type { OcrResult } from "@/lib/schema";

const MAX_UPLOAD = 20 * 1024 * 1024;
const idle = () => Object.fromEntries(STEPS.map((s) => [s.id, { status: "pending" }])) as Record<StepId, StepState>;
const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;

type Preview = { url: string; name: string; width: number; height: number };

export default function Home() {
  const [steps, setSteps] = useState(idle);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const checks = useMemo(() => (result ? runChecks(result) : []), [result]);

  const setStep = (id: StepId, s: StepState) => setSteps((prev) => ({ ...prev, [id]: s }));

  async function process(file: File) {
    setBusy(true);
    setSteps(idle());
    setResult(null);
    setStats(null);
    setError(null);
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    let current: StepId = "upload";

    try {
      let t = performance.now();
      setStep("upload", { status: "running" });
      if (!ACCEPTED_TYPES.includes(file.type)) throw new Error(`${file.type || "This file"} is not supported. Use JPEG, PNG or WebP.`);
      if (file.size > MAX_UPLOAD) throw new Error("Image is larger than 20 MB.");
      setStep("upload", {
        status: "done",
        ms: Math.round(performance.now() - t),
        detail: `${file.type.split("/")[1].toUpperCase()}, ${kb(file.size)}`,
      });

      current = "optimize";
      t = performance.now();
      setStep("optimize", { status: "running" });
      const img = await optimizeImage(file);
      const resized = img.width !== img.originalWidth;
      // Clean PNGs can get bigger as JPEG; then the original is already the best upload.
      const upload = resized || img.blob.size < file.size ? img.blob : file;
      setPreview({ url: URL.createObjectURL(upload), name: file.name, width: img.width, height: img.height });
      setStep("optimize", {
        status: "done",
        ms: Math.round(performance.now() - t),
        detail: resized
          ? `${img.originalWidth}×${img.originalHeight} → ${img.width}×${img.height}, ${kb(img.blob.size)}`
          : upload === file
            ? `${img.width}×${img.height}, already optimal`
            : `${img.width}×${img.height}, ${kb(file.size)} → ${kb(img.blob.size)}`,
      });

      const form = new FormData();
      form.set("file", upload, file.name);
      const res = await fetch("/api/ocr", { method: "POST", body: form });
      if (!res.ok || !res.body) throw new Error(`Server error (${res.status})`);

      let buffer = "";
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop()!;
        for (const line of lines) {
          if (!line) continue;
          const e = JSON.parse(line) as OcrEvent;
          if (e.type === "step") {
            current = e.id;
            setStep(e.id, { status: e.status, ms: e.ms, detail: e.detail });
          } else if (e.type === "result") {
            setResult(e.result);
            setStats(e.stats);
          } else setError(e.message);
        }
      }
    } catch (e) {
      setStep(current, { status: "error" });
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function updateField(i: number, value: string) {
    setResult((r) => r && { ...r, fields: r.fields.map((f, j) => (j === i ? { ...f, value } : f)) });
  }

  async function exportExcel() {
    const { downloadExcel } = await import("@/lib/exportExcel");
    await downloadExcel(result!, checks, stats, preview?.name ?? "document");
  }

  const extracting = steps.extract.status === "running";

  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
              <ScanText className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">DocLens AI</h1>
              <p className="text-xs text-slate-500">Intelligent document OCR &amp; data extraction</p>
            </div>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 sm:inline-flex dark:bg-indigo-950 dark:text-indigo-300">
            <Sparkles className="size-3.5" /> Powered by OpenAI vision
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[400px_1fr]">
        <div className="space-y-6">
          <Card>
            <Uploader disabled={busy} onFile={process} />
          </Card>

          {preview && (
            <Card className="p-3">
              <div className="relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL, nothing for next/image to optimize */}
                <img src={preview.url} alt="Uploaded document" className="mx-auto max-h-96 w-auto object-contain" />
                {extracting && (
                  <>
                    <div className="absolute inset-0 bg-indigo-500/10" />
                    <div className="absolute inset-x-0 h-16 animate-[scan_1.8s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-indigo-400/50 to-transparent" />
                  </>
                )}
              </div>
              <div className="mt-2 flex justify-between px-1 text-xs text-slate-500">
                <span className="truncate">{preview.name}</span>
                <span className="tabular-nums">
                  {preview.width}×{preview.height}
                </span>
              </div>
            </Card>
          )}

          <Card>
            <PipelineSteps steps={steps} />
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          {error && (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
              <strong className="font-semibold">Processing failed: </strong>
              {error}
            </div>
          )}

          {result ? (
            <>
              <Card className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                    <FileText className="size-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Detected document</div>
                    <div className="text-lg font-semibold capitalize" data-testid="doc-type">
                      {result.documentType.replace("_", " ")}
                      <span className="ml-2 align-middle text-xs font-medium text-emerald-600">
                        {Math.round(result.documentTypeConfidence * 100)}% confidence
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Language: {result.language.toUpperCase()}
                      {result.totals.currency && ` · Currency: ${result.totals.currency}`}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => preview && fetch(preview.url).then((r) => r.blob()).then((b) => process(new File([b], preview.name, { type: b.type })))}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <RotateCcw className="size-4" /> Re-run
                  </button>
                  <button
                    onClick={exportExcel}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500"
                  >
                    <Download className="size-4" /> Export to Excel
                  </button>
                </div>
              </Card>

              {stats && <StatsBar stats={stats} />}

              <Card>
                <ChecksPanel checks={checks} />
              </Card>
              <Card className="min-w-0">
                <ResultsTabs result={result} onFieldChange={updateField} />
              </Card>
            </>
          ) : (
            !error && (
              <Card className="grid min-h-96 place-items-center text-center">
                {busy ? (
                  <div className="w-full max-w-md space-y-3">
                    {[80, 60, 90, 70, 50].map((w, i) => (
                      <div key={i} className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" style={{ width: `${w}%` }} />
                    ))}
                    <p className="pt-2 text-sm text-slate-500">Reading your document…</p>
                  </div>
                ) : (
                  <div className="max-w-sm">
                    <ScanText className="mx-auto size-12 text-slate-300 dark:text-slate-700" />
                    <h2 className="mt-3 font-semibold">No document yet</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Upload an image or pick a sample. Extracted fields, line items and validation checks will appear here.
                    </p>
                  </div>
                )}
              </Card>
            )
          )}
        </div>
      </main>
    </div>
  );
}

function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {children}
    </section>
  );
}
