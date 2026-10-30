import { z } from "zod";
import { PARAM_SCHEMAS, type EnvironmentId, type EnvironmentParams } from "@/lib/environments";
import type { HospitalResult } from "./hospital";
import type { TrafficResult } from "./traffic";

/** Request body for POST /api/simulate. Each environment validates its own parameters. */
export const SimulateRequestSchema = z.discriminatedUnion("environment", [
  z.object({ environment: z.literal("traffic"), params: PARAM_SCHEMAS.traffic }),
  z.object({ environment: z.literal("hospital"), params: PARAM_SCHEMAS.hospital }),
]);

export type SimulateRequest = z.infer<typeof SimulateRequestSchema>;

export interface EnvironmentResults {
  traffic: TrafficResult;
  hospital: HospitalResult;
}

export type SimulateRequestFor<E extends EnvironmentId> = { environment: E; params: EnvironmentParams[E] };
export type SimulateResponseFor<E extends EnvironmentId> = { environment: E; result: EnvironmentResults[E] };
export type SimulateResponse = { [E in EnvironmentId]: SimulateResponseFor<E> }[EnvironmentId];

export interface SimulateError {
  error: string;
  issues?: { path: string; message: string }[];
}
