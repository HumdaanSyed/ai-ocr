import { CheckCircle2, MinusCircle, TriangleAlert, XCircle } from "lucide-react";
import type { Check, CheckStatus } from "@/lib/checks";

const STYLE: Record<CheckStatus, { icon: typeof CheckCircle2; color: string }> = {
  pass: { icon: CheckCircle2, color: "text-emerald-500" },
  warn: { icon: TriangleAlert, color: "text-amber-500" },
  fail: { icon: XCircle, color: "text-rose-500" },
  skip: { icon: MinusCircle, color: "text-slate-400" },
};

export function ChecksPanel({ checks }: { checks: Check[] }) {
  const count = (s: CheckStatus) => checks.filter((c) => c.status === s).length;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Validation checks</h2>
        <div className="flex gap-2 text-xs font-medium">
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            {count("pass")} passed
          </span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            {count("warn")} warnings
          </span>
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
            {count("fail")} failed
          </span>
        </div>
      </div>
      <ul className="grid gap-x-6 sm:grid-cols-2">
        {checks.map((c, i) => {
          const { icon: Icon, color } = STYLE[c.status];
          return (
            <li
              key={c.id}
              className="flex animate-[fade-in_0.3s_ease-out_both] items-start gap-3 border-b border-slate-100 py-2.5 dark:border-slate-800"
              style={{ animationDelay: `${i * 60}ms` }}
              data-testid={`check-${c.id}`}
              data-status={c.status}
            >
              <Icon className={`mt-0.5 size-5 shrink-0 ${color}`} aria-label={c.status} />
              <div className="min-w-0">
                <div className={`text-sm font-medium ${c.status === "skip" ? "text-slate-400" : ""}`}>{c.label}</div>
                <div className="break-words text-xs text-slate-500">{c.detail}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
