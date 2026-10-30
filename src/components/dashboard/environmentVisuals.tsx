import type { ReactNode } from "react";
import { HospitalScene } from "@/components/illustrations/HospitalScene";
import { TrafficScene } from "@/components/illustrations/TrafficScene";
import type { EnvironmentId } from "@/lib/environments";
import type { EnvironmentTheme } from "./EnvironmentCard";

/** Per-environment visual identity: amber/cyan for traffic, teal/rose for hospital. */
export const ENVIRONMENT_VISUALS: Record<
  EnvironmentId,
  { theme: EnvironmentTheme; Scene: (props: { className?: string }) => ReactNode }
> = {
  traffic: {
    Scene: TrafficScene,
    theme: {
      glow: "bg-[radial-gradient(ellipse_at_50%_60%,rgb(251_191_36/0.16),transparent_65%)]",
      accentText: "text-amber-300",
      hoverBorder: "hover:border-amber-300/40",
      button: "bg-amber-300 text-ink-950 hover:bg-amber-200 focus-visible:outline-amber-300",
      range: "accent-amber-300",
      chip: "bg-amber-300/15 text-amber-300",
      spinner: "border-amber-300",
    },
  },
  hospital: {
    Scene: HospitalScene,
    theme: {
      glow: "bg-[radial-gradient(ellipse_at_50%_60%,rgb(52_211_153/0.16),transparent_65%)]",
      accentText: "text-emerald-300",
      hoverBorder: "hover:border-emerald-300/40",
      button: "bg-emerald-300 text-ink-950 hover:bg-emerald-200 focus-visible:outline-emerald-300",
      range: "accent-emerald-300",
      chip: "bg-emerald-300/15 text-emerald-300",
      spinner: "border-emerald-300",
    },
  },
};
