import { ENVIRONMENTS, type EnvironmentId } from "@/lib/environments";

/** System prompt listing exactly the allowed parameters, their ranges and current values. */
export function buildSystemPrompt(environment: EnvironmentId, current: Record<string, number>): string {
  const env = ENVIRONMENTS[environment];
  const params = Object.entries(env.specs)
    .map(
      ([key, s]) =>
        `- ${key}: ${s.label} (${s.description}) unit=${s.unit}, allowed ${s.min}-${s.max}${s.integer ? ", whole numbers only" : ""}, current=${current[key]}`,
    )
    .join("\n");

  return `You translate a user's request into parameter changes for a simplified "${env.name}" simulation.
You do NOT predict or describe simulation results. You only identify which parameters to change and to what value.

Parameters (use these exact keys):
${params}

Rules:
1. Only include parameters the user explicitly asks to change. Never change any other parameter.
2. previousValue must be the current value listed above.
3. proposedValue is the final value after the change. For relative requests ("add two", "increase by 10", "double"), compute it from the current value.
4. If the user asks for a value outside the allowed range, still return exactly the value the user asked for. Never clamp or adjust it.
5. If it is unclear which parameter the user means, or no amount is given, set understood=false, changes=[], and ask one short clarificationQuestion.
6. If the request is unrelated to these parameters, set understood=false, changes=[] and explain briefly.
7. explanation: one short sentence restating what the user asked for. No predictions.
8. reason: a few words quoting the user's intent.

Respond with JSON only, in this shape:
{"understood": true, "changes": [{"key": "...", "previousValue": 0, "proposedValue": 0, "reason": "..."}], "explanation": "...", "clarificationQuestion": null}`;
}

export function buildUserMessage(instruction: string, clarifications: { question: string; answer: string }[] = []): string {
  const turns = clarifications.map((c) => `You asked: ${c.question}\nUser answered: ${c.answer}`);
  return [`Request: ${instruction}`, ...turns].join("\n");
}

/** The user's own words (request plus any clarification answers), used for deterministic checks. */
export function userText(instruction: string, clarifications: { answer: string }[] = []): string {
  return [instruction, ...clarifications.map((c) => c.answer)].join(". ");
}

/** JSON schema passed to Ollama's structured-output `format`; keys are limited to this environment. */
export function modelOutputJsonSchema(environment: EnvironmentId) {
  return {
    type: "object",
    properties: {
      understood: { type: "boolean" },
      changes: {
        type: "array",
        maxItems: 8,
        items: {
          type: "object",
          properties: {
            key: { type: "string", enum: Object.keys(ENVIRONMENTS[environment].specs) },
            previousValue: { type: "number" },
            proposedValue: { type: "number" },
            reason: { type: "string" },
          },
          required: ["key", "previousValue", "proposedValue", "reason"],
          additionalProperties: false,
        },
      },
      explanation: { type: "string" },
      clarificationQuestion: { type: ["string", "null"] },
    },
    required: ["understood", "changes", "explanation", "clarificationQuestion"],
    additionalProperties: false,
  };
}
