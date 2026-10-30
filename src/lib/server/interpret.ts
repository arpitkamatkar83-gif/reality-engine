import "server-only";
import { buildSystemPrompt, buildUserMessage, modelOutputJsonSchema, userText } from "@/lib/interpret/prompt";
import { InterpretRequestSchema, ModelOutputSchema, type InterpretResult } from "@/lib/interpret/schema";
import { evaluateModelOutput } from "@/lib/interpret/validate";
import type { z } from "zod";
import { OllamaError, ollamaChatJson } from "./ollama";

type ValidRequest = z.output<typeof InterpretRequestSchema>;

/**
 * Turns a natural-language request into a validated parameter proposal.
 * The model only proposes; this function decides what is acceptable.
 */
export async function interpretRequest(request: ValidRequest): Promise<InterpretResult> {
  const { environment, currentParams, instruction, clarifications } = request;
  const raw = await ollamaChatJson(
    buildSystemPrompt(environment, currentParams),
    buildUserMessage(instruction, clarifications),
    modelOutputJsonSchema(environment),
  );

  const parsed = ModelOutputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new OllamaError("malformed", "The local AI's answer did not match the expected format.");
  }
  return evaluateModelOutput(environment, currentParams, userText(instruction, clarifications), parsed.data);
}
