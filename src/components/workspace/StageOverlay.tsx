import type { EnvironmentTheme } from "@/components/dashboard/EnvironmentCard";

/** Covers the visualization before the first run and while a run is in progress. */
export function StageOverlay({ running, runningText, idleText, theme }: { running: boolean; runningText: string; idleText: string; theme: EnvironmentTheme }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-ink-950/40 backdrop-blur-[1px]">
      <p className="mx-4 rounded-full border border-ink-700 bg-ink-900/90 px-4 py-2 text-center text-sm text-ink-300">
        {running ? (
          <span className="flex items-center gap-2">
            <span className={`size-3 animate-spin rounded-full border-2 border-t-transparent ${theme.spinner}`} />
            {runningText}
          </span>
        ) : (
          idleText
        )}
      </p>
    </div>
  );
}
