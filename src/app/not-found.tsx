import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-16">
      <Card className="space-y-4 p-6 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">404</p>
        <h1 className="text-xl font-semibold">This page doesn’t exist</h1>
        <p className="text-sm text-ink-300">Choose a simulation environment from the dashboard.</p>
        <Link href="/" className="inline-block rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-ink-950 transition hover:opacity-90">
          Back to dashboard
        </Link>
      </Card>
    </main>
  );
}
