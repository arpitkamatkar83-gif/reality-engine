"use client";

import { ENVIRONMENT_VISUALS } from "@/components/dashboard/environmentVisuals";
import { Card } from "@/components/ui/Card";
import { ComparisonPanel } from "@/components/workspace/ComparisonPanel";
import { WORKSPACE_GRID } from "@/components/workspace/layout";
import { PlaybackBar } from "@/components/workspace/PlaybackBar";
import { ScenarioAssistant } from "@/components/workspace/ScenarioAssistant";
import { ScenarioPanel } from "@/components/workspace/ScenarioPanel";
import { StageOverlay } from "@/components/workspace/StageOverlay";
import { usePlayback } from "@/components/workspace/usePlayback";
import { useScenarioRunner } from "@/components/workspace/useScenarioRunner";
import { formatClock } from "@/lib/format";
import { HOSPITAL_MODEL } from "@/lib/simulation/hospital";
import { hospitalComparisonRows } from "@/lib/simulation/hospitalComparison";
import { HospitalFloor, PEOPLE_COLORS } from "./HospitalFloor";
import { BOTTLENECK_LABEL, HospitalResults } from "./HospitalResults";

const SPEEDS = [2, 5, 10, 20];
const { theme } = ENVIRONMENT_VISUALS.hospital;

export function HospitalWorkspace() {
  const playback = usePlayback(HOSPITAL_MODEL.durationMin, 5);
  const runner = useScenarioRunner("hospital", playback.restart);
  const { result, baseline, running } = runner;

  const duration = result?.durationMin ?? HOSPITAL_MODEL.durationMin;
  const frame = result?.timeline[Math.min(result.timeline.length - 1, Math.floor(playback.simTime))];
  const shownParams = result?.params ?? runner.params;

  const journey = frame && [
    { label: "Arrived", value: frame.arrived, color: PEOPLE_COLORS.patient },
    { label: "Waiting", value: frame.waiting, color: PEOPLE_COLORS.patient },
    { label: "In treatment", value: frame.inTreatment, color: PEOPLE_COLORS.patient },
    { label: "Observation", value: frame.inObservation, color: PEOPLE_COLORS.observation },
    { label: "Discharged", value: frame.discharged, color: PEOPLE_COLORS.discharged },
  ];

  const bottleneckNote =
    result && baseline && result.capacity.bottleneck !== baseline.capacity.bottleneck ? (
      <p className="mb-3 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
        The bottleneck moved from {BOTTLENECK_LABEL[baseline.capacity.bottleneck].toLowerCase()} to{" "}
        {BOTTLENECK_LABEL[result.capacity.bottleneck].toLowerCase()}: adding more of the old bottleneck alone will not
        help further.
      </p>
    ) : null;

  return (
    <div className={WORKSPACE_GRID.root}>
      <ScenarioAssistant runner={runner} theme={theme} className={WORKSPACE_GRID.assistant} />

      <ScenarioPanel runner={runner} theme={theme} className={WORKSPACE_GRID.controls} />

      {/* Emergency department */}
      <Card className={`relative flex flex-col overflow-hidden ${WORKSPACE_GRID.stage}`}>
        <div aria-hidden className={`absolute inset-0 ${theme.glow}`} />
        <div className="relative flex flex-wrap items-center justify-between gap-2 border-b border-ink-800 px-4 py-3 text-xs">
          <span className="font-mono tabular-nums text-ink-100">
            {formatClock(playback.simTime)} <span className="text-ink-400">/ {formatClock(duration)} h</span>
          </span>
          {frame && (
            <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums text-ink-300">
              <span>Waiting {frame.waiting}</span>
              <span>
                Doctors busy {frame.inTreatment}/{shownParams.doctors}
              </span>
              <span>
                Beds in use {frame.inTreatment + frame.inObservation}/{shownParams.beds}
              </span>
            </div>
          )}
        </div>

        <div className="relative flex flex-1 items-center">
          <HospitalFloor
            beds={shownParams.beds}
            doctors={shownParams.doctors}
            patients={result?.patients}
            simTime={playback.simTime}
            speed={playback.speed}
            className="mx-auto block w-full max-w-3xl"
          />
          {(running || !result) && (
            <StageOverlay
              running={running}
              theme={theme}
              runningText={`Simulating ${HOSPITAL_MODEL.durationMin / 60} hours of patient flow…`}
              idleText="Run the simulation to animate the emergency department"
            />
          )}
        </div>

        {journey && (
          <ol className="relative flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-ink-800 px-4 py-2 text-[11px] text-ink-400">
            {journey.map((step, i) => (
              <li key={step.label} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden className="text-ink-600">→</span>}
                <span className="size-2 rounded-full" style={{ background: step.color }} />
                {step.label}
                <span className="font-mono tabular-nums text-ink-100">{step.value}</span>
              </li>
            ))}
          </ol>
        )}

        <PlaybackBar
          playback={playback}
          duration={duration}
          speeds={SPEEDS}
          speedLabel={(s) => `${s} min/s`}
          disabled={!result || running}
          theme={theme}
        />
      </Card>

      {/* Metrics */}
      <Card className={`p-5 ${WORKSPACE_GRID.results}`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className={`font-mono text-xs uppercase tracking-[0.16em] ${theme.accentText}`}>Results</h2>
          {result && <span className="text-xs text-ink-400">{runner.stale ? "Last run" : "Current scenario"}</span>}
        </div>
        {result ? (
          <HospitalResults result={result} />
        ) : (
          <p className="text-sm text-ink-400">Metrics appear here after a successful simulation run.</p>
        )}
      </Card>

      <ComparisonPanel
        rows={result && baseline ? hospitalComparisonRows(baseline, result) : null}
        isBaselineRun={runner.isBaselineRun}
        theme={theme}
        note={bottleneckNote}
        className={WORKSPACE_GRID.comparison}
      />
    </div>
  );
}
