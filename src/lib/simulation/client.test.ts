import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_TRAFFIC_PARAMS } from "@/lib/environments";
import { requestSimulation } from "./client";

const request = { environment: "traffic" as const, params: DEFAULT_TRAFFIC_PARAMS };
const reply = (body: string, status: number) => vi.fn().mockResolvedValue(new Response(body, { status }));

afterEach(() => vi.unstubAllGlobals());

describe("requestSimulation error handling", () => {
  it("surfaces the server's message on a failed simulation, never a fabricated result", async () => {
    vi.stubGlobal("fetch", reply(JSON.stringify({ error: "The simulation failed to run." }), 500));
    await expect(requestSimulation(request)).rejects.toThrow("The simulation failed to run.");
  });

  it("includes field-level validation issues", async () => {
    vi.stubGlobal("fetch", reply(JSON.stringify({ error: "Invalid simulation parameters.", issues: [{ path: "params.mainGreenSec", message: "Too big" }] }), 400));
    await expect(requestSimulation(request)).rejects.toThrow(/params\.mainGreenSec: Too big/);
  });

  it("handles a non-JSON or empty response", async () => {
    vi.stubGlobal("fetch", reply("<html>Bad gateway</html>", 502));
    await expect(requestSimulation(request)).rejects.toThrow("Simulation request failed (502).");
    vi.stubGlobal("fetch", reply("", 200));
    await expect(requestSimulation(request)).rejects.toThrow();
  });

  it("handles the server being unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(requestSimulation(request)).rejects.toThrow(/Could not reach the simulation service/);
  });

  it("rejects a response for the wrong environment", async () => {
    vi.stubGlobal("fetch", reply(JSON.stringify({ environment: "hospital", result: {} }), 200));
    await expect(requestSimulation(request)).rejects.toThrow(/wrong environment/);
  });
});
