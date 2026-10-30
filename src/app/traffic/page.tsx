import type { Metadata } from "next";
import { EnvironmentShell } from "@/components/layout/EnvironmentShell";
import { TrafficWorkspace } from "@/components/traffic/TrafficWorkspace";

export const metadata: Metadata = { title: "City Traffic · Reality Engine" };

export default function TrafficPage() {
  return (
    <EnvironmentShell id="traffic">
      <TrafficWorkspace />
    </EnvironmentShell>
  );
}
