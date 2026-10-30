import { ENVIRONMENTS, type EnvironmentId } from "@/lib/environments";
import type { ParamSpec } from "@/lib/params";
import type { InterpretResult, ModelOutput, ProposedChange } from "./schema";

const NUMBER_WORDS = [
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "fifteen", "twenty", "thirty", "forty", "fifty", "hundred",
  "double", "twice", "triple", "half", "halve",
];

const words = (text: string) => new Set(text.toLowerCase().match(/[a-z]+/g) ?? []);

/** "yes": every group matched; "topic": only the first group matched; "no": not mentioned. */
export function mentionLevel(spec: ParamSpec, text: string): "yes" | "topic" | "no" {
  if (!spec.mentions?.length) return "yes";
  const w = words(text);
  const hit = spec.mentions.map((group) => group.some((g) => w.has(g)));
  if (hit.every(Boolean)) return "yes";
  return hit[0] ? "topic" : "no";
}

/** True when the request states an amount: a number, a number word, or "a/an/another <noun>". */
export function hasQuantity(text: string): boolean {
  if (/\d/.test(text)) return true;
  const w = words(text);
  if (NUMBER_WORDS.some((n) => w.has(n))) return true;
  return /\b(a|an|another|one more)\s+(\w+\s+)?(doctor|physician|bed|lane|minute|second)s?\b/i.test(text);
}

const FREEZE = /\b(keep|keeping|leave|leaving|unchanged|same|don't|dont|do not|without changing|not change|no change)\b/i;

/** Parameters the user explicitly asked to keep, e.g. "add two doctors but keep beds unchanged". */
export function frozenKeys(environment: EnvironmentId, text: string): Set<string> {
  const specs = ENVIRONMENTS[environment].specs;
  const frozen = new Set<string>();
  for (const clause of text.split(/[,.;]|\band\b|\bbut\b/i)) {
    if (!FREEZE.test(clause)) continue;
    for (const [key, spec] of Object.entries(specs)) if (mentionLevel(spec, clause) === "yes") frozen.add(key);
  }
  return frozen;
}

const numbersIn = (text: string) => (text.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

const fmt = (n: number, spec: ParamSpec) => `${n} ${spec.unit}`;

/**
 * Replaces internal camelCase parameter keys (e.g. lanesPerApproach) in model-written
 * text with their labels. Plain-word keys such as "doctors" are ordinary English and left alone.
 */
function humanize(text: string, environment: EnvironmentId): string {
  let out = text.trim();
  for (const [key, spec] of Object.entries(ENVIRONMENTS[environment].specs)) {
    if (!/[A-Z]/.test(key)) continue;
    out = out.replace(new RegExp(`\\b${key}\\b`, "g"), spec.label.toLowerCase());
  }
  return out;
}

/**
 * Deterministic checks on the model's output. The model never has the final say:
 * every change must use a known key, a valid in-range value and a parameter the
 * user actually mentioned. Ambiguity becomes a clarifying question, never a guess.
 */
export function evaluateModelOutput(
  environment: EnvironmentId,
  current: Record<string, number>,
  requestText: string,
  output: ModelOutput,
): InterpretResult {
  const specs = ENVIRONMENTS[environment].specs;
  output = {
    ...output,
    explanation: humanize(output.explanation, environment),
    clarificationQuestion: output.clarificationQuestion && humanize(output.clarificationQuestion, environment),
    changes: output.changes.map((c) => ({ ...c, reason: humanize(c.reason, environment) })),
  };

  if (!output.understood || output.changes.length === 0) {
    const question = output.clarificationQuestion?.trim();
    // Only a real question keeps the conversation going; a statement means "can't do this".
    return question?.endsWith("?")
      ? { status: "clarification", question, explanation: output.explanation }
      : question
        ? { status: "rejected", explanation: question, issues: [] }
      : { status: "rejected", explanation: output.explanation || "The request could not be mapped to this simulation's parameters.", issues: [] };
  }

  // 1. Structural checks: known keys, no duplicates.
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const c of output.changes) {
    if (!(c.key in specs)) issues.push(`"${c.key}" is not a parameter of this simulation.`);
    else if (seen.has(c.key)) issues.push(`${specs[c.key].label} was proposed more than once.`);
    seen.add(c.key);
  }
  if (issues.length) return { status: "rejected", explanation: "The AI proposed changes this simulation does not support.", issues };

  // 2. Only parameters the user mentioned and did not ask to keep; ambiguous mentions become a question.
  const frozen = frozenKeys(environment, requestText);
  const relevant = [];
  for (const c of output.changes) {
    if (frozen.has(c.key)) continue;
    const spec = specs[c.key];
    const level = mentionLevel(spec, requestText);
    if (level === "topic") {
      return { status: "clarification", question: spec.clarify ?? `Did you mean ${spec.label}?`, explanation: output.explanation };
    }
    if (level === "yes") relevant.push(c);
  }
  if (relevant.length === 0) {
    return {
      status: "clarification",
      question: "Which setting would you like to change? " + Object.values(specs).map((s) => s.label).join(", ") + ".",
      explanation: output.explanation,
    };
  }

  // 3. An amount must be stated; otherwise ask rather than invent one.
  if (!hasQuantity(requestText)) {
    const spec = specs[relevant[0].key];
    return {
      status: "clarification",
      question: `What should ${spec.label.toLowerCase()} be? It is currently ${fmt(current[relevant[0].key], spec)} (allowed ${spec.min}–${spec.max}).`,
      explanation: output.explanation,
    };
  }

  // 4. Values: valid, in range, not silently clamped, based on the real current value.
  const requested = numbersIn(requestText);
  const changes: ProposedChange[] = [];
  for (const c of relevant) {
    const spec = specs[c.key];
    const value = c.proposedValue;
    if (c.previousValue !== current[c.key]) {
      issues.push(`The AI misread the current ${spec.label.toLowerCase()} (${c.previousValue} instead of ${current[c.key]}). Please try again.`);
      continue;
    }
    const outside = requested.find((n) => n < spec.min || n > spec.max);
    if (value < spec.min || value > spec.max) {
      issues.push(`${spec.label} must be between ${spec.min} and ${spec.max} ${spec.unit}; ${value} is outside that range.`);
    } else if (outside !== undefined && (value === spec.min || value === spec.max) && relevant.length === 1) {
      // The model capped an out-of-range request instead of reporting it.
      issues.push(`${spec.label} must be between ${spec.min} and ${spec.max} ${spec.unit}; ${outside} is outside that range.`);
    } else if (spec.integer && !Number.isInteger(value)) {
      issues.push(`${spec.label} must be a whole number; ${value} is not.`);
    } else if (value !== current[c.key]) {
      changes.push({
        key: c.key,
        label: spec.label,
        unit: spec.unit,
        previousValue: current[c.key],
        proposedValue: value,
        reason: c.reason.trim().slice(0, 200),
      });
    }
  }

  if (issues.length) {
    return { status: "rejected", explanation: "The requested value can't be applied. Nothing was changed.", issues };
  }
  if (changes.length === 0) {
    return { status: "rejected", explanation: "Those parameters already have the requested values. Nothing to change.", issues: [] };
  }
  const proposedKeys = new Set(relevant.map((c) => c.key));
  const notes = Object.entries(specs)
    .filter(([key, spec]) => !proposedKeys.has(key) && !frozen.has(key) && mentionLevel(spec, requestText) === "yes")
    .map(([, spec]) => `You also mentioned ${spec.label.toLowerCase()}, but the AI did not propose a change to it. Adjust it manually or submit it as a separate request.`);
  return { status: "proposal", explanation: output.explanation, changes, notes };
}
