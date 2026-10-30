import Link from "next/link";
import type { ReactNode } from "react";
import type { EnvironmentMeta } from "@/lib/environments";

export interface EnvironmentTheme {
  /** Gradient glow behind the illustration. */
  glow: string;
  /** Text colour for eyebrow and highlights. */
  accentText: string;
  /** Border colour on hover. */
  hoverBorder: string;
  /** CTA button styles. */
  button: string;
  /** Native range input accent colour. */
  range: string;
  /** Selected chip (e.g. playback speed). */
  chip: string;
  /** Spinner border colour. */
  spinner: string;
}

interface Props {
  env: EnvironmentMeta;
  theme: EnvironmentTheme;
  illustration: ReactNode;
  index: number;
}

export function EnvironmentCard({ env, theme, illustration, index }: Props) {
  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-3xl border border-ink-700/70 bg-gradient-to-b from-ink-850 to-ink-900 transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40 ${theme.hoverBorder}`}
    >
      <div className="relative aspect-[16/10] overflow-hidden border-b border-ink-800">
        <div aria-hidden className={`absolute inset-0 ${theme.glow}`} />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.03)_1px,transparent_1px)] bg-[size:24px_24px]"
        />
        <div className="relative flex h-full items-center justify-center p-4 transition-transform duration-500 group-hover:scale-[1.04]">
          {illustration}
        </div>
        <span className="absolute left-4 top-4 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
          Environment 0{index + 1}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">{env.name}</h2>
          <p className="text-sm text-ink-300">{env.description}</p>
        </div>

        <dl className="grid gap-4 text-xs sm:grid-cols-2">
          <div className="space-y-2">
            <dt className={`font-mono uppercase tracking-[0.14em] ${theme.accentText}`}>Adjust</dt>
            <dd>
              <ul className="space-y-1 text-ink-300">
                {Object.entries(env.specs).map(([key, spec]) => (
                  <li key={key} className="flex items-baseline justify-between gap-2">
                    <span>{spec.label}</span>
                    <span className="shrink-0 font-mono text-ink-400">
                      {spec.min}–{spec.max}
                    </span>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          <div className="space-y-2">
            <dt className={`font-mono uppercase tracking-[0.14em] ${theme.accentText}`}>Observe</dt>
            <dd>
              <ul className="space-y-1 text-ink-300">
                {env.metrics.map((m) => (
                  <li key={m.key}>{m.label}</li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>

        <div className="mt-auto flex items-center justify-between gap-4 border-t border-ink-800 pt-5">
          <p className="hidden truncate font-mono text-[11px] text-ink-400 sm:block" title={env.exampleRequest}>
            “{env.exampleRequest}”
          </p>
          <Link
            href={env.href}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 ${theme.button}`}
          >
            {env.cta}
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
