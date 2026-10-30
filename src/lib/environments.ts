import { z } from "zod";
import { buildParamSchema, defaultValues, type ParamSpecs, type ParamValues } from "./params";

export const ENVIRONMENT_IDS = ["traffic", "hospital"] as const;
export const EnvironmentIdSchema = z.enum(ENVIRONMENT_IDS);
export type EnvironmentId = z.infer<typeof EnvironmentIdSchema>;

export const trafficParamSpecs = {
  mainGreenSec: {
    label: "Main road green duration",
    unit: "s",
    description: "Green signal time per cycle for the north–south main road.",
    min: 10,
    max: 120,
    step: 5,
    default: 30,
    integer: true,
    mentions: [["green", "signal", "signals", "light", "lights", "phase"], ["main", "primary", "major", "north", "south", "northbound", "southbound"]],
    clarify: "Which signal should change: the main road green or the cross street green?",
  },
  crossGreenSec: {
    label: "Cross street green duration",
    unit: "s",
    description: "Green signal time per cycle for the east–west cross street.",
    min: 10,
    max: 120,
    step: 5,
    default: 30,
    integer: true,
    mentions: [["green", "signal", "signals", "light", "lights", "phase"], ["cross", "side", "minor", "east", "west", "eastbound", "westbound"]],
    clarify: "Which signal should change: the main road green or the cross street green?",
  },
  mainArrivalsPerMin: {
    label: "Main road arrivals",
    unit: "veh/min",
    description: "Vehicles arriving per minute on the main road (both directions).",
    min: 1,
    max: 60,
    step: 1,
    default: 20,
    integer: true,
    mentions: [["arrival", "arrivals", "arriving", "vehicle", "vehicles", "car", "cars", "traffic", "demand", "volume", "flow"], ["main", "primary", "major", "north", "south", "northbound", "southbound"]],
    clarify: "Which road's vehicle arrivals should change: the main road or the cross street?",
  },
  crossArrivalsPerMin: {
    label: "Cross street arrivals",
    unit: "veh/min",
    description: "Vehicles arriving per minute on the cross street (both directions).",
    min: 1,
    max: 60,
    step: 1,
    default: 12,
    integer: true,
    mentions: [["arrival", "arrivals", "arriving", "vehicle", "vehicles", "car", "cars", "traffic", "demand", "volume", "flow"], ["cross", "side", "minor", "east", "west", "eastbound", "westbound"]],
    clarify: "Which road's vehicle arrivals should change: the main road or the cross street?",
  },
  lanesPerApproach: {
    label: "Lanes per approach",
    unit: "lanes",
    description: "Number of through lanes on each approach to the intersection.",
    min: 1,
    max: 3,
    step: 1,
    default: 1,
    integer: true,
    mentions: [["lane", "lanes"]],
  },
} satisfies ParamSpecs;

export const hospitalParamSpecs = {
  doctors: {
    label: "Emergency doctors",
    unit: "doctors",
    description: "Doctors on shift in the emergency department.",
    min: 1,
    max: 20,
    step: 1,
    default: 4,
    integer: true,
    mentions: [["doctor", "doctors", "physician", "physicians", "medic", "medics", "clinician", "clinicians"]],
  },
  beds: {
    label: "Treatment beds",
    unit: "beds",
    description: "Emergency department treatment beds available.",
    min: 2,
    max: 60,
    step: 1,
    default: 12,
    integer: true,
    mentions: [["bed", "beds"]],
  },
  arrivalsPerHour: {
    label: "Patient arrivals",
    unit: "patients/h",
    description: "Average number of patients arriving per hour.",
    min: 1,
    max: 40,
    step: 1,
    default: 10,
    integer: true,
    mentions: [["arrival", "arrivals", "arriving", "patient", "patients", "demand", "admission", "admissions", "visit", "visits", "inflow"]],
  },
  treatmentMinutes: {
    label: "Average treatment time",
    unit: "min",
    description: "Average doctor time needed per patient.",
    min: 5,
    max: 120,
    step: 5,
    default: 25,
    integer: true,
    mentions: [["treatment", "treat", "treating", "consultation", "consult", "duration", "minutes", "length"]],
  },
} satisfies ParamSpecs;

export const TrafficParamsSchema = buildParamSchema(trafficParamSpecs);
export const HospitalParamsSchema = buildParamSchema(hospitalParamSpecs);

export type TrafficParams = ParamValues<typeof trafficParamSpecs>;
export type HospitalParams = ParamValues<typeof hospitalParamSpecs>;

/** Which direction of change counts as an improvement for a metric. */
export type MetricDirection = "lower" | "higher" | "neutral";

/** An output the simulation reports. */
export interface MetricSpec {
  key: string;
  label: string;
  unit: string;
  better: MetricDirection;
}

export interface EnvironmentMeta {
  id: EnvironmentId;
  name: string;
  tagline: string;
  description: string;
  href: string;
  cta: string;
  exampleRequest: string;
  specs: ParamSpecs;
  metrics: MetricSpec[];
}

export const ENVIRONMENTS: Record<EnvironmentId, EnvironmentMeta> = {
  traffic: {
    id: "traffic",
    name: "City Traffic",
    tagline: "A signalized four-way intersection with vehicle queues.",
    description: "Explore traffic flow, signal timing, vehicle queues and road congestion.",
    href: "/traffic",
    cta: "Explore City Traffic",
    exampleRequest: "Increase the main road green signal from 30 seconds to 50 seconds.",
    specs: trafficParamSpecs,
    metrics: [
      { key: "avgWaitSec", label: "Average waiting time", unit: "s", better: "lower" },
      { key: "maxQueue", label: "Maximum queue length", unit: "vehicles", better: "lower" },
      { key: "vehiclesServed", label: "Vehicles served", unit: "vehicles", better: "higher" },
      { key: "congestion", label: "Congestion level", unit: "%", better: "lower" },
    ],
  },
  hospital: {
    id: "hospital",
    name: "Hospital Operations",
    tagline: "An emergency department with doctors, beds and a patient queue.",
    description:
      "Explore patient flow, hospital capacity, doctors and emergency department operations.",
    href: "/hospital",
    cta: "Explore Hospital",
    exampleRequest: "Increase emergency doctors from 4 to 6.",
    specs: hospitalParamSpecs,
    metrics: [
      { key: "avgWaitMin", label: "Average patient waiting time", unit: "min", better: "lower" },
      { key: "maxQueue", label: "Maximum waiting queue", unit: "patients", better: "lower" },
      { key: "patientsTreated", label: "Patients treated", unit: "patients", better: "higher" },
      { key: "bedUtilization", label: "Bed utilization", unit: "%", better: "neutral" },
      { key: "doctorUtilization", label: "Doctor utilization", unit: "%", better: "neutral" },
    ],
  },
};

export const DEFAULT_TRAFFIC_PARAMS: TrafficParams = defaultValues(trafficParamSpecs);
export const DEFAULT_HOSPITAL_PARAMS: HospitalParams = defaultValues(hospitalParamSpecs);

/** Per-environment lookups so shared code can stay generic. */
export interface EnvironmentParams {
  traffic: TrafficParams;
  hospital: HospitalParams;
}

export const PARAM_SCHEMAS = {
  traffic: TrafficParamsSchema,
  hospital: HospitalParamsSchema,
} as const;

export const DEFAULT_PARAMS: EnvironmentParams = {
  traffic: DEFAULT_TRAFFIC_PARAMS,
  hospital: DEFAULT_HOSPITAL_PARAMS,
};

export const DISCLAIMER =
  "These are simplified illustrative simulations, not real-world predictions or clinical decision-support tools.";
