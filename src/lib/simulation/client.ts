import type { EnvironmentId } from "@/lib/environments";
import type { SimulateError, SimulateRequestFor, SimulateResponseFor } from "./api";

/** Calls POST /api/simulate and returns the result, or throws an Error with a readable message. */
export async function requestSimulation<E extends EnvironmentId>(request: SimulateRequestFor<E>): Promise<SimulateResponseFor<E>> {
  let res: Response;
  try {
    res = await fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new Error("Could not reach the simulation service. Is the app server running?");
  }

  const body = (await res.json().catch(() => null)) as SimulateResponseFor<E> | SimulateError | null;
  if (!res.ok || !body || "error" in body) {
    const err = body && "error" in body ? body : null;
    const detail = err?.issues?.map((i) => `${i.path}: ${i.message}`).join("; ");
    throw new Error([err?.error ?? `Simulation request failed (${res.status}).`, detail].filter(Boolean).join(" "));
  }
  if (body.environment !== request.environment) throw new Error("Simulation service returned the wrong environment.");
  return body;
}
