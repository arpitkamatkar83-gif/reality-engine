import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-ink-700/70 bg-gradient-to-b from-ink-850/90 to-ink-900/90 shadow-[0_1px_0_0_rgb(255_255_255/0.04)_inset] backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}
