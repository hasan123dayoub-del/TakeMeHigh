import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge class names, resolving Tailwind conflicts (last one wins). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Two-letter initials for avatars: "Lina Haddad" -> "LH". */
export function initials(name: string | null | undefined) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] ?? '');
  return (first + last).toUpperCase() || '?';
}
