import Link from "next/link";
import type { ReactNode } from "react";
import { ENVIRONMENT_VISUALS } from "@/components/dashboard/environmentVisuals";
import { Card } from "@/components/ui/Card";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { ENVIRONMENTS, type EnvironmentId } from "@/lib/environments";

/** Page frame for an environment: header, workspace (or a placeholder) and disclaimer. */
export function EnvironmentShell({ id, children }: { id: EnvironmentId; children?: ReactNode }) {
  const env = ENVIRONMENTS[id];
  const { Scene, theme } = ENVIRONMENT_VISUALS[id];
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-2">
        <Link href="/" className="font-mono text-xs text-ink-400 transition hover:text-ink-100">
          ← All environments
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">{env.name}</h1>
        <p className="text-ink-300">{env.description}</p>
      </div>
      <Disclaimer />
      {children ?? (
        <Card className="relative overflow-hidden">
          <div aria-hidden className={`absolute inset-0 ${theme.glow}`} />
          <div className="relative flex flex-col items-center gap-4 p-8">
            <Scene className="w-full max-w-lg" />
            <p className="font-mono text-xs text-ink-400">Simulation workspace coming next.</p>
          </div>
        </Card>
      )}
    </main>
  );
}
