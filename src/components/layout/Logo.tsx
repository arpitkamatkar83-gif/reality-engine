/** Isometric cube mark: three faces suggest a modelled world. */
export function Logo({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="re-logo-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7ee0f7" />
          <stop offset="1" stopColor="#4cc9f0" />
        </linearGradient>
      </defs>
      <polygon points="16,3 28,10 16,17 4,10" fill="url(#re-logo-top)" />
      <polygon points="4,10 16,17 16,29 4,22" fill="#3a86ff" />
      <polygon points="28,10 16,17 16,29 28,22" fill="#1f4fb8" />
      <polygon points="16,17 22,13.5 22,20.5 16,24" fill="#0a1020" opacity="0.35" />
    </svg>
  );
}
