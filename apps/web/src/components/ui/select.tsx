'use client';

import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Select as SelectPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { useFieldControl } from './form-field';
import { fieldBase } from './input';

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({
  className,
  children,
  size = 'md',
  ...props
}: ComponentProps<typeof SelectPrimitive.Trigger> & { size?: 'sm' | 'md' }) {
  const field = useFieldControl();
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      {...field}
      {...props}
      className={cn(
        fieldBase,
        'flex items-center justify-between gap-2 text-left data-placeholder:text-subtle [&>span]:truncate',
        size === 'md' ? 'h-11 px-4' : 'h-9 rounded-[12px] px-3 text-[14px]',
        className,
      )}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-4 shrink-0 text-subtle" aria-hidden />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  position = 'popper',
  ...props
}: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        className={cn(
          'relative z-50 max-h-(--radix-select-content-available-height) min-w-32 overflow-hidden rounded-tile border border-border bg-surface-raised text-foreground shadow-pop',
          'origin-(--radix-select-content-transform-origin) data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in',
          position === 'popper' &&
            'w-full min-w-(--radix-select-trigger-width) data-[side=bottom]:translate-y-1.5 data-[side=top]:-translate-y-1.5',
          className,
        )}
        {...props}
      >
        <SelectPrimitive.ScrollUpButton className="flex h-7 items-center justify-center text-muted">
          <ChevronUp className="size-4" />
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className="p-1.5">{children}</SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="flex h-7 items-center justify-center text-muted">
          <ChevronDown className="size-4" />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectLabel({ className, ...props }: ComponentProps<typeof SelectPrimitive.Label>) {
  return <SelectPrimitive.Label className={cn('eyebrow px-2.5 py-1.5', className)} {...props} />;
}

export function SelectItem({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        'relative flex w-full cursor-default items-center rounded-[10px] py-2 pe-8 ps-2.5 text-sm outline-none select-none',
        'data-highlighted:bg-surface data-highlighted:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="absolute end-2.5 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4 text-primary" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  );
}

export function SelectSeparator({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      className={cn('-mx-1.5 my-1.5 h-px bg-border', className)}
      {...props}
    />
  );
}
