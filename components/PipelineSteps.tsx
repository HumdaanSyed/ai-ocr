import { Brain, Check, FileSearch, Loader2, Minimize2, ShieldCheck, Upload, X } from "lucide-react";
import type { StepId, StepStatus } from "@/lib/events";

export type StepState = { status: StepStatus; ms?: number; detail?: string };

export const STEPS: { id: StepId; label: string; where: "Browser" | "Server" | "OpenAI"; icon: typeof Upload }[] = [
  { id: "upload", label: "Validate upload", where: "Browser", icon: Upload },
  { id: "optimize", label: "Optimize image", where: "Browser", icon: Minimize2 },
  { id: "server", label: "Security checks", where: "Server", icon: ShieldCheck },
  { id: "extract", label: "AI text extraction", where: "OpenAI", icon: Brain },
  { id: "verify", label: "Verify data", where: "Server", icon: FileSearch },
];

const RING: Record<StepStatus, string> = {
  pending: "border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900",
  running: "border-indigo-500 bg-white text-indigo-500 shadow-[0_0_0_4px] shadow-indigo-500/15 dark:bg-slate-900",
  done: "border-emerald-500 bg-emerald-500 text-white",
  error: "border-rose-500 bg-rose-500 text-white",
};

export function PipelineSteps({ steps }: { steps: Record<StepId, StepState> }) {
  const finished = STEPS.filter((s) => steps[s.id].status === "done").length;
  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-sm">
        <h2 className="font-semibold">Processing pipeline</h2>
        <span className="tabular-nums text-slate-500">
          {finished}/{STEPS.length} steps
        </span>
      </div>
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
          style={{ width: `${(finished / STEPS.length) * 100}%` }}
        />
      </div>
      <ol className="relative space-y-4">
        {STEPS.map(({ id, label, where, icon: Icon }, i) => {
          const s = steps[id];
          return (
            <li key={id} className="relative flex gap-3" data-testid={`step-${id}`} data-status={s.status}>
              {i < STEPS.length - 1 && (
                <span
                  className={`absolute left-[15px] top-8 h-[calc(100%-8px)] w-0.5 ${s.status === "done" ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`}
                  aria-hidden
                />
              )}
              <span
                className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 transition ${RING[s.status]}`}
              >
                {s.status === "running" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : s.status === "done" ? (
                  <Check className="size-4" />
                ) : s.status === "error" ? (
                  <X className="size-4" />
                ) : (
                  <Icon className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`font-medium ${s.status === "pending" ? "text-slate-400" : ""}`}>{label}</span>
                  {s.ms != null && <span className="font-mono text-xs tabular-nums text-slate-500">{fmtMs(s.ms)}</span>}
                </div>
                <div className="text-xs text-slate-500">
                  <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 font-medium dark:bg-slate-800">{where}</span>
                  {s.status === "running" ? "working…" : s.detail}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const fmtMs = (ms: number) => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);
