"use client";

import type { EnvironmentTheme } from "@/components/dashboard/EnvironmentCard";
import type { usePlayback } from "./usePlayback";

interface Props {
  playback: ReturnType<typeof usePlayback>;
  duration: number;
  speeds: number[];
  /** Unit suffix for speed buttons, e.g. "×" or " min/s". */
  speedLabel: (speed: number) => string;
  disabled: boolean;
  theme: EnvironmentTheme;
}

/** Play/pause, timeline scrubber and speed selection for a simulation timeline. */
export function PlaybackBar({ playback, duration, speeds, speedLabel, disabled, theme }: Props) {
  return (
    <div className="relative flex flex-wrap items-center gap-3 border-t border-ink-800 px-4 py-3">
      <button
        type="button"
        onClick={playback.toggle}
        disabled={disabled}
        aria-label={playback.playing ? "Pause" : "Play"}
        className="flex size-8 items-center justify-center rounded-lg border border-ink-700 text-ink-100 transition hover:border-ink-400 disabled:opacity-40"
      >
        {playback.playing ? "❚❚" : "▶"}
      </button>
      <input
        type="range"
        aria-label="Simulation time"
        min={0}
        max={duration}
        step={1}
        value={Math.floor(playback.simTime)}
        disabled={disabled}
        onChange={(e) => playback.seek(Number(e.target.value))}
        className={`min-w-32 flex-1 ${theme.range}`}
      />
      <div className="flex gap-1" role="group" aria-label="Playback speed">
        {speeds.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => playback.setSpeed(s)}
            aria-pressed={playback.speed === s}
            className={`rounded-md px-2 py-1 font-mono text-[11px] transition ${
              playback.speed === s ? theme.chip : "text-ink-400 hover:text-ink-100"
            }`}
          >
            {speedLabel(s)}
          </button>
        ))}
      </div>
    </div>
  );
}
