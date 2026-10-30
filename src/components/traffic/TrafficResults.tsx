import { MetricCard } from "@/components/workspace/MetricCard";
import { ENVIRONMENTS } from "@/lib/environments";
import { formatValue } from "@/lib/format";
import { ROAD_IDS, TRAFFIC_MODEL, type TrafficResult } from "@/lib/simulation/traffic";
import { ROAD_LABEL } from "@/lib/simulation/trafficComparison";

const LEVEL_TONE = { Low: "positive", Moderate: "default", Heavy: "warning", Oversaturated: "negative" } as const;
const metricLabel = (key: string) => ENVIRONMENTS.traffic.metrics.find((m) => m.key === key)!.label;

export function TrafficResults({ result }: { result: TrafficResult }) {
  const { summary, roads } = result;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2.5">
        <MetricCard label={metricLabel("avgWaitSec")} value={formatValue(summary.avgWaitSec, "s")} hint="per vehicle" />
        <MetricCard label={metricLabel("maxQueue")} value={String(summary.maxQueue)} hint="vehicles, both roads" />
        <MetricCard label={metricLabel("vehiclesServed")} value={String(summary.vehiclesServed)} hint={`in ${result.durationSec / 60} minutes`} />
        <MetricCard
          label={metricLabel("congestion")}
          value={formatValue(summary.congestion, "%")}
          tone={LEVEL_TONE[result.congestionLevel]}
          hint={result.congestionLevel}
        />
      </div>

      <div>
        <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-400">By road</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-ink-400">
              <th className="py-1 font-normal" />
              {ROAD_IDS.map((id) => (
                <th key={id} className="py-1 text-right font-normal">
                  <span className={`mr-1 inline-block size-2 rounded-sm ${id === "main" ? "bg-[#7ee0f7]" : "bg-[#fcd57a]"}`} />
                  {ROAD_LABEL[id]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {(
              [
                ["Avg wait", (id) => formatValue(roads[id].avgWaitSec, "s")],
                ["Max queue", (id) => String(roads[id].maxQueue)],
                ["Served", (id) => `${roads[id].served}/${roads[id].arrived}`],
                ["Still queued", (id) => String(roads[id].remainingQueue)],
                ["Demand", (id) => `${roads[id].demandPerMin}/min`],
                ["Capacity", (id) => `${roads[id].capacityPerMin}/min`],
                ["Saturation", (id) => formatValue(roads[id].saturation * 100, "%")],
              ] as [string, (id: (typeof ROAD_IDS)[number]) => string][]
            ).map(([label, fn]) => (
              <tr key={label} className="border-t border-ink-800">
                <td className="py-1.5 font-sans text-ink-400">{label}</td>
                {ROAD_IDS.map((id) => (
                  <td key={id} className={`py-1.5 text-right ${label === "Saturation" && roads[id].saturation >= 1 ? "text-negative" : "text-ink-100"}`}>
                    {fn(id)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] leading-relaxed text-ink-400">
        Signal cycle {result.cycleSec} s ({result.params.mainGreenSec} s main green, {result.params.crossGreenSec} s cross green,
        2 × {TRAFFIC_MODEL.clearanceSec} s clearance). Saturation flow 1 vehicle / {TRAFFIC_MODEL.saturationHeadwaySec} s per lane.
      </p>
    </div>
  );
}
