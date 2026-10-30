import { verdict, type ComparisonRow, type Verdict } from "@/lib/comparison";
import { formatValue } from "@/lib/format";

const VERDICT_STYLE: Record<Verdict, { label: string; className: string; icon: string }> = {
  improved: { label: "Improved", className: "bg-positive/10 text-positive border-positive/30", icon: "▲" },
  worse: { label: "Worse", className: "bg-negative/10 text-negative border-negative/30", icon: "▼" },
  unchanged: { label: "No change", className: "bg-ink-800 text-ink-300 border-ink-700", icon: "=" },
  changed: { label: "Changed", className: "bg-warning/10 text-warning border-warning/30", icon: "~" },
};

function percentChange(before: number, after: number): string {
  if (before === 0) return after === 0 ? "" : "new";
  const pct = ((after - before) / Math.abs(before)) * 100;
  return `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`;
}

/** Baseline vs proposed metric table with per-row improvement/deterioration verdicts. */
export function ComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="text-left font-mono text-[11px] uppercase tracking-[0.12em] text-ink-400">
            <th className="py-2 pr-3 font-normal">Metric</th>
            <th className="px-3 py-2 text-right font-normal">Baseline</th>
            <th className="px-3 py-2 text-right font-normal">Proposed</th>
            <th className="px-3 py-2 text-right font-normal">Difference</th>
            <th className="py-2 pl-3 text-right font-normal">Outcome</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const v = verdict(row);
            const style = VERDICT_STYLE[v];
            const showGroup = row.group && row.group !== rows[index - 1]?.group;
            return [
              showGroup && (
                <tr key={`${row.group}-heading`}>
                  <td colSpan={5} className="pt-4 pb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-400">
                    {row.group}
                  </td>
                </tr>
              ),
              <tr key={row.key} className="border-t border-ink-800">
                <td className="py-2.5 pr-3 text-ink-100">{row.label}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums text-ink-300">{formatValue(row.before, row.unit)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums text-ink-100">{formatValue(row.after, row.unit)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums text-ink-300">
                  {formatValue(row.after - row.before, row.unit === "%" ? "pp" : row.unit, { signed: true })}
                  <span className="ml-1.5 text-ink-400">{percentChange(row.before, row.after)}</span>
                </td>
                <td className="py-2.5 pl-3 text-right">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${style.className}`}>
                    <span aria-hidden>{style.icon}</span>
                    {style.label}
                  </span>
                </td>
              </tr>,
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
