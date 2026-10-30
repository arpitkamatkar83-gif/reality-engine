export function Hero() {
  return (
    <section className="relative space-y-6 pt-10 sm:pt-16">
      <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
        <span aria-hidden className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-accent" />
        </span>
        AI-powered simulation · runs locally
      </div>
      <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-balance sm:text-6xl">
        Experiment with the world.{" "}
        <span className="bg-gradient-to-r from-accent to-accent-strong bg-clip-text text-transparent">
          Before changing it.
        </span>
      </h1>
      <p className="max-w-2xl text-base text-ink-300 sm:text-lg">
        Explore how small decisions can affect complex real-world systems through interactive
        simulations.
      </p>
      <ol className="flex flex-wrap gap-x-6 gap-y-2 pt-2 font-mono text-xs text-ink-400">
        {["Describe a change", "Review parameters", "Run simulation", "Compare outcomes"].map((step, i) => (
          <li key={step} className="flex items-center gap-2">
            <span className="text-ink-600">0{i + 1}</span>
            {step}
          </li>
        ))}
      </ol>
    </section>
  );
}
