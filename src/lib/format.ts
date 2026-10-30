const UNIT_SUFFIX: Record<string, string> = { "%": "%", s: " s", min: " min" };

/** Formats a metric value with its unit, e.g. 15.5 s, 81%, 311 vehicles. */
export function formatValue(value: number, unit: string, opts: { signed?: boolean } = {}): string {
  const rounded = Math.round(value * 10) / 10;
  const text = rounded.toLocaleString("en-US", { maximumFractionDigits: 1 });
  const sign = opts.signed && rounded > 0 ? "+" : "";
  const suffix = UNIT_SUFFIX[unit] ?? (unit ? ` ${unit}` : "");
  return `${sign}${text}${suffix}`;
}

export function formatClock(seconds: number): string {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
