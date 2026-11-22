import { useId } from 'react';
import { cn } from '@/lib/utils';

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  /** Any CSS colour; defaults to currentColor so it inherits text colour. */
  color?: string;
  className?: string;
  /** Accessible summary, e.g. "Revenue trending up over 10 weeks". Omit to hide from AT. */
  label?: string;
}

/** Tiny area + line trend, no axes. Pure SVG (no chart library cost). */
export function Sparkline({
  data,
  width = 96,
  height = 30,
  color = 'currentColor',
  className,
  label,
}: SparklineProps) {
  const gradientId = useId();
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    height - 3 - ((v - min) / (max - min || 1)) * (height - 6),
  ]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ color }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.22} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill="currentColor" />
    </svg>
  );
}
