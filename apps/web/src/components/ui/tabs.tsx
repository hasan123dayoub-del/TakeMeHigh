'use client';

import { Tabs as TabsPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

/** Pill track. `variant="underline"` gives a quieter style for dense detail pages. */
export function TabsList({
  className,
  variant = 'pill',
  ...props
}: ComponentProps<typeof TabsPrimitive.List> & { variant?: 'pill' | 'underline' }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(
        'group/tabs inline-flex max-w-full items-center overflow-x-auto scrollbar-none',
        variant === 'pill' && 'gap-0.5 rounded-full border border-border bg-surface-raised p-1',
        variant === 'underline' && 'gap-5 border-b border-border',
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 text-[13px] font-medium whitespace-nowrap text-muted transition-colors',
        'hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50',
        'group-data-[variant=pill]/tabs:h-8 group-data-[variant=pill]/tabs:rounded-full group-data-[variant=pill]/tabs:px-4',
        'group-data-[variant=pill]/tabs:data-[state=active]:bg-ink group-data-[variant=pill]/tabs:data-[state=active]:text-ink-foreground',
        'group-data-[variant=underline]/tabs:-mb-px group-data-[variant=underline]/tabs:border-b-2 group-data-[variant=underline]/tabs:border-transparent group-data-[variant=underline]/tabs:pb-2.5',
        'group-data-[variant=underline]/tabs:data-[state=active]:border-ink group-data-[variant=underline]/tabs:data-[state=active]:text-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('mt-4 outline-none data-[state=active]:animate-fade-in', className)}
      {...props}
    />
  );
}
