'use client';

import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { useFieldControl } from './form-field';
import { fieldBase } from './input';

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  const field = useFieldControl();
  return (
    <textarea
      data-slot="textarea"
      {...field}
      {...props}
      className={cn(fieldBase, 'min-h-24 resize-y px-4 py-3 leading-relaxed', className)}
    />
  );
}
