import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_HOSPITAL_PARAMS, DEFAULT_TRAFFIC_PARAMS } from "@/lib/environments";
import { POST } from "./route";

/** Wraps a model answer in Ollama's /api/chat envelope. */
const ollamaReply = (content: unknown, status = 200) =>
  new Response(JSON.stringify({ message: { role: "assistant", content: typeof content === "string" ? content : JSON.stringify(content) } }), {
    status,
  });

const modelAnswer = (changes: object[], extra: object = {}) => ({
  understood: true,
  changes,
  explanation: "As requested.",
  clarificationQuestion: null,
  ...extra,
});

const post = (body: unknown) =>
  POST(new Request("http://localhost/api/interpret", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));

const trafficBody = (instruction: string, extra: object = {}) => ({
  environment: "traffic",
  currentParams: DEFAULT_TRAFFIC_PARAMS,
  instruction,
  ...extra,
});

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/interpret (Ollama mocked)", () => {
  it("returns a validated traffic proposal", async () => {
    fetchMock.mockResolvedValue(ollamaReply(modelAnswer([{ key: "mainGreenSec", previousValue: 30, proposedValue: 50, reason: "to 50" }])));
    const res = await post(trafficBody("Increase main road green signal to 50 seconds."));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ status: "proposal", changes: [{ key: "mainGreenSec", previousValue: 30, proposedValue: 50 }] });
    expect(json.changes).toHaveLength(1);
  });

  it("returns a validated hospital proposal", async () => {
    fetchMock.mockResolvedValue(ollamaReply(modelAnswer([{ key: "doctors", previousValue: 4, proposedValue: 6, reason: "add two" }])));
    const res = await post({ environment: "hospital", currentParams: DEFAULT_HOSPITAL_PARAMS, instruction: "Add two emergency doctors." });
    expect(await res.json()).toMatchObject({ status: "proposal", changes: [{ key: "doctors", proposedValue: 6 }] });
  });

  it("calls only the configured local Ollama with a key-restricted schema", async () => {
    fetchMock.mockResolvedValue(ollamaReply(modelAnswer([{ key: "mainGreenSec", previousValue: 30, proposedValue: 50, reason: "x" }])));
    await post(trafficBody("Increase main road green signal to 50 seconds."));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:11434/api/chat");
    const sent = JSON.parse(init.body);
    expect(sent.stream).toBe(false);
    expect(sent.format.properties.changes.items.properties.key.enum).toEqual(Object.keys(DEFAULT_TRAFFIC_PARAMS));
    expect(sent.messages[0].content).toContain("current=30");
  });

  it("asks for clarification on an ambiguous request", async () => {
    fetchMock.mockResolvedValue(ollamaReply(modelAnswer([{ key: "mainGreenSec", previousValue: 30, proposedValue: 40, reason: "guess" }])));
    const json = await (await post(trafficBody("Increase the green signal."))).json();
    expect(json.status).toBe("clarification");
    expect(json.question).toMatch(/main road.*cross street/);
  });

  it("sends the original request together with clarification answers", async () => {
    fetchMock.mockResolvedValue(ollamaReply(modelAnswer([{ key: "mainGreenSec", previousValue: 30, proposedValue: 45, reason: "x" }])));
    const clarifications = [
      { question: "Which signal?", answer: "the main road" },
      { question: "What value?", answer: "45 seconds" },
    ];
    const json = await (await post(trafficBody("Increase the green signal.", { clarifications }))).json();
    expect(json).toMatchObject({ status: "proposal", changes: [{ key: "mainGreenSec", proposedValue: 45 }] });
    const userMsg = JSON.parse(fetchMock.mock.calls[0][1].body).messages[1].content;
    expect(userMsg).toContain("Increase the green signal.");
    expect(userMsg).toContain("the main road");
    expect(userMsg).toContain("45 seconds");
  });

  it("rejects out-of-range and unknown-key proposals", async () => {
    fetchMock.mockResolvedValueOnce(ollamaReply(modelAnswer([{ key: "beds", previousValue: 12, proposedValue: 500, reason: "x" }])));
    const outOfRange = await (await post({ environment: "hospital", currentParams: DEFAULT_HOSPITAL_PARAMS, instruction: "Increase beds to 500." })).json();
    expect(outOfRange.status).toBe("rejected");

    fetchMock.mockResolvedValueOnce(ollamaReply(modelAnswer([{ key: "nurses", previousValue: 0, proposedValue: 5, reason: "x" }])));
    const unknown = await (await post({ environment: "hospital", currentParams: DEFAULT_HOSPITAL_PARAMS, instruction: "Add 5 nurses" })).json();
    expect(unknown.status).toBe("rejected");
  });

  it.each([
    ["non-JSON content", "Sure! Here are the changes..."],
    ["unexpected fields", { ...modelAnswer([]), predictedWaitTime: 12 }],
    ["incomplete change", modelAnswer([{ key: "mainGreenSec", proposedValue: 50 }])],
    ["wrong types", { understood: "yes", changes: [], explanation: 1, clarificationQuestion: null }],
  ])("returns 502 for malformed model output (%s)", async (_label, content) => {
    fetchMock.mockResolvedValue(ollamaReply(content));
    const res = await post(trafficBody("Increase main road green signal to 50 seconds."));
    expect(res.status).toBe(502);
    expect((await res.json()).code).toBe("ai_malformed");
  });

  it("returns 503 when Ollama is unreachable (no fake fallback)", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const res = await post(trafficBody("Increase main road green signal to 50 seconds."));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ code: "ai_unavailable" });
  });

  it("returns 504 on timeout", async () => {
    fetchMock.mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    expect((await post(trafficBody("Increase main road green signal to 50 seconds."))).status).toBe(504);
  });

  it("returns 502 when the model is missing or errors", async () => {
    fetchMock.mockResolvedValue(new Response('{"error":"model \\"llama3.2:3b\\" not found"}', { status: 404 }));
    const res = await post(trafficBody("Increase main road green signal to 50 seconds."));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain("ollama pull");
  });

  it("returns 502 when the model response is too large", async () => {
    fetchMock.mockResolvedValue(new Response("x".repeat(70 * 1024)));
    expect((await post(trafficBody("Increase main road green signal to 50 seconds."))).status).toBe(502);
  });

  it.each([
    ["unknown environment", { environment: "airport", currentParams: {}, instruction: "hello there" }],
    ["invalid current values", trafficBody("x y z", { currentParams: { ...DEFAULT_TRAFFIC_PARAMS, mainGreenSec: 999 } })],
    ["extra fields", trafficBody("Increase main green to 50", { ollamaUrl: "http://evil" })],
    ["empty instruction", trafficBody("  ")],
    ["overlong instruction", trafficBody("a".repeat(501))],
  ])("rejects an invalid request without calling the model (%s)", async (_label, body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects oversized and non-JSON bodies", async () => {
    expect((await post("not json")).status).toBe(400);
    expect((await post(trafficBody("x".repeat(9000)))).status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
