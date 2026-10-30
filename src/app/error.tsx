"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";

/** App-wide error boundary: a readable message instead of a blank screen, without exposing internals. */
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-16">
      <Card className="space-y-4 p-6 text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-ink-300">
          This page hit an unexpected error. Your simulations are not affected; try again or return to the dashboard.
        </p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-ink-950 transition hover:opacity-90"
          >
            Try again
          </button>
          <Link href="/" className="rounded-xl border border-ink-700 px-4 py-2 text-sm text-ink-300 transition hover:text-ink-100">
            Dashboard
          </Link>
        </div>
      </Card>
    </main>
  );
}
