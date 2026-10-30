import { MetricCard } from "@/components/workspace/MetricCard";
import { ENVIRONMENTS } from "@/lib/environments";
import { formatValue } from "@/lib/format";
import type { HospitalResult } from "@/lib/simulation/hospital";

const metricLabel = (key: string) => ENVIRONMENTS.hospital.metrics.find((m) => m.key === key)!.label;
const utilTone = (pct: number) => (pct >= 95 ? "negative" : pct >= 85 ? "warning" : "default");

export const BOTTLENECK_LABEL = { doctors: "Doctors", beds: "Beds" } as const;

export function HospitalResults({ result }: { result: HospitalResult }) {
  const { summary, capacity, stats, params } = result;
  const rows: [string, string, boolean?][] = [
    ["Demand", `${capacity.demandPerHour} patients/h`],
    ["Doctor capacity", `${capacity.doctorCapacityPerHour} patients/h`, capacity.bottleneck === "doctors"],
    ["Bed capacity", `${capacity.bedCapacityPerHour} patients/h`, capacity.bottleneck === "beds"],
    ["Demand vs bottleneck", formatValue(capacity.load * 100, "%")],
    ["Still waiting at end", String(stats.stillWaiting)],
    ["Longest wait", formatValue(stats.maxWaitMin, "min")],
    ["Minutes short of a doctor", String(stats.minutesWaitingForDoctor)],
    ["Minutes short of a bed", String(stats.minutesWaitingForBed)],
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2.5">
        <MetricCard label={metricLabel("avgWaitMin")} value={formatValue(summary.avgWaitMin, "min")} hint="per patient" />
        <MetricCard label={metricLabel("maxQueue")} value={String(summary.maxQueue)} hint="patients at once" />
        <MetricCard label={metricLabel("patientsTreated")} value={String(summary.patientsTreated)} hint={`of ${stats.arrived} arrivals`} />
        <MetricCard label={metricLabel("bedUtilization")} value={formatValue(summary.bedUtilization, "%")} tone={utilTone(summary.bedUtilization)} hint={`${params.beds} beds`} />
        <MetricCard label={metricLabel("doctorUtilization")} value={formatValue(summary.doctorUtilization, "%")} tone={utilTone(summary.doctorUtilization)} hint={`${params.doctors} doctors`} />
        <MetricCard
          label="Bottleneck"
          value={BOTTLENECK_LABEL[capacity.bottleneck]}
          tone={capacity.load >= 1 ? "negative" : capacity.load >= 0.85 ? "warning" : "default"}
          hint="lowest capacity"
        />
      </div>

      <div>
        <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-400">Capacity</h3>
        <table className="w-full text-xs">
          <tbody className="font-mono tabular-nums">
            {rows.map(([label, value, highlight]) => (
              <tr key={label} className="border-t border-ink-800">
                <td className="py-1.5 font-sans text-ink-400">{label}</td>
                <td className={`py-1.5 text-right ${highlight ? "text-warning" : "text-ink-100"}`}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] leading-relaxed text-ink-400">
        Each patient needs a doctor and a bed. Doctors are busy {params.treatmentMinutes} min per patient; the bed stays occupied a
        further {result.observationMin} min for observation and turnover. Arrivals follow a fixed daily profile peaking mid-shift.
      </p>
    </div>
  );
}
