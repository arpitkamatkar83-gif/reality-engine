import { EnvironmentCard } from "@/components/dashboard/EnvironmentCard";
import { ENVIRONMENT_VISUALS } from "@/components/dashboard/environmentVisuals";
import { Hero } from "@/components/dashboard/Hero";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { ENVIRONMENTS } from "@/lib/environments";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-12 px-4 pb-16 sm:px-6">
      <Hero />
      <section aria-labelledby="environments-heading" className="space-y-5">
        <h2 id="environments-heading" className="font-mono text-xs uppercase tracking-[0.2em] text-ink-400">
          Choose a simulation environment
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          {Object.values(ENVIRONMENTS).map((env, i) => {
            const { Scene, theme } = ENVIRONMENT_VISUALS[env.id];
            return (
              <EnvironmentCard
                key={env.id}
                env={env}
                theme={theme}
                index={i}
                illustration={<Scene className="h-full w-full max-w-md drop-shadow-[0_20px_30px_rgb(0_0_0/0.45)]" />}
              />
            );
          })}
        </div>
      </section>
      <Disclaimer />
    </main>
  );
}
