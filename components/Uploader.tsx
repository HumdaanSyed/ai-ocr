"use client";

import { FileImage, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

export const SAMPLES = [
  { file: "receipt.png", label: "Receipt" },
  { file: "invoice.png", label: "Invoice" },
  { file: "business-card.png", label: "Business card" },
  { file: "id-card.png", label: "ID card" },
];

type Props = { disabled: boolean; onFile: (file: File) => void };

export function Uploader({ disabled, onFile }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  async function loadSample(name: string) {
    const blob = await (await fetch(`/samples/${name}`)).blob();
    onFile(new File([blob], name, { type: blob.type }));
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files[0];
          if (f && !disabled) onFile(f);
        }}
        className={`group flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition
          ${over ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40" : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"}
          disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <UploadCloud className="size-9 text-indigo-500 transition group-hover:-translate-y-0.5" aria-hidden />
        <span className="font-medium">Drop an image here or click to upload</span>
        <span className="text-sm text-slate-500">JPEG, PNG or WebP · up to 20 MB</span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        data-testid="file-input"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-500">Try a sample:</span>
        {SAMPLES.map((s) => (
          <button
            key={s.file}
            type="button"
            disabled={disabled}
            onClick={() => loadSample(s.file)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 font-medium transition hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
          >
            <FileImage className="size-3.5" aria-hidden />
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
