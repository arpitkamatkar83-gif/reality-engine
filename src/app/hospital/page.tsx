import type { Metadata } from "next";
import { HospitalWorkspace } from "@/components/hospital/HospitalWorkspace";
import { EnvironmentShell } from "@/components/layout/EnvironmentShell";

export const metadata: Metadata = { title: "Hospital Operations · Reality Engine" };

export default function HospitalPage() {
  return (
    <EnvironmentShell id="hospital">
      <HospitalWorkspace />
    </EnvironmentShell>
  );
}
