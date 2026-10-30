import type { SimulateRequest, SimulateResponse } from "./api";
import { simulateHospital } from "./hospital";
import { simulateTraffic } from "./traffic";

/** Dispatches a validated request to its environment's deterministic engine. */
export function runSimulation(request: SimulateRequest): SimulateResponse {
  switch (request.environment) {
    case "traffic":
      return { environment: "traffic", result: simulateTraffic(request.params) };
    case "hospital":
      return { environment: "hospital", result: simulateHospital(request.params) };
  }
}
