import type { HealthResponse } from "@/lib/health";
import { checkOllamaHealth } from "@/lib/server/ollama";

export async function GET() {
  const ai = await checkOllamaHealth();
  const body: HealthResponse = { status: ai.reachable && ai.modelAvailable ? "ok" : "degraded", ai };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
