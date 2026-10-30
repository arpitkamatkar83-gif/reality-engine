import { DISCLAIMER } from "@/lib/environments";

export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p
      role="note"
      className={`flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/5 px-3 py-2 text-xs text-warning/90 ${className}`}
    >
      <span aria-hidden className="mt-px font-semibold">!</span>
      <span>{DISCLAIMER}</span>
    </p>
  );
}
