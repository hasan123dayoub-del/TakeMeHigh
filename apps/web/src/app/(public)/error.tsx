'use client';

import { PublicError } from '@/components/landing/public-error';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PublicError reset={reset} />;
}
