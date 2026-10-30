"use client";

import type { EnvironmentTheme } from "@/components/dashboard/EnvironmentCard";
import { Card } from "@/components/ui/Card";
import { ENVIRONMENTS, type EnvironmentId } from "@/lib/environments";
import { ParamControls } from "./ParamControls";
import type { ScenarioRunner } from "./useScenarioRunner";

interface Props<E extends EnvironmentId> {
  runner: ScenarioRunner<E>;
  theme: EnvironmentTheme;
  className?: string;
}

/** Left-hand scenario panel: parameter controls, run/reset and run status. */
export function ScenarioPanel<E extends EnvironmentId>({ runner, theme, className = "" }: Props<E>) {
  const { changedCount, running, result, stale, status } = runner;
  return (
    <Card className={`p-5 ${className}`}>
      <div className="mb-5 flex items-center justify-between">
        <h2 className={`font-mono text-xs uppercase tracking-[0.16em] ${theme.accentText}`}>Scenario</h2>
        <span className={`text-xs ${changedCount ? "text-accent" : "text-ink-400"}`}>
          {changedCount ? `${changedCount} changed from baseline` : "Baseline values"}
        </span>
      </div>
      <ParamControls
        specs={ENVIRONMENTS[runner.environment].specs}
        values={runner.params}
        baseline={runner.defaults}
        errors={runner.errors}
        disabled={running}
        accentClass={theme.range}
        onChange={runner.setParam}
      />
      <div className="mt-6 space-y-2">
        <button
          type="button"
          onClick={runner.run}
          disabled={!runner.isValid || running}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${theme.button}`}
        >
          {running ? "Simulating…" : result ? "Run again" : "Run simulation"}
        </button>
        <button
          type="button"
          onClick={runner.reset}
          disabled={running || changedCount === 0}
          className="w-full rounded-xl border border-ink-700 px-4 py-2 text-sm text-ink-300 transition hover:border-ink-600 hover:text-ink-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset to defaults
        </button>
        {stale && !running && <p className="text-center text-xs text-warning">Parameters changed since the last run.</p>}
        {status.state === "error" && (
          <p role="alert" className="rounded-lg border border-negative/30 bg-negative/10 px-3 py-2 text-xs text-negative">
            {status.message}
          </p>
        )}
      </div>
    </Card>
  );
}
