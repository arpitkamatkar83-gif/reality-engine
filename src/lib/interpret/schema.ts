import { z } from "zod";
import { PARAM_SCHEMAS } from "@/lib/environments";

export const MAX_INSTRUCTION_CHARS = 500;
export const MAX_ANSWER_CHARS = 300;
export const MAX_CLARIFICATIONS = 3;

export const Clarification = z.strictObject({
  question: z.string().trim().min(1).max(400),
  answer: z.string().trim().min(1).max(MAX_ANSWER_CHARS),
});

const instruction = z.string().trim().min(3, "Describe the change you want.").max(MAX_INSTRUCTION_CHARS);

/** POST /api/interpret body. Current values are validated against the environment's own schema. */
export const InterpretRequestSchema = z.discriminatedUnion("environment", [
  z.strictObject({
    environment: z.literal("traffic"),
    currentParams: PARAM_SCHEMAS.traffic,
    instruction,
    clarifications: z.array(Clarification).max(MAX_CLARIFICATIONS).default([]),
  }),
  z.strictObject({
    environment: z.literal("hospital"),
    currentParams: PARAM_SCHEMAS.hospital,
    instruction,
    clarifications: z.array(Clarification).max(MAX_CLARIFICATIONS).default([]),
  }),
]);

export type InterpretRequest = z.input<typeof InterpretRequestSchema>;
export type ClarificationTurn = z.infer<typeof Clarification>;

/**
 * What the model must return. Strict: unexpected fields are rejected. Keys are plain
 * strings here so unknown keys can be reported specifically rather than as malformed.
 */
export const ModelOutputSchema = z.strictObject({
  understood: z.boolean(),
  changes: z
    .array(
      z.strictObject({
        key: z.string().min(1).max(64),
        previousValue: z.number().finite(),
        proposedValue: z.number().finite(),
        reason: z.string().max(300),
      }),
    )
    .max(8),
  explanation: z.string().max(600),
  clarificationQuestion: z.string().max(400).nullable(),
});

export type ModelOutput = z.infer<typeof ModelOutputSchema>;

export interface ProposedChange {
  key: string;
  label: string;
  unit: string;
  previousValue: number;
  proposedValue: number;
  reason: string;
}

/** What /api/interpret returns. Only "proposal" can be applied, and only after user approval. */
export type InterpretResult =
  | {
      status: "proposal";
      explanation: string;
      changes: ProposedChange[];
      /** Parameters the user mentioned that the AI did not include, so nothing is silently dropped. */
      notes: string[];
    }
  | { status: "clarification"; question: string; explanation: string }
  | { status: "rejected"; explanation: string; issues: string[] };

export interface InterpretError {
  error: string;
  code: "invalid_request" | "ai_unavailable" | "ai_timeout" | "ai_error" | "ai_malformed";
}
