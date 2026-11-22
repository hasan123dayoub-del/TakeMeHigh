'use client';

import { Tooltip as TooltipPrimitive } from 'radix-ui';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const TooltipProvider = TooltipPrimitive.Provider;
export const TooltipRoot = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  sideOffset = 8,
  children,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          'z-50 rounded-[10px] bg-ink px-2.5 py-1.5 text-xs font-medium text-ink-foreground shadow-pop',
          'origin-(--radix-tooltip-content-transform-origin) data-[state=closed]:animate-pop-out data-[state=delayed-open]:animate-pop-in data-[state=instant-open]:animate-pop-in',
          className,
        )}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

/** Convenience wrapper: `<Tooltip content="Search"><Button …/></Tooltip>` */
export function Tooltip({
  content,
  children,
  side,
  contentClassName,
  ...props
}: Omit<ComponentProps<typeof TooltipPrimitive.Root>, 'children'> & {
  content: ReactNode;
  children: ReactNode;
  side?: ComponentProps<typeof TooltipPrimitive.Content>['side'];
  contentClassName?: string;
}) {
  return (
    <TooltipPrimitive.Root {...props}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipContent side={side} className={contentClassName}>
        {content}
      </TooltipContent>
    </TooltipPrimitive.Root>
  );
}
