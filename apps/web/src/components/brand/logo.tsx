import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * Take Me High seal: a passport-stamp ring ("TAKE ME HIGH" / "TRAVEL & TOURISM OFFICE")
 * around a map pin that frames a mountain and the sun. Colours come from the Cirrus tokens
 * (--logo-*), so it follows light / dark mode. `animated` adds the stamp-in, the slowly
 * turning ring text, the floating pin and the moving dotted route.
 */
export function LogoSeal({ className, animated = false, title = 'Take Me High' }: { className?: string; animated?: boolean; title?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={title} className={cn('logo-seal', animated && 'logo-animated', className)}>
      <defs>
        <linearGradient id={`${id}-pin`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--logo-pin-a)" />
          <stop offset="1" stopColor="var(--logo-pin-b)" />
        </linearGradient>
        <clipPath id={`${id}-window`}>
          <circle cx="100" cy="86" r="15" />
        </clipPath>
        <path id={`${id}-top`} d="M 28,100 A 72,72 0 0 1 172,100" />
        <path id={`${id}-bottom`} d="M 14,100 A 86,86 0 0 0 186,100" />
      </defs>

      <g className="logo-stamp">
        <circle cx="100" cy="100" r="95" fill="var(--logo-paper)" stroke="var(--logo-ring)" strokeWidth="5" />
        <circle cx="100" cy="100" r="62" fill="none" stroke="var(--logo-ring)" strokeWidth="3" />

        <g className="logo-ring-text" fill="var(--logo-ring)" fontFamily="var(--font-display)" fontWeight="700">
          <text fontSize="21" letterSpacing="3">
            <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">
              TAKE ME HIGH
            </textPath>
          </text>
          <text fontSize="12.5" letterSpacing="1.6">
            <textPath href={`#${id}-bottom`} startOffset="50%" textAnchor="middle">
              TRAVEL &amp; TOURISM OFFICE
            </textPath>
          </text>
          <path className="logo-spark" d="M21 100 l3 -7 l3 7 l-3 7 Z M17 100 l7 -2.4 l7 2.4 l-7 2.4 Z" fill="var(--logo-sun)" />
          <path className="logo-spark" d="M173 100 l3 -7 l3 7 l-3 7 Z M169 100 l7 -2.4 l7 2.4 l-7 2.4 Z" fill="var(--logo-sun)" />
        </g>

        <path className="logo-route" d="M58 116 C 62 134, 78 146, 97 146" fill="none" stroke="var(--logo-sun)" strokeWidth="3.2" strokeLinecap="round" strokeDasharray="0 7" />

        <g className="logo-pin">
          <path d="M100 140 C 92 127 73 110 73 86 A 27 27 0 1 1 127 86 C 127 110 108 127 100 140 Z" fill={`url(#${id}-pin)`} />
          <circle cx="100" cy="86" r="15" fill="var(--logo-window)" />
          <g clipPath={`url(#${id}-window)`}>
            <path d="M82 104 L95 84 L101 92 L107 85 L120 104 Z" fill="var(--logo-ring)" />
            <path d="M95 84 L91 90 L95 89 L98 91 Z" fill="var(--logo-window)" opacity=".85" />
          </g>
          <circle className="logo-sun" cx="107" cy="78" r="4.2" fill="var(--logo-sun)" />
        </g>
      </g>
    </svg>
  );
}

/** Compact mark for small sizes (header, favicon): the pin on a filled disc. */
export function LogoBadge({ className, title = 'Take Me High' }: { className?: string; title?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={cn('logo-badge', className)}>
      <defs>
        <linearGradient id={`${id}-disc`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--logo-pin-b)" />
          <stop offset="1" stopColor="var(--logo-ring)" />
        </linearGradient>
        <clipPath id={`${id}-w`}>
          <circle cx="32" cy="26" r="7.5" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="31" fill={`url(#${id}-disc)`} />
      <circle cx="32" cy="32" r="27" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.2" />
      <g className="logo-pin">
        <path d="M32 50 C 28 44 19 36 19 26 A 13 13 0 1 1 45 26 C 45 36 36 44 32 50 Z" fill="#fff" />
        <circle cx="32" cy="26" r="7.5" fill="var(--logo-window-badge)" />
        <path d="M23 35 L29.5 25 L32.5 29 L35.5 25.5 L42 35 Z" fill="var(--logo-ring)" clipPath={`url(#${id}-w)`} />
        <circle cx="35.5" cy="22" r="2.2" fill="var(--logo-sun)" />
      </g>
    </svg>
  );
}
