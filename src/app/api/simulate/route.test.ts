import { describe, expect, it } from "vitest";
import { DEFAULT_HOSPITAL_PARAMS, DEFAULT_TRAFFIC_PARAMS } from "@/lib/environments";
import { POST } from "./route";

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/simulate", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

describe("POST /api/simulate", () => {
  it("runs a valid traffic scenario", async () => {
    const res = await post({ environment: "traffic", params: DEFAULT_TRAFFIC_PARAMS });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.environment).toBe("traffic");
    expect(json.result.timeline).toHaveLength(600);
  });

  it("rejects out-of-range parameters with field-level issues", async () => {
    const res = await post({ environment: "traffic", params: { ...DEFAULT_TRAFFIC_PARAMS, mainGreenSec: 999 } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.issues[0].path).toBe("params.mainGreenSec");
  });

  it("rejects unknown fields and unknown environments", async () => {
    expect((await post({ environment: "traffic", params: { ...DEFAULT_TRAFFIC_PARAMS, speed: 1 } })).status).toBe(400);
    expect((await post({ environment: "airport", params: {} })).status).toBe(400);
  });

  it("runs a valid hospital scenario", async () => {
    const res = await post({ environment: "hospital", params: { ...DEFAULT_HOSPITAL_PARAMS, doctors: 6 } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.environment).toBe("hospital");
    expect(json.result.params.doctors).toBe(6);
    expect(json.result.timeline).toHaveLength(600);
  });

  it("validates hospital parameters against the hospital schema", async () => {
    const res = await post({ environment: "hospital", params: { ...DEFAULT_HOSPITAL_PARAMS, doctors: 50 } });
    expect(res.status).toBe(400);
    expect((await res.json()).issues[0].path).toBe("params.doctors");
    // Traffic parameters are not accepted for the hospital environment.
    expect((await post({ environment: "hospital", params: DEFAULT_TRAFFIC_PARAMS })).status).toBe(400);
  });

  it("rejects malformed JSON", async () => {
    expect((await post("{not json")).status).toBe(400);
  });
});
