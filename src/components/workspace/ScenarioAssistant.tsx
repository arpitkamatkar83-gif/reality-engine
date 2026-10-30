"use client";

import { useRef, useState, type FormEvent } from "react";
import type { EnvironmentTheme } from "@/components/dashboard/EnvironmentCard";
import { Card } from "@/components/ui/Card";
import { ENVIRONMENTS, type EnvironmentId } from "@/lib/environments";
import { InterpretRequestError, requestInterpretation } from "@/lib/interpret/client";
import { MAX_ANSWER_CHARS, MAX_CLARIFICATIONS, MAX_INSTRUCTION_CHARS, type ClarificationTurn, type InterpretRequest, type ProposedChange } from "@/lib/interpret/schema";
import type { ScenarioRunner } from "./useScenarioRunner";

type State =
  | { phase: "idle" }
  | { phase: "loading"; instruction: string; clarifications: ClarificationTurn[] }
  | { phase: "proposal"; instruction: string; explanation: string; changes: ProposedChange[]; notes: string[] }
  | { phase: "clarify"; instruction: string; clarifications: ClarificationTurn[]; question: string }
  | { phase: "rejected"; instruction: string; explanation: string; issues: string[] }
  | { phase: "error"; instruction: string; clarifications: ClarificationTurn[]; message: string; unavailable: boolean }
  | { phase: "applied"; changes: ProposedChange[] };

const EXTRA_EXAMPLES: Record<EnvironmentId, string[]> = {
  traffic: ["Add 5 more cars per minute on the cross street", "Increase the green signal"],
  hospital: ["Add two doctors but keep beds unchanged", "Reduce treatment time by 5 minutes"],
};

const formatChange = (c: ProposedChange) => `${c.previousValue} → ${c.proposedValue} ${c.unit}`;

/**
 * Natural-language scenario changes: the local model proposes, the user approves.
 * Approval only updates the controls; running the simulation stays a separate, explicit step.
 */
