"use client";

import type { ParamSpecs } from "@/lib/params";

interface Props {
  specs: ParamSpecs;
  values: Record<string, number>;
  baseline: Record<string, number>;
  errors?: Partial<Record<string, string>>;
  disabled?: boolean;
  accentClass?: string;
  onChange: (key: string, value: number) => void;
}

/** Slider + numeric input for each parameter, driven entirely by the central ParamSpecs. */
export function ParamControls({ specs, values, baseline, errors = {}, disabled, accentClass = "accent-accent", onChange }: Props) {
  return (
    <div className="space-y-5">
      {Object.entries(specs).map(([key, spec]) => {
        const value = values[key];
        const changed = value !== baseline[key];
        const error = errors[key];
        const id = `param-${key}`;
        return (
          <div key={key} className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor={id} className="text-sm text-ink-100">
                {spec.label}
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  inputMode="numeric"
                  aria-label={`${spec.label} value`}
                  min={spec.min}
                  max={spec.max}
                  step={spec.step}
                  value={Number.isNaN(value) ? "" : value}
                  disabled={disabled}
                  onChange={(e) => onChange(key, e.target.value === "" ? Number.NaN : Number(e.target.value))}
                  className={`w-16 rounded-md border bg-ink-950/60 px-2 py-1 text-right font-mono text-sm tabular-nums outline-none focus:border-accent ${
                    error ? "border-negative" : changed ? "border-accent/60" : "border-ink-700"
                  }`}
                />
                <span className="w-14 text-xs text-ink-400">{spec.unit}</span>
              </div>
            </div>
            <input
              id={id}
              type="range"
              min={spec.min}
              max={spec.max}
              step={spec.step}
              value={Number.isNaN(value) ? spec.min : value}
              disabled={disabled}
              onChange={(e) => onChange(key, Number(e.target.value))}
              className={`w-full cursor-pointer disabled:cursor-not-allowed ${accentClass}`}
            />
            <div className="flex justify-between font-mono text-[11px] text-ink-400">
              <span>
                {spec.min}–{spec.max}
              </span>
              {error ? (
                <span role="alert" className="text-negative">{error}</span>
              ) : changed ? (
                <span className="text-accent">
                  changed from {baseline[key]}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
