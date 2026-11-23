'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from 'next-themes';
import { useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ApiError } from '@/lib/api';
import { AuthProvider } from '@/lib/auth';
import { LocaleProvider, type Locale } from '@/lib/i18n';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (count, err) => {
          if (err instanceof ApiError && err.status >= 400 && err.status < 500) return false;
          return count < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      position="bottom-center"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'rounded-tile! border! border-border! bg-surface-raised! text-foreground! shadow-pop! font-sans!',
          description: 'text-muted!',
          actionButton: 'bg-ink! text-ink-foreground! rounded-full!',
          cancelButton: 'bg-surface! text-foreground! rounded-full!',
          closeButton: 'bg-surface-raised! border-border! text-muted!',
        },
      }}
    />
  );
}

/*
 * next-themes renders an inline script to set the theme class before paint.
 * React warns about <script> rendered on the client, so the script is
 * `text/javascript` only during SSR and inert `text/plain` on the client
 * (see Next.js guide "preventing flash before hydration").
 */
const themeScriptProps = {
  type: typeof window === 'undefined' ? 'text/javascript' : 'text/plain',
  suppressHydrationWarning: true,
} as const;

export function Providers({ children, locale }: { children: ReactNode; locale: Locale }) {
  const [queryClient] = useState(makeQueryClient);
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      storageKey="takemehigh.theme"
      scriptProps={themeScriptProps}
    >
      <LocaleProvider initialLocale={locale}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider delayDuration={250}>{children}</TooltipProvider>
        </AuthProvider>
        <ThemedToaster />
      </QueryClientProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
