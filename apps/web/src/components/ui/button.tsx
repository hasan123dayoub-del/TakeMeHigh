import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium select-none',
    'transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-out-soft',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        /** Main call to action. sky-600 #3F70AB + white = 5.10:1 (AA). */
        primary:
          'bg-primary text-primary-foreground shadow-primary hover:-translate-y-0.5 hover:bg-primary-hover active:translate-y-0',
        /** White pill on glass (Cirrus "secondary"). */
        secondary:
          'border border-border bg-surface-raised text-foreground shadow-card hover:border-border-strong hover:bg-surface',
        /** Near-black confident action, also the active-pill colour. */
        ink: 'bg-ink text-ink-foreground hover:bg-ink-hover',
        outline:
          'border border-border-strong bg-transparent text-foreground hover:border-ink/40 hover:bg-surface-raised',
        ghost: 'bg-transparent text-muted hover:bg-surface-raised hover:text-foreground',
        destructive:
          'bg-danger text-danger-foreground hover:bg-danger-hover focus-visible:outline-danger',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        xs: 'h-7 px-2.5 text-xs [&_svg]:size-3.5',
        sm: 'h-8 px-3.5 text-[13px] [&_svg]:size-3.5',
        md: 'h-10 px-5 text-sm [&_svg]:size-4',
        lg: 'h-12 px-6 text-[15px] [&_svg]:size-[18px]',
        icon: 'size-10 [&_svg]:size-4',
        'icon-sm': 'size-8 [&_svg]:size-4',
      },
      shape: {
        pill: 'rounded-full',
        rounded: 'rounded-field',
      },
    },
    compoundVariants: [
      { variant: 'link', className: 'h-auto px-0' },
      { size: ['xs', 'sm', 'icon-sm'], shape: 'rounded', className: 'rounded-[10px]' },
    ],
    defaultVariants: { variant: 'primary', size: 'md', shape: 'pill' },
  },
);

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (e.g. a Next <Link>) with button styles. */
    asChild?: boolean;
    /** Shows a spinner, disables the button and sets aria-busy. */
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  shape,
  asChild = false,
  loading = false,
  disabled,
  children,
  type,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, shape }), className);

  if (asChild) {
    return (
      <Slot.Root data-slot="button" className={classes} {...props}>
        {children}
      </Slot.Root>
    );
  }

  return (
    <button
      data-slot="button"
      type={type ?? 'button'}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
