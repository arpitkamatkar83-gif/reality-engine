import { describe, expect, it } from "vitest";
import { DEFAULT_HOSPITAL_PARAMS, DEFAULT_TRAFFIC_PARAMS } from "@/lib/environments";
import type { ModelOutput } from "./schema";
import { evaluateModelOutput, frozenKeys, hasQuantity } from "./validate";

const out = (changes: ModelOutput["changes"], extra: Partial<ModelOutput> = {}): ModelOutput => ({
  understood: true,
  changes,
  explanation: "test",
  clarificationQuestion: null,
  ...extra,
});
const change = (key: string, previousValue: number, proposedValue: number) => ({ key, previousValue, proposedValue, reason: "r" });
const traffic = (text: string, o: ModelOutput) => evaluateModelOutput("traffic", DEFAULT_TRAFFIC_PARAMS, text, o);
const hospital = (text: string, o: ModelOutput) => evaluateModelOutput("hospital", DEFAULT_HOSPITAL_PARAMS, text, o);

describe("evaluateModelOutput", () => {
  it("accepts a valid traffic change and reports the real previous value", () => {
    const r = traffic("Increase the main road green signal to 50 seconds.", out([change("mainGreenSec", 30, 50)]));
    expect(r).toMatchObject({ status: "proposal", changes: [{ key: "mainGreenSec", previousValue: 30, proposedValue: 50 }], notes: [] });
  });

  it("accepts a valid hospital change", () => {
    const r = hospital("Add two emergency doctors.", out([change("doctors", 4, 6)]));
    expect(r).toMatchObject({ status: "proposal", changes: [{ key: "doctors", previousValue: 4, proposedValue: 6 }] });
  });

  it("drops changes to parameters the user never mentioned", () => {
    const r = hospital("Add two emergency doctors.", out([change("doctors", 4, 6), change("beds", 12, 14)]));
    expect(r.status).toBe("proposal");
    if (r.status === "proposal") expect(r.changes.map((c) => c.key)).toEqual(["doctors"]);
  });

  it("keeps parameters the user asked to leave unchanged", () => {
    expect([...frozenKeys("hospital", "add two doctors but keep beds unchanged")]).toEqual(["beds"]);
    const r = hospital("Add two doctors but keep beds unchanged", out([change("doctors", 4, 6), change("beds", 12, 20)]));
    if (r.status !== "proposal") throw new Error(r.status);
    expect(r.changes.map((c) => c.key)).toEqual(["doctors"]);
    expect(r.notes).toEqual([]);
  });

  it("only freezes the road the user named", () => {
    expect([...frozenKeys("traffic", "set main road green to 50 and keep the cross street green unchanged")]).toEqual(["crossGreenSec"]);
  });

  it("rejects unknown parameter names", () => {
    const r = traffic("Set the speed limit to 80", out([change("speedLimit", 50, 80)]));
    expect(r).toMatchObject({ status: "rejected" });
    if (r.status === "rejected") expect(r.issues[0]).toContain("speedLimit");
  });

  it("rejects out-of-range values instead of clamping them", () => {
    const r = hospital("Set doctors to 500", out([change("doctors", 4, 500)]));
    expect(r.status).toBe("rejected");
    if (r.status === "rejected") expect(r.issues[0]).toMatch(/between 1 and 20.*500/);
  });

  it("catches a model that silently clamped an out-of-range request", () => {
    const r = hospital("Increase beds to 500.", out([change("beds", 12, 60)]));
    expect(r.status).toBe("rejected");
    if (r.status === "rejected") expect(r.issues[0]).toMatch(/500 is outside/);
  });

  it("rejects decimals for whole-number parameters", () => {
    const r = hospital("Set doctors to 5.5", out([change("doctors", 4, 5.5)]));
    expect(r.status).toBe("rejected");
    if (r.status === "rejected") expect(r.issues[0]).toMatch(/whole number/);
  });

  it("rejects duplicate changes to the same parameter", () => {
    expect(hospital("Add 2 doctors", out([change("doctors", 4, 6), change("doctors", 4, 7)])).status).toBe("rejected");
  });

  it("rejects a proposal based on a misread current value", () => {
    expect(hospital("Add two doctors", out([change("doctors", 5, 7)])).status).toBe("rejected");
  });

  it("asks which road for an ambiguous green-signal request, even if the model guessed", () => {
    const r = traffic("Increase the green signal.", out([change("mainGreenSec", 30, 40)]));
    expect(r).toEqual({
      status: "clarification",
      question: "Which signal should change: the main road green or the cross street green?",
      explanation: "test",
    });
  });

  it("asks for an amount instead of inventing one", () => {
    expect(hasQuantity("increase the main road green")).toBe(false);
    expect(hasQuantity("add a doctor")).toBe(true);
    expect(hasQuantity("add two doctors")).toBe(true);
    const r = traffic("Increase the main road green", out([change("mainGreenSec", 30, 40)]));
    expect(r.status).toBe("clarification");
  });

  it("passes through the model's own clarifying question", () => {
    const r = hospital("make it better", out([], { understood: false, clarificationQuestion: "Which setting should change?" }));
    expect(r).toMatchObject({ status: "clarification", question: "Which setting should change?" });
  });

  it("treats a non-question as a rejection rather than a clarification", () => {
    const r = traffic("Set the speed limit to 80", out([], { understood: false, clarificationQuestion: "Speed limit is not a parameter" }));
    expect(r).toMatchObject({ status: "rejected", explanation: "Speed limit is not a parameter" });
  });

  it("notes a mentioned parameter the model left out", () => {
    const r = traffic("Use two lanes and set the cross street green to 40 seconds", out([change("lanesPerApproach", 1, 2)]));
    if (r.status !== "proposal") throw new Error(r.status);
    expect(r.notes).toHaveLength(1);
    expect(r.notes[0]).toContain("cross street green");
  });

  it("never shows internal parameter keys to the user", () => {
    const r = traffic("Use two lanes", { ...out([change("lanesPerApproach", 1, 2)]), explanation: "Set lanesPerApproach to 2" });
    if (r.status !== "proposal") throw new Error(r.status);
    expect(r.explanation).toBe("Set lanes per approach to 2");
    const h = hospital("Add two emergency doctors.", { ...out([change("doctors", 4, 6)]), explanation: "Add two emergency doctors." });
    if (h.status !== "proposal") throw new Error(h.status);
    expect(h.explanation).toBe("Add two emergency doctors.");
  });

  it("reports nothing to change when values already match", () => {
    expect(traffic("Set main road green to 30 seconds", out([change("mainGreenSec", 30, 30)])).status).toBe("rejected");
  });
});
