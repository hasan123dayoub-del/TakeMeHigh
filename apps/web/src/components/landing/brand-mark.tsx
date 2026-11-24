import { cn } from '@/lib/utils';

/** Office logo, or its initial on the altitude gradient when no logo is uploaded. */
export function BrandMark({ name, logoUrl, className, inverse }: { name: string; logoUrl: string | null; className?: string; inverse?: boolean }) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt="" className={cn('size-9 shrink-0 rounded-full object-cover', className)} />;
  }
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-full font-display text-[16px] font-medium',
        inverse ? 'bg-white/15 text-white' : 'bg-altitude shadow-primary',
        className,
      )}
    >
      {name.trim().charAt(0)}
    </span>
  );
}
