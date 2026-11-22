'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FullPageLoader } from '@/components/app-shell/full-page-loader';
import { useAuth } from '@/lib/auth';

export function HomeRedirect() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' || status === 'error') router.replace('/dashboard');
    else if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  return <FullPageLoader label="Opening TravelOS" />;
}
