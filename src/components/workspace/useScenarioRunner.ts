"use client";

import { useMemo, useRef, useState } from "react";
import { DEFAULT_PARAMS, ENVIRONMENTS, PARAM_SCHEMAS, type EnvironmentId, type EnvironmentParams } from "@/lib/environments";
import type { EnvironmentResults } from "@/lib/simulation/api";
import { requestSimulation } from "@/lib/simulation/client";

const MIN_RUNNING_MS = 700;

type RunStatus = { state: "idle" | "running" } | { state: "error"; message: string };

const sameParams = (a: object, b: object) =>
  Object.entries(a).every(([k, v]) => (b as Record<string, unknown>)[k] === v);

function validationErrors(environment: EnvironmentId, params: object): Partial<Record<string, string>> {
  const parsed = PARAM_SCHEMAS[environment].safeParse(params);
  if (parsed.success) return {};
  const specs = ENVIRONMENTS[environment].specs;
  const errors: Partial<Record<string, string>> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0]);
    const spec = specs[key];
    errors[key] = spec ? `Enter a whole number ${spec.min}–${spec.max}` : issue.message;
  }
  return errors;
}

/**
 * Scenario state shared by every environment workspace: editable parameters,
 * validation, running the proposed scenario via /api/simulate, and caching the
 * default-parameter baseline for comparison.
 */
export function useScenarioRunner<E extends EnvironmentId>(environment: E, onResult?: () => void) {
  type Params = EnvironmentParams[E];
  type Result = EnvironmentResults[E];
  const defaults = DEFAULT_PARAMS[environment] as Params;

  const [params, setParams] = useState<Params>(defaults);
  const [result, setResult] = useState<Result | null>(null);
  const [baseline, setBaseline] = useState<Result | null>(null);
  const [status, setStatus] = useState<RunStatus>({ state: "idle" });
  const runId = useRef(0);

  const errors = useMemo(() => validationErrors(environment, params), [environment, params]);
  const isValid = Object.keys(errors).length === 0;
  const changedCount = Object.keys(params).filter(
    (k) => (params as Record<string, number>)[k] !== (defaults as Record<string, number>)[k],
  ).length;
  const resultParams = (result as { params: Params } | null)?.params;

  async function run() {
    if (!isValid) return;
    const id = ++runId.current;
    setStatus({ state: "running" });
    try {
      const minDelay = new Promise((r) => setTimeout(r, MIN_RUNNING_MS));
      const [proposed, base] = await Promise.all([
        requestSimulation({ environment, params }),
        baseline ?? requestSimulation({ environment, params: defaults }).then((r) => r.result),
        minDelay,
      ]);
      if (id !== runId.current) return;
      setBaseline(base);
      setResult(proposed.result);
      setStatus({ state: "idle" });
      onResult?.();
    } catch (err) {
      if (id !== runId.current) return;
      setStatus({ state: "error", message: err instanceof Error ? err.message : "The simulation failed." });
    }
  }

  return {
    environment,
    params,
    defaults,
    setParam: (key: string, value: number) => setParams((p) => ({ ...p, [key]: value })),
    /** Applies approved values to the controls. Never runs the simulation. */
    applyChanges: (changes: { key: string; value: number }[]) =>
      setParams((p) => ({ ...p, ...Object.fromEntries(changes.map((c) => [c.key, c.value])) })),
    reset: () => setParams(defaults),
    errors,
    isValid,
    changedCount,
    status,
    running: status.state === "running",
    result,
    baseline,
    /** Parameters were edited after the last successful run. */
    stale: resultParams !== undefined && !sameParams(resultParams, params),
    /** The last run used the default parameters, so there is nothing to compare. */
    isBaselineRun: resultParams !== undefined && sameParams(resultParams, defaults),
    run,
  };
}

export type ScenarioRunner<E extends EnvironmentId> = ReturnType<typeof useScenarioRunner<E>>;
