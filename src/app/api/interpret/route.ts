import type { InterpretError } from "@/lib/interpret/schema";
import { InterpretRequestSchema } from "@/lib/interpret/schema";
import { interpretRequest } from "@/lib/server/interpret";
import { OllamaError, type OllamaErrorKind } from "@/lib/server/ollama";

const MAX_BODY_BYTES = 8 * 1024;

const ERROR_STATUS: Record<OllamaErrorKind, [number, InterpretError["code"]]> = {
  unavailable: [503, "ai_unavailable"],
  timeout: [504, "ai_timeout"],
  model_error: [502, "ai_error"],
  malformed: [502, "ai_malformed"],
};

const error = (status: number, body: InterpretError) => Response.json(body, { status });

/**
 * Interprets a natural-language scenario change with the local model. Returns a
 * proposal for the user to approve; it never runs a simulation or changes state.
 */
export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return error(413, { error: "Request is too large.", code: "invalid_request" });

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return error(400, { error: "Request body must be valid JSON.", code: "invalid_request" });
  }

  const parsed = InterpretRequestSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return error(400, { error: `Invalid request: ${first.path.join(".") || "body"} — ${first.message}`, code: "invalid_request" });
  }

  try {
    return Response.json(await interpretRequest(parsed.data));
  } catch (err) {
    if (err instanceof OllamaError) {
      // Log the failure kind only — never the user's text.
      console.warn(`interpret: ${err.kind}`);
      const [status, code] = ERROR_STATUS[err.kind];
      return error(status, { error: err.message, code });
    }
    console.error("interpret: unexpected failure", err instanceof Error ? err.name : "unknown");
    return error(500, { error: "Interpretation failed unexpectedly.", code: "ai_error" });
  }
}
