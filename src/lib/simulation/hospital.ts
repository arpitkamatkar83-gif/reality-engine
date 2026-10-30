import { HospitalParamsSchema, type HospitalParams } from "@/lib/environments";

/**
 * Simplified emergency-department patient-flow model — an illustrative model,
 * not a clinical decision-support tool.
 *
 * Model assumptions:
 * - Arrivals follow a fixed hourly demand profile (quieter at the start, a midday
 *   peak, tapering off). The profile averages 1.0, so total arrivals over 10 hours
 *   equal 10 × arrivalsPerHour. Patient k arrives when cumulative expected demand
 *   reaches k + 0.5. No randomness and no triage priorities: one first-come-first-served queue.
 * - Treatment needs one doctor AND one bed at the same time. A patient waits in the
 *   waiting area until both are free.
 * - A doctor is busy for `treatmentMinutes`, then is free for the next patient.
 * - The bed stays occupied for a further `observationMin` after treatment
 *   (observation, discharge paperwork and bed turnover). So each patient holds a
 *   bed for treatmentMinutes + observationMin.
 * - Time advances in 1-minute steps. At each minute t: doctors and beds whose
 *   patients finished are free again; waiting patients start treatment while a
 *   doctor and a bed are both free (lowest-numbered doctor and bed first); then
 *   patients arriving during [t, t + 1) join the queue. So every patient waits
 *   at least until the next whole minute (under 1 minute at most).
 * - Waiting time counts every patient who arrived; those still waiting at the end
 *   contribute the time they had waited so far (a lower bound).
 * - Capacity: doctors can treat doctors · 60 / treatmentMinutes patients per hour;
 *   beds can turn over beds · 60 / (treatmentMinutes + observationMin) patients per
 *   hour. The smaller of the two is the bottleneck.
 */
export const HOSPITAL_MODEL = {
  durationMin: 600,
  observationMin: 45,
  /** Multiplier on arrivalsPerHour for each hour of the window (repeats after 10 h). */
  hourlyDemandProfile: [0.7, 0.85, 1.0, 1.2, 1.3, 1.25, 1.1, 0.95, 0.85, 0.8],
} as const;

export interface PatientRecord {
  id: number;
  /** Minutes from the start of the window (fractional). */
  arrival: number;
  /** Treatment start minute, or null if still waiting when the window closed. */
  start: number | null;
  treatmentEnd: number | null;
  /** Minute the bed was released; may lie beyond the window. */
  discharge: number | null;
  bed: number | null;
  doctor: number | null;
}

export interface HospitalFrame {
  /** Simulation minute this frame describes (state after that minute's events). */
  t: number;
  waiting: number;
  inTreatment: number;
  inObservation: number;
  arrived: number;
  discharged: number;
}

export type Bottleneck = "doctors" | "beds";

export interface HospitalCapacity {
  demandPerHour: number;
  doctorCapacityPerHour: number;
  bedCapacityPerHour: number;
  bottleneck: Bottleneck;
  /** Demand ÷ capacity of the bottleneck resource. Above 1 the queue keeps growing. */
  load: number;
}

export interface HospitalSummary {
  avgWaitMin: number;
  maxQueue: number;
  patientsTreated: number;
  bedUtilization: number;
  doctorUtilization: number;
}

export interface HospitalStats {
  arrived: number;
  treatmentStarted: number;
  stillWaiting: number;
  maxWaitMin: number;
  /** Minutes in which someone was waiting because no doctor was free. */
  minutesWaitingForDoctor: number;
  /** Minutes in which a doctor was free but someone waited because no bed was free. */
  minutesWaitingForBed: number;
}

