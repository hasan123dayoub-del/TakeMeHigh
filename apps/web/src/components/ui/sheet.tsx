'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { DialogOverlay } from './dialog';

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;

const sheetVariants = cva(
  'fixed z-50 flex flex-col gap-4 border-border bg-surface-raised text-foreground shadow-pop outline-none',
  {
    variants: {
      side: {
        right:
          'inset-y-2 right-2 w-[calc(100%-1rem)] max-w-md rounded-card border data-[state=closed]:animate-sheet-out-right data-[state=open]:animate-sheet-in-right',
        left: 'inset-y-2 left-2 w-[calc(100%-1rem)] max-w-xs rounded-card border data-[state=closed]:animate-sheet-out-left data-[state=open]:animate-sheet-in-left',
        bottom:
          'inset-x-0 bottom-0 max-h-[90dvh] rounded-t-card border-t data-[state=closed]:animate-sheet-out-bottom data-[state=open]:animate-sheet-in-bottom',
      },
    },
    defaultVariants: { side: 'right' },
  },
);

export function SheetContent({
  className,
  children,
  side,
  ...props
}: ComponentProps<typeof SheetPrimitive.Content> & VariantProps<typeof sheetVariants>) {
  return (
    <SheetPrimitive.Portal>
      <DialogOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          className="absolute top-4 right-4 grid size-9 place-items-center rounded-full border border-border bg-surface-raised text-muted transition-colors hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('grid gap-1 p-5 pr-16', className)} {...props} />;
}

export function SheetBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex-1 overflow-y-auto px-5', className)} {...props} />;
}

export function SheetFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('mt-auto flex flex-col gap-2 p-5', className)} {...props} />;
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      className={cn('font-display text-lg font-normal', className)}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description className={cn('text-sm text-muted', className)} {...props} />;
}
