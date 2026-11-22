'use client';

import { Check, ChevronRight } from 'lucide-react';
import { DropdownMenu as MenuPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const DropdownMenu = MenuPrimitive.Root;
export const DropdownMenuTrigger = MenuPrimitive.Trigger;
export const DropdownMenuGroup = MenuPrimitive.Group;
export const DropdownMenuSub = MenuPrimitive.Sub;
export const DropdownMenuRadioGroup = MenuPrimitive.RadioGroup;

const menuSurface =
  'z-50 min-w-48 overflow-hidden rounded-tile border border-border bg-surface-raised p-1.5 text-foreground shadow-pop data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in';

export function DropdownMenuContent({
  className,
  sideOffset = 8,
  ...props
}: ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          menuSurface,
          'origin-(--radix-dropdown-menu-content-transform-origin)',
          className,
        )}
        {...props}
      />
    </MenuPrimitive.Portal>
  );
}

const itemBase =
  'relative flex cursor-default items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-sm outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-surface [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted';

export function DropdownMenuItem({
  className,
  variant = 'default',
  ...props
}: ComponentProps<typeof MenuPrimitive.Item> & { variant?: 'default' | 'danger' }) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        itemBase,
        variant === 'danger' &&
          'text-danger data-highlighted:bg-danger/10 data-highlighted:text-danger [&_svg]:text-danger',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: ComponentProps<typeof MenuPrimitive.CheckboxItem>) {
  return (
    <MenuPrimitive.CheckboxItem className={cn(itemBase, 'pr-8', className)} {...props}>
      {children}
      <span className="absolute right-2.5">
        <MenuPrimitive.ItemIndicator>
          <Check className="text-primary!" />
        </MenuPrimitive.ItemIndicator>
      </span>
    </MenuPrimitive.CheckboxItem>
  );
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof MenuPrimitive.RadioItem>) {
  return (
    <MenuPrimitive.RadioItem className={cn(itemBase, 'pr-8', className)} {...props}>
      {children}
      <span className="absolute right-2.5">
        <MenuPrimitive.ItemIndicator>
          <Check className="text-primary!" />
        </MenuPrimitive.ItemIndicator>
      </span>
    </MenuPrimitive.RadioItem>
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Label>) {
  return <MenuPrimitive.Label className={cn('eyebrow px-2.5 pt-2 pb-1.5', className)} {...props} />;
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Separator>) {
  return (
    <MenuPrimitive.Separator
      className={cn('-mx-1.5 my-1.5 h-px bg-border', className)}
      {...props}
    />
  );
}

export function DropdownMenuShortcut({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span className={cn('ml-auto text-xs tracking-widest text-subtle', className)} {...props} />
  );
}

export function DropdownMenuSubTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof MenuPrimitive.SubTrigger>) {
  return (
    <MenuPrimitive.SubTrigger
      className={cn(itemBase, 'data-[state=open]:bg-surface', className)}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto" />
    </MenuPrimitive.SubTrigger>
  );
}

export function DropdownMenuSubContent({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.SubContent>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.SubContent className={cn(menuSurface, className)} {...props} />
    </MenuPrimitive.Portal>
  );
}