export interface HospitalResult {
  params: HospitalParams;
  durationMin: number;
  observationMin: number;
  summary: HospitalSummary;
  capacity: HospitalCapacity;
  stats: HospitalStats;
  patients: PatientRecord[];
  timeline: HospitalFrame[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

export function hospitalCapacity(params: HospitalParams, observationMin: number = HOSPITAL_MODEL.observationMin): HospitalCapacity {
  const doctorCapacityPerHour = (params.doctors * 60) / params.treatmentMinutes;
  const bedCapacityPerHour = (params.beds * 60) / (params.treatmentMinutes + observationMin);
  const bottleneck: Bottleneck = doctorCapacityPerHour <= bedCapacityPerHour ? "doctors" : "beds";
  const capacity = Math.min(doctorCapacityPerHour, bedCapacityPerHour);
  return {
    demandPerHour: params.arrivalsPerHour,
    doctorCapacityPerHour: round1(doctorCapacityPerHour),
    bedCapacityPerHour: round1(bedCapacityPerHour),
    bottleneck,
    load: round2(params.arrivalsPerHour / capacity),
  };
}

/** Returns the lowest free index, or -1 if all are taken. */
function firstFree(busyUntil: number[], t: number): number {
  for (let i = 0; i < busyUntil.length; i++) if (busyUntil[i] <= t) return i;
  return -1;
}

export interface HospitalOptions {
  /** Simulated window in minutes (default 600 = 10 hours). */
  durationMin?: number;
}

/** Runs the deterministic emergency-department model. Throws on invalid parameters. */
export function simulateHospital(input: HospitalParams, options: HospitalOptions = {}): HospitalResult {
  const params = HospitalParamsSchema.parse(input);
  const durationMin = options.durationMin ?? HOSPITAL_MODEL.durationMin;
  if (!Number.isInteger(durationMin) || durationMin < 60 || durationMin > 24 * 60) {
    throw new RangeError("durationMin must be an integer between 60 and 1440");
  }
  const { observationMin, hourlyDemandProfile } = HOSPITAL_MODEL;

  // Each resource stores the minute it next becomes free.
  const doctorFreeAt = new Array<number>(params.doctors).fill(0);
  const bedFreeAt = new Array<number>(params.beds).fill(0);

  const patients: PatientRecord[] = [];
  const queue: PatientRecord[] = [];
  let queueHead = 0;
  const timeline: HospitalFrame[] = [];
  let maxQueue = 0;
  let doctorBusyMinutes = 0;
  let bedBusyMinutes = 0;
  let minutesWaitingForDoctor = 0;
  let minutesWaitingForBed = 0;
  let expectedArrivals = 0;

  for (let t = 0; t < durationMin; t++) {
    // Start treatment while a doctor and a bed are both free
    while (queueHead < queue.length) {
      const doctor = firstFree(doctorFreeAt, t);
      const bed = firstFree(bedFreeAt, t);
      if (doctor < 0 || bed < 0) break;
      const patient = queue[queueHead++];
      patient.start = t;
      patient.doctor = doctor;
      patient.bed = bed;
      patient.treatmentEnd = t + params.treatmentMinutes;
      patient.discharge = patient.treatmentEnd + observationMin;
      doctorFreeAt[doctor] = patient.treatmentEnd;
      bedFreeAt[bed] = patient.discharge;
    }

    if (queueHead < queue.length) {
      if (firstFree(doctorFreeAt, t) < 0) minutesWaitingForDoctor++;
      else if (firstFree(bedFreeAt, t) < 0) minutesWaitingForBed++;
    }

    // Arrivals during [t, t + 1), placed where cumulative demand crosses k + 0.5.
    // They are added after this minute's treatment starts, so the earliest they
    // can be seen is minute t + 1.
    const perMinute = (params.arrivalsPerHour * hourlyDemandProfile[Math.floor(t / 60) % hourlyDemandProfile.length]) / 60;
    const before = expectedArrivals;
    expectedArrivals += perMinute;
    while (patients.length + 0.5 <= expectedArrivals) {
      const patient: PatientRecord = {
        id: patients.length,
        arrival: t + (patients.length + 0.5 - before) / perMinute,
        start: null,
        treatmentEnd: null,
        discharge: null,
        bed: null,
        doctor: null,
      };
      patients.push(patient);
      queue.push(patient);
    }

    const waiting = queue.length - queueHead;

    // State during minute t
    let inTreatment = 0;
    let inObservation = 0;
    for (const end of doctorFreeAt) if (end > t) inTreatment++;
    for (const end of bedFreeAt) if (end > t) inObservation++;
    inObservation -= inTreatment;
    const discharged = patients.filter((p) => p.discharge !== null && p.discharge <= t).length;

    doctorBusyMinutes += inTreatment;
    bedBusyMinutes += inTreatment + inObservation;
    maxQueue = Math.max(maxQueue, waiting);
    timeline.push({ t, waiting, inTreatment, inObservation, arrived: patients.length, discharged });
  }

  const treated = patients.filter((p) => p.treatmentEnd !== null && p.treatmentEnd <= durationMin).length;
  let totalWait = 0;
  let maxWait = 0;
  for (const p of patients) {
    const wait = (p.start ?? durationMin) - p.arrival;
    totalWait += wait;
    maxWait = Math.max(maxWait, wait);
  }

  return {
    params,
    durationMin,
    observationMin,
    summary: {
      avgWaitMin: round1(patients.length ? totalWait / patients.length : 0),
      maxQueue,
      patientsTreated: treated,
      bedUtilization: round1((bedBusyMinutes / (params.beds * durationMin)) * 100),
      doctorUtilization: round1((doctorBusyMinutes / (params.doctors * durationMin)) * 100),
    },
    capacity: hospitalCapacity(params, observationMin),
    stats: {
      arrived: patients.length,
      treatmentStarted: queueHead,
      stillWaiting: queue.length - queueHead,
      maxWaitMin: round1(maxWait),
      minutesWaitingForDoctor,
      minutesWaitingForBed,
    },
    patients,
    timeline,
  };
}
