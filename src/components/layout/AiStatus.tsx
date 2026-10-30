"use client";

import { useEffect, useState } from "react";
import { HealthResponseSchema, type AiHealth } from "@/lib/health";

const POLL_MS = 30_000;

type Status =
  | { state: "checking" }
  | { state: "connected"; ai: AiHealth }
  | { state: "unavailable"; reason: string };

async function fetchStatus(signal: AbortSignal): Promise<Status> {
  try {
    const res = await fetch("/api/health", { cache: "no-store", signal });
    if (!res.ok) return { state: "unavailable", reason: `Health check failed (${res.status})` };
    const { ai } = HealthResponseSchema.parse(await res.json());
    if (ai.reachable && ai.modelAvailable) return { state: "connected", ai };
    return { state: "unavailable", reason: ai.error ?? "Local AI is unavailable" };
  } catch (err) {
    if (signal.aborted) throw err;
    return { state: "unavailable", reason: "Could not reach the health endpoint" };
  }
}

const STYLES = {
  checking: { dot: "bg-ink-400 animate-pulse", text: "text-ink-300", label: "Checking AI" },
  connected: { dot: "bg-positive shadow-[0_0_10px_2px] shadow-positive/50", text: "text-positive", label: "AI connected" },
  unavailable: { dot: "bg-negative", text: "text-negative", label: "AI unavailable" },
} as const;

/** Live indicator for the local Ollama model, polled via /api/health. */
export function AiStatus() {
  const [status, setStatus] = useState<Status>({ state: "checking" });

  useEffect(() => {
    const controller = new AbortController();
    const check = () =>
      fetchStatus(controller.signal).then(setStatus, () => {
        /* aborted on unmount */
      });
    check();
    const id = setInterval(check, POLL_MS);
    window.addEventListener("focus", check);
    return () => {
      controller.abort();
      clearInterval(id);
      window.removeEventListener("focus", check);
    };
  }, []);

  const style = STYLES[status.state];
  const detail =
    status.state === "connected"
      ? `Local model ${status.ai.model} via Ollama`
      : status.state === "unavailable"
        ? status.reason
        : "Checking local Ollama service…";

  return (
    <div
      role="status"
      aria-live="polite"
      title={detail}
      className="flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900/70 px-3 py-1.5 text-xs"
    >
      <span aria-hidden className={`size-2 rounded-full ${style.dot}`} />
      <span className={`font-medium ${style.text}`}>{style.label}</span>
      {status.state === "connected" && (
        <span className="hidden font-mono text-ink-400 sm:inline">{status.ai.model}</span>
      )}
      <span className="sr-only">: {detail}</span>
    </div>
  );
}