export function ScenarioAssistant<E extends EnvironmentId>({
  runner,
  theme,
  className = "",
}: {
  runner: ScenarioRunner<E>;
  theme: EnvironmentTheme;
  className?: string;
}) {
  const env = ENVIRONMENTS[runner.environment];
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState<State>({ phase: "idle" });
  const abort = useRef<AbortController | null>(null);
  const busy = state.phase === "loading";

  async function interpret(instruction: string, clarifications: ClarificationTurn[]) {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setState({ phase: "loading", instruction, clarifications });
    try {
      const result = await requestInterpretation(
        { environment: runner.environment, currentParams: runner.params, instruction, clarifications } as InterpretRequest,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      if (result.status === "proposal") setState({ phase: "proposal", instruction, ...result });
      else if (result.status === "clarification") {
        if (clarifications.length >= MAX_CLARIFICATIONS) {
          setState({ phase: "rejected", instruction, explanation: "The request is still unclear. Please rephrase it with the setting and value.", issues: [] });
        } else {
          setState({ phase: "clarify", instruction, clarifications, question: result.question });
        }
      } else setState({ phase: "rejected", instruction, explanation: result.explanation, issues: result.issues });
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : "Interpretation failed.";
      const unavailable = err instanceof InterpretRequestError && (err.code === "ai_unavailable" || err.code === "ai_timeout");
      setState({ phase: "error", instruction, clarifications, message, unavailable });
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (text.length >= 3 && !busy) void interpret(text, []);
  }

  function reply(e: FormEvent) {
    e.preventDefault();
    if (state.phase !== "clarify" || !answer.trim()) return;
    const turns = [...state.clarifications, { question: state.question, answer: answer.trim() }];
    setAnswer("");
    void interpret(state.instruction, turns);
  }

  function cancel() {
    abort.current?.abort();
    setState({ phase: "idle" });
  }

  // Controls edited after the proposal was made: values may no longer match, so require a fresh interpretation.
  const outdated =
    state.phase === "proposal" &&
    state.changes.some((c) => (runner.params as Record<string, number>)[c.key] !== c.previousValue);

  function approve() {
    if (state.phase !== "proposal" || outdated) return;
    runner.applyChanges(state.changes.map((c) => ({ key: c.key, value: c.proposedValue })));
    setState({ phase: "applied", changes: state.changes });
    setInput("");
  }

  return (
    <Card className={`p-5 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={`font-mono text-xs uppercase tracking-[0.16em] ${theme.accentText}`}>Describe a change</h2>
        <span className="text-[11px] text-ink-400">Interpreted by a local Llama model · nothing changes without your approval</span>
      </div>

      <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`assistant-${env.id}`} className="sr-only">
          Describe a scenario change
        </label>
        <input
          id={`assistant-${env.id}`}
          value={input}
          maxLength={MAX_INSTRUCTION_CHARS}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`e.g. “${env.exampleRequest}”`}
          disabled={busy}
          className="min-w-0 flex-1 rounded-xl border border-ink-700 bg-ink-950/60 px-4 py-2.5 text-sm outline-none placeholder:text-ink-400 focus:border-accent disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || input.trim().length < 3}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${theme.button}`}
        >
          {busy ? "Interpreting…" : "Interpret"}
        </button>
      </form>

      {state.phase === "idle" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {[env.exampleRequest, ...EXTRA_EXAMPLES[env.id]].map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setInput(ex)}
              className="rounded-full border border-ink-700 px-3 py-1 text-[11px] text-ink-300 transition hover:border-ink-600 hover:text-ink-100"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      <div aria-live="polite">
        {state.phase === "loading" && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-ink-700 bg-ink-950/40 px-4 py-3 text-sm text-ink-300">
            <span className="flex items-center gap-2">
              <span className={`size-3 animate-spin rounded-full border-2 border-t-transparent ${theme.spinner}`} />
              Interpreting “{state.instruction}” with the local model…
            </span>
            <button type="button" onClick={cancel} className="text-xs text-ink-400 hover:text-ink-100">
              Cancel
            </button>
          </div>
        )}

        {state.phase === "proposal" && (
          <div className="mt-4 space-y-3 rounded-xl border border-accent/30 bg-accent/5 p-4">
            <div>
              <p className="text-xs text-ink-400">Proposed changes for “{state.instruction}”</p>
              <p className="mt-1 text-sm text-ink-100">{state.explanation}</p>
            </div>
            <ul className="divide-y divide-ink-800 rounded-lg border border-ink-800 bg-ink-950/40">
              {state.changes.map((c) => (
                <li key={c.key} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm">
                  <span className="text-ink-100">{c.label}</span>
                  <span className="font-mono tabular-nums text-accent">{formatChange(c)}</span>
                  {c.reason && <span className="w-full text-[11px] text-ink-400">“{c.reason}”</span>}
                </li>
              ))}
            </ul>
            {state.notes.map((n) => (
              <p key={n} className="text-xs text-warning">
                {n}
              </p>
            ))}
            <p className="text-[11px] text-ink-400">All other parameters stay as they are. Approving updates the controls only; you run the simulation yourself.</p>
            {outdated && <p className="text-xs text-warning">The controls changed after this proposal was made. Submit the request again.</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={approve}
                disabled={outdated || runner.running}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${theme.button}`}
              >
                Approve changes
              </button>
              <button
                type="button"
                onClick={() => setState({ phase: "idle" })}
                className="rounded-lg border border-ink-700 px-4 py-2 text-sm text-ink-300 transition hover:text-ink-100"
              >
                Reject
              </button>
            </div>
          </div>
        )}

        {state.phase === "clarify" && (
          <form onSubmit={reply} className="mt-4 space-y-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
            <p className="text-xs text-ink-400">Request: “{state.instruction}”</p>
            {state.clarifications.map((c) => (
              <p key={c.question} className="text-xs text-ink-400">
                {c.question} <span className="text-ink-100">— {c.answer}</span>
              </p>
            ))}
            <p className="text-sm text-warning">{state.question}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                aria-label="Your answer"
                autoFocus
                value={answer}
                maxLength={MAX_ANSWER_CHARS}
                onChange={(e) => setAnswer(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-ink-700 bg-ink-950/60 px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <button type="submit" disabled={!answer.trim()} className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${theme.button}`}>
                Send answer
              </button>
              <button type="button" onClick={cancel} className="rounded-lg border border-ink-700 px-4 py-2 text-sm text-ink-300 hover:text-ink-100">
                Cancel
              </button>
            </div>
          </form>
        )}

        {state.phase === "rejected" && (
          <div className="mt-4 space-y-2 rounded-xl border border-negative/30 bg-negative/5 p-4 text-sm">
            <p className="text-xs text-ink-400">Request: “{state.instruction}”</p>
            <p className="text-negative">{state.explanation}</p>
            {state.issues.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-xs text-ink-300">
                {state.issues.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-ink-400">No parameters were changed.</p>
            <button type="button" onClick={() => { setInput(state.instruction); setState({ phase: "idle" }); }} className="text-xs text-ink-300 underline-offset-2 hover:text-ink-100 hover:underline">
              Edit request
            </button>
          </div>
        )}

        {state.phase === "error" && (
          <div role="alert" className="mt-4 space-y-2 rounded-xl border border-negative/30 bg-negative/5 p-4 text-sm">
            <p className="text-negative">{state.message}</p>
            <p className="text-[11px] text-ink-400">
              {state.unavailable ? "The local AI is unavailable. You can still change parameters with the controls below." : "No parameters were changed."}
            </p>
            <div className="flex gap-3 text-xs">
              <button type="button" onClick={() => interpret(state.instruction, state.clarifications)} className="text-ink-300 hover:text-ink-100">
                Try again
              </button>
              <button type="button" onClick={() => setState({ phase: "idle" })} className="text-ink-400 hover:text-ink-100">
                Dismiss
              </button>
            </div>
          </div>
        )}

        {state.phase === "applied" && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-positive/30 bg-positive/5 px-4 py-3 text-sm">
            <span className="text-positive">
              Applied {state.changes.map((c) => `${c.label.toLowerCase()} ${formatChange(c)}`).join(", ")}. Review the controls, then run the simulation.
            </span>
            <button type="button" onClick={() => setState({ phase: "idle" })} className="text-xs text-ink-400 hover:text-ink-100">
              Dismiss
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
