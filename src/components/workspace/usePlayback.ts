"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * Drives a simulation clock with requestAnimationFrame. Time is in the timeline's own
 * unit (seconds for traffic, minutes for hospital); speed is units per real second.
 */
export function usePlayback(duration: number, initialSpeed = 10) {
  const [simTime, setSimTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(initialSpeed);
  const lastTs = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = (ts: number) => {
      const dt = lastTs.current === null ? 0 : (ts - lastTs.current) / 1000;
      lastTs.current = ts;
      setSimTime((t) => {
        const next = Math.min(duration, t + dt * speed);
        if (next >= duration) setPlaying(false);
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      lastTs.current = null;
    };
  }, [playing, speed, duration]);

  /** Starts a new timeline. With reduced motion preferred, it waits at the start for the user to press play. */
  const restart = useCallback(() => {
    setSimTime(0);
    setPlaying(!prefersReducedMotion());
  }, []);

  const toggle = useCallback(() => {
    setSimTime((t) => (t >= duration ? 0 : t));
    setPlaying((p) => !p);
  }, [duration]);

  const seek = useCallback((t: number) => setSimTime(Math.max(0, Math.min(duration, t))), [duration]);

  return { simTime, playing, speed, setSpeed, restart, toggle, seek };
}
