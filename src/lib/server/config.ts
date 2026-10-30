import "server-only";

function positiveNumber(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return value !== undefined && Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Server-side configuration. Ollama is only ever called from API routes. */
export const config = {
  ollamaUrl: (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/+$/, ""),
  ollamaModel: process.env.OLLAMA_MODEL || "llama3.2:3b",
  ollamaTimeoutMs: positiveNumber(process.env.OLLAMA_TIMEOUT_MS, 60_000),
};
