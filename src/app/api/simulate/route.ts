import { SimulateRequestSchema, type SimulateError } from "@/lib/simulation/api";
import { runSimulation } from "@/lib/simulation/run";

const error = (status: number, body: SimulateError) => Response.json(body, { status });

/** Runs a deterministic simulation. No AI involvement: results come from explicit rules. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(400, { error: "Request body must be valid JSON." });
  }

  const parsed = SimulateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return error(400, {
      error: "Invalid simulation parameters.",
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  try {
    return Response.json(runSimulation(parsed.data));
  } catch (err) {
    console.error("Simulation failed", err);
    return error(500, { error: "The simulation failed to run." });
  }
}
