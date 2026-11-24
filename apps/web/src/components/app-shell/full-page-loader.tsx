import { LogoSeal } from '@/components/brand/logo';

/** Loading state shown while the session is verified: the seal with a plane circling it. */
export function FullPageLoader({ label = 'Preparing your workspace' }: { label?: string }) {
  return (
    <div className="grid min-h-dvh flex-1 place-items-center bg-canvas p-6" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative grid size-36 place-items-center">
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-dashed border-primary/40 [animation-duration:9s]" />
          <LogoSeal animated className="size-28 drop-shadow-lg" />
          <span aria-hidden className="scene-plane-track absolute inset-0">
            <span className="scene-plane [animation-duration:3.2s]">
              <svg viewBox="0 0 48 48" className="size-6 text-primary">
                <path d="M44 24 c0-1.6-1.4-2.6-3-2.6 H30 L19 5 h-4.5 l5.5 16.4 H10 l-3.6-4.6 H3 l2.4 7.2 L3 31.2 h3.4 L10 26.6 h10 L14.5 43 H19 l11-16.4 h11 c1.6 0 3-1 3-2.6 Z" fill="currentColor" />
              </svg>
            </span>
          </span>
        </div>
        <p className="heading-display text-sm">{label}</p>
      </div>
    </div>
  );
}
