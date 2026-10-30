import Link from "next/link";
import { AiStatus } from "./AiStatus";
import { Logo } from "./Logo";

export function TopNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-ink-800/80 bg-ink-950/70 backdrop-blur-md">
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-accent">
          <Logo className="size-8 transition-transform duration-300 group-hover:-rotate-6" />
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-wide">Reality Engine</span>
            <span className="hidden text-xs text-ink-400 sm:block">Simulate change. Explore consequences.</span>
          </span>
        </Link>
        <AiStatus />
      </nav>
    </header>
  );
}
