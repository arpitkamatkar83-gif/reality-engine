import { describe, expect, it } from "vitest";
import {
  DEFAULT_HOSPITAL_PARAMS,
  DEFAULT_TRAFFIC_PARAMS,
  HospitalParamsSchema,
  TrafficParamsSchema,
} from "./environments";

describe("parameter schemas", () => {
  it("accepts the default values", () => {
    expect(TrafficParamsSchema.parse(DEFAULT_TRAFFIC_PARAMS)).toEqual(DEFAULT_TRAFFIC_PARAMS);
    expect(HospitalParamsSchema.parse(DEFAULT_HOSPITAL_PARAMS)).toEqual(DEFAULT_HOSPITAL_PARAMS);
  });

  it("rejects out-of-range values", () => {
    expect(TrafficParamsSchema.safeParse({ ...DEFAULT_TRAFFIC_PARAMS, mainGreenSec: 500 }).success).toBe(false);
    expect(HospitalParamsSchema.safeParse({ ...DEFAULT_HOSPITAL_PARAMS, doctors: 0 }).success).toBe(false);
  });

  it("rejects non-integers for integer fields", () => {
    expect(HospitalParamsSchema.safeParse({ ...DEFAULT_HOSPITAL_PARAMS, doctors: 4.5 }).success).toBe(false);
  });

  it("rejects unknown fields", () => {
    expect(TrafficParamsSchema.safeParse({ ...DEFAULT_TRAFFIC_PARAMS, speedLimit: 80 }).success).toBe(false);
  });
});
