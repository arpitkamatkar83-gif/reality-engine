// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENVIRONMENT_VISUALS } from "@/components/dashboard/environmentVisuals";
import { DEFAULT_HOSPITAL_PARAMS, DEFAULT_TRAFFIC_PARAMS, type EnvironmentId } from "@/lib/environments";
import { ScenarioAssistant } from "./ScenarioAssistant";
import { useScenarioRunner } from "./useScenarioRunner";

/** Renders the assistant with a real scenario runner and exposes its state. */
function Harness({ environment }: { environment: EnvironmentId }) {
  const runner = useScenarioRunner(environment);
  return (
    <>
      <ScenarioAssistant runner={runner} theme={ENVIRONMENT_VISUALS[environment].theme} />
      <output data-testid="params">{JSON.stringify(runner.params)}</output>
      <output data-testid="ran">{runner.result ? "yes" : "no"}</output>
      <button type="button" onClick={() => runner.setParam("beds", 20)}>
        manual-beds
      </button>
    </>
  );
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const params = () => JSON.parse(screen.getByTestId("params").textContent!);
const urls = (mock: ReturnType<typeof vi.fn>) => mock.mock.calls.map((c) => c[0]);

const doctorsProposal = {
  status: "proposal",
  explanation: "Add two emergency doctors.",
  changes: [{ key: "doctors", label: "Emergency doctors", unit: "doctors", previousValue: 4, proposedValue: 6, reason: "add two" }],
  notes: [],
};

async function ask(text: string) {
  fireEvent.change(screen.getByLabelText("Describe a scenario change"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Interpret" }));
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ScenarioAssistant approval flow", () => {
  it("approving applies the proposal to the controls but does not run the simulation", async () => {
    fetchMock.mockResolvedValue(json(doctorsProposal));
    render(<Harness environment="hospital" />);
    await ask("Add two emergency doctors.");

    await screen.findByText("4 → 6 doctors");
    expect(params()).toEqual(DEFAULT_HOSPITAL_PARAMS); // nothing applied yet
    fireEvent.click(screen.getByRole("button", { name: "Approve changes" }));

    expect(params()).toEqual({ ...DEFAULT_HOSPITAL_PARAMS, doctors: 6 });
    expect(screen.getByText(/Review the controls, then run the simulation/)).toBeTruthy();
    expect(screen.getByTestId("ran").textContent).toBe("no");
    expect(urls(fetchMock)).toEqual(["/api/interpret"]); // never /api/simulate
  });

  it("rejecting discards the proposal and leaves every parameter unchanged", async () => {
    fetchMock.mockResolvedValue(json(doctorsProposal));
    render(<Harness environment="hospital" />);
    await ask("Add two emergency doctors.");
    await screen.findByText("4 → 6 doctors");

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(params()).toEqual(DEFAULT_HOSPITAL_PARAMS);
    expect(screen.queryByText("4 → 6 doctors")).toBeNull();
    expect(urls(fetchMock)).toEqual(["/api/interpret"]);
  });

  it("sends the current control values with the request", async () => {
    fetchMock.mockResolvedValue(json(doctorsProposal));
    render(<Harness environment="hospital" />);
    fireEvent.click(screen.getByText("manual-beds"));
    await ask("Add two emergency doctors.");
    await screen.findByText("4 → 6 doctors");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ environment: "hospital", instruction: "Add two emergency doctors.", clarifications: [] });
    expect(body.currentParams.beds).toBe(20);
  });

  it("blocks approval if the controls changed after the proposal was made", async () => {
    fetchMock.mockResolvedValue(json({ ...doctorsProposal, changes: [{ ...doctorsProposal.changes[0], key: "beds", label: "Treatment beds", unit: "beds", previousValue: 12, proposedValue: 14 }] }));
    render(<Harness environment="hospital" />);
    await ask("Add two beds");
    await screen.findByText("12 → 14 beds");
    fireEvent.click(screen.getByText("manual-beds"));
    expect((screen.getByRole("button", { name: "Approve changes" }) as HTMLButtonElement).disabled).toBe(true);
    expect(params().beds).toBe(20);
  });

  it("clarification keeps the original request and sends the answer with it", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ status: "clarification", question: "Which signal should change: the main road green or the cross street green?", explanation: "" }))
      .mockResolvedValueOnce(
        json({
          status: "proposal",
          explanation: "Main road green to 50.",
          changes: [{ key: "mainGreenSec", label: "Main road green duration", unit: "s", previousValue: 30, proposedValue: 50, reason: "" }],
          notes: [],
        }),
      );
    render(<Harness environment="traffic" />);
    await ask("Increase the green signal to 50 seconds");
    await screen.findByText(/Which signal should change/);
    expect(params()).toEqual(DEFAULT_TRAFFIC_PARAMS);

    fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "the main road" } });
    fireEvent.click(screen.getByRole("button", { name: "Send answer" }));
    await screen.findByText("30 → 50 s");

    const second = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(second.instruction).toBe("Increase the green signal to 50 seconds");
    expect(second.clarifications).toEqual([{ question: "Which signal should change: the main road green or the cross street green?", answer: "the main road" }]);
  });

  it("shows a rejection without changing anything", async () => {
    fetchMock.mockResolvedValue(
      json({ status: "rejected", explanation: "The requested value can't be applied.", issues: ["Treatment beds must be between 2 and 60 beds; 500 is outside that range."] }),
    );
    render(<Harness environment="hospital" />);
    await ask("Increase beds to 500.");
    await screen.findByText(/500 is outside that range/);
    expect(params()).toEqual(DEFAULT_HOSPITAL_PARAMS);
    expect(screen.queryByRole("button", { name: "Approve changes" })).toBeNull();
  });

  it("reports an unavailable local AI and keeps manual controls usable", async () => {
    fetchMock.mockResolvedValue(json({ error: "The local AI service (Ollama) is not reachable.", code: "ai_unavailable" }, 503));
    render(<Harness environment="traffic" />);
    await ask("Increase main road green to 50 seconds");
    await screen.findByText(/not reachable/);
    expect(screen.getByText(/You can still change parameters with the controls/)).toBeTruthy();
    expect(params()).toEqual(DEFAULT_TRAFFIC_PARAMS);
  });
});
