import "server-only";
import { z } from "zod";
import type { AiHealth } from "@/lib/health";
import { config } from "./config";

const TagsResponseSchema = z.object({
  models: z.array(z.object({ name: z.string() })),
});

/** Checks that the local Ollama server is up and the configured model is pulled. */
export async function checkOllamaHealth(): Promise<AiHealth> {
  const model = config.ollamaModel;
  try {
    const res = await fetch(`${config.ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!res.ok) {
      return { reachable: false, model, modelAvailable: false, error: `Ollama responded ${res.status}` };
    }
    const tags = TagsResponseSchema.parse(await res.json());
    const modelAvailable = tags.models.some((m) => m.name === model);
    return {
      reachable: true,
      model,
      modelAvailable,
      ...(modelAvailable ? {} : { error: `Model "${model}" not found. Run: ollama pull ${model}` }),
    };
  } catch {
    return {
      reachable: false,
      model,
      modelAvailable: false,
      error: `Cannot reach Ollama at ${config.ollamaUrl}. Is "ollama serve" running?`,
    };
  }
}

export type OllamaErrorKind = "unavailable" | "timeout" | "model_error" | "malformed";

export class OllamaError extends Error {
  constructor(
    readonly kind: OllamaErrorKind,
    message: string,
  ) {
    super(message);
  }
}

/** Upper bound on the raw Ollama response we are willing to read. */
export const MAX_RESPONSE_BYTES = 64 * 1024;

const ChatResponseSchema = z.object({
  message: z.object({ content: z.string() }),
});

/**
 * Sends a chat request to the configured local model and returns the parsed JSON
 * content. The URL and model come only from server config, never from user or
 * model input. Throws OllamaError on any failure; there is no fallback output.
 */
export async function ollamaChatJson(system: string, user: string, format: object): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${config.ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(config.ollamaTimeoutMs),
      body: JSON.stringify({
        model: config.ollamaModel,
        stream: false,
        format,
        options: { temperature: 0, seed: 7, num_predict: 512 },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new OllamaError("timeout", `The local AI did not respond within ${Math.round(config.ollamaTimeoutMs / 1000)} seconds.`);
    }
    throw new OllamaError("unavailable", "The local AI service (Ollama) is not reachable. Start it with \"ollama serve\".");
  }

  const raw = await readLimited(res);
  if (!res.ok) {
    const notFound = res.status === 404 && raw.includes("not found");
    throw new OllamaError(
      "model_error",
      notFound ? `Model "${config.ollamaModel}" is not installed. Run: ollama pull ${config.ollamaModel}` : `The local AI returned an error (${res.status}).`,
    );
  }

  try {
    const envelope = ChatResponseSchema.parse(JSON.parse(raw));
    return JSON.parse(envelope.message.content);
  } catch {
    throw new OllamaError("malformed", "The local AI returned a response that was not valid JSON.");
  }
}

async function readLimited(res: Response): Promise<string> {
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_RESPONSE_BYTES) throw new OllamaError("malformed", "The local AI response was too large.");
  const text = await res.text();
  if (text.length > MAX_RESPONSE_BYTES) throw new OllamaError("malformed", "The local AI response was too large.");
  return text;
}
