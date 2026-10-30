import type { InterpretError, InterpretRequest, InterpretResult } from "./schema";

export class InterpretRequestError extends Error {
  constructor(
    message: string,
    readonly code: InterpretError["code"] | "network",
  ) {
    super(message);
  }
}

/** Calls POST /api/interpret (which talks to the local model server-side). */
export async function requestInterpretation(request: InterpretRequest, signal?: AbortSignal): Promise<InterpretResult> {
  let res: Response;
  try {
    res = await fetch("/api/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new InterpretRequestError("Could not reach the app server.", "network");
  }
  const body = (await res.json().catch(() => null)) as InterpretResult | InterpretError | null;
  if (!res.ok || !body || "error" in body) {
    const err = body && "error" in body ? body : null;
    throw new InterpretRequestError(err?.error ?? `Interpretation failed (${res.status}).`, err?.code ?? "ai_error");
  }
  return body;
}
