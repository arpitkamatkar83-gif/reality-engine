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
import { TRAFFIC_MODEL, type SignalPhase } from "@/lib/simulation/traffic";
import { trafficComparisonRows } from "@/lib/simulation/trafficComparison";
import { CAR_SHADES, TrafficIntersection } from "./TrafficIntersection";
import { TrafficResults } from "./TrafficResults";

const SPEEDS = [5, 10, 20, 40];
const { theme } = ENVIRONMENT_VISUALS.traffic;

const PHASE_LABEL: Record<SignalPhase, { text: string; className: string }> = {
  mainGreen: { text: "Main road green", className: "text-positive" },
  mainClearance: { text: "Main road clearing", className: "text-warning" },
  crossGreen: { text: "Cross street green", className: "text-positive" },
  crossClearance: { text: "Cross street clearing", className: "text-warning" },
};

export function TrafficWorkspace() {
  const playback = usePlayback(TRAFFIC_MODEL.durationSec);
  const runner = useScenarioRunner("traffic", playback.restart);
  const { result, baseline, running } = runner;

  const duration = result?.durationSec ?? TRAFFIC_MODEL.durationSec;
  const frame = result?.timeline[Math.min(result.timeline.length - 1, Math.floor(playback.simTime))];

  return (
    <div className={WORKSPACE_GRID.root}>
      <ScenarioAssistant runner={runner} theme={theme} className={WORKSPACE_GRID.assistant} />

      <ScenarioPanel runner={runner} theme={theme} className={WORKSPACE_GRID.controls} />

      {/* Intersection */}
      <Card className={`relative flex flex-col overflow-hidden ${WORKSPACE_GRID.stage}`}>
        <div aria-hidden className={`absolute inset-0 ${theme.glow}`} />
        <div className="relative flex flex-wrap items-center justify-between gap-2 border-b border-ink-800 px-4 py-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-mono tabular-nums text-ink-100">
              {formatClock(playback.simTime)} <span className="text-ink-400">/ {formatClock(duration)}</span>
            </span>
            {frame && <span className={PHASE_LABEL[frame.phase].className}>{PHASE_LABEL[frame.phase].text}</span>}
          </div>
          {frame && (
            <div className="flex items-center gap-3 font-mono tabular-nums text-ink-300">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm" style={{ background: CAR_SHADES.main.top }} />
                Main queue {frame.queue.main}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm" style={{ background: CAR_SHADES.cross.top }} />
                Cross queue {frame.queue.cross}
              </span>
            </div>
          )}
        </div>

        <div className="relative flex flex-1 items-center">
          <TrafficIntersection
            lanes={result?.params.lanesPerApproach ?? runner.params.lanesPerApproach}
            timeline={result?.timeline}
            simTime={playback.simTime}
            className="mx-auto block w-full max-w-3xl"
          />
          {(running || !result) && (
            <StageOverlay
              running={running}
              theme={theme}
              runningText={`Simulating ${TRAFFIC_MODEL.durationSec / 60} minutes of traffic…`}
              idleText="Run the simulation to animate the intersection"
            />
          )}
        </div>

        <PlaybackBar
          playback={playback}
          duration={duration}
          speeds={SPEEDS}
          speedLabel={(s) => `${s}×`}
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
          <TrafficResults result={result} />
        ) : (
          <p className="text-sm text-ink-400">Metrics appear here after a successful simulation run.</p>
        )}
      </Card>

      <ComparisonPanel
        rows={result && baseline ? trafficComparisonRows(baseline, result) : null}
        isBaselineRun={runner.isBaselineRun}
        theme={theme}
        className={WORKSPACE_GRID.comparison}
      />
    </div>
  );
}
