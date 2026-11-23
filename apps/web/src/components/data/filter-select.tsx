'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';
import { cn } from '@/lib/utils';

const ALL = '__all__';

/** Toolbar filter: `<FilterSelect label="Status" value={f.status} onChange={(v) => set({ status: v })} options={[...]} />` */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  className,
  allLabel,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: { value: string; label: string }[];
  className?: string;
  allLabel?: string;
}) {
  const c = useMessages(common);
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
      <SelectTrigger size="sm" className={cn('h-10 w-auto min-w-[140px] rounded-full', className)} aria-label={label}>
        <span className="text-subtle">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel ?? c.all}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
