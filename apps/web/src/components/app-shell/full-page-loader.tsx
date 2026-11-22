import { Plane } from 'lucide-react';

/** Refined loading state shown while the session is verified (no protected content flashes). */
export function FullPageLoader({ label = 'Preparing your workspace' }: { label?: string }) {
  return (
    <div
      className="grid min-h-dvh flex-1 place-items-center bg-canvas p-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative grid size-20 place-items-center">
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary border-r-accent [animation-duration:1.4s]" />
          <span className="absolute inset-2 rounded-full bg-glass backdrop-blur-md" />
          <span className="relative grid size-11 place-items-center rounded-full bg-ink text-ink-foreground">
            <Plane className="size-4 -rotate-45" aria-hidden />
          </span>
        </div>
        <div className="text-center">
          <p className="heading-display text-sm">{label}</p>
          <p className="mt-1 text-xs text-muted">Verifying your session…</p>
        </div>
      </div>
    </div>
  );
}
