'use client';

import { Avatar as AvatarPrimitive } from 'radix-ui';
import { cn, initials } from '@/lib/utils';

const SIZES = {
  sm: 'size-8 text-[11px]',
  md: 'size-10 text-[13px]',
  lg: 'size-12 text-sm',
} as const;

export interface AvatarProps {
  name: string | null | undefined;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

/** Image avatar with a powder-sky gradient + initials fallback. */
export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        'relative inline-flex shrink-0 overflow-hidden rounded-full',
        SIZES[size],
        className,
      )}
    >
      {src && (
        <AvatarPrimitive.Image src={src} alt={name ?? ''} className="size-full object-cover" />
      )}
      <AvatarPrimitive.Fallback
        delayMs={src ? 400 : 0}
        className="grid size-full place-items-center bg-powder font-medium"
      >
        <span aria-hidden>{initials(name)}</span>
        <span className="sr-only">{name}</span>
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
