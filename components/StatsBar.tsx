import { Clock, Coins, Cpu, Hash } from "lucide-react";
import type { Stats } from "@/lib/events";

export function StatsBar({ stats }: { stats: Stats }) {
  const items = [
    { icon: Clock, label: "Total time", value: `${(stats.ms / 1000).toFixed(1)} s` },
    {
      icon: Hash,
      label: "Tokens in / out",
      value: `${stats.inputTokens.toLocaleString()} / ${stats.outputTokens.toLocaleString()}`,
    },
    {
      icon: Coins,
      label: "Est. cost",
      value: stats.costUsd == null ? "n/a" : `$${stats.costUsd < 0.01 ? stats.costUsd.toFixed(4) : stats.costUsd.toFixed(3)}`,
    },
    { icon: Cpu, label: "Model", value: stats.model },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="stats">
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Icon className="size-3.5" aria-hidden />
            {label}
          </div>
          <div className="mt-1 truncate font-semibold tabular-nums">{value}</div>
        </div>
      ))}
    </div>
  );
}
