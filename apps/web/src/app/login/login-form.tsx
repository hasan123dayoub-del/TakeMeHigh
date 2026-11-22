'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ROLE_LABELS, type Role } from '@travelos/shared';
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { ApiError, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: 'Enter your email address' })
    .pipe(z.email({ error: 'Enter a valid email address' })),
  password: z.string().min(1, { error: 'Enter your password' }),
});

type LoginValues = z.input<typeof loginSchema>;

/** Seeded demo accounts (see apps/api seed). One per role. */
const DEMO_PASSWORD = 'TravelOS@2026';
const DEMO_ACCOUNTS: { role: Role; email: string }[] = [
  { role: 'OWNER', email: 'owner@demo.travelos.local' },
  { role: 'ADMIN', email: 'admin@demo.travelos.local' },
  { role: 'OPERATIONS_MANAGER', email: 'ops@demo.travelos.local' },
  { role: 'BOOKING_AGENT', email: 'agent@demo.travelos.local' },
  { role: 'ACCOUNTANT', email: 'accounts@demo.travelos.local' },
];

/** Only same-origin paths are allowed as post-login destinations (no open redirect). */
function safeNext() {
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/login')
    ? next
    : '/dashboard';
}

function describeLoginError(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401) return "That email and password don't match. Check them and try again.";
    if (err.status === 429) return 'Too many sign-in attempts. Wait a minute, then try again.';
  }
  return errorMessage(err);
}

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  const email = useWatch({ control, name: 'email' });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const user = await login(values.email.trim(), values.password);
      toast.success(`Welcome back, ${user.fullName.split(' ')[0]}`, {
        description: user.agency ? `Signed in to ${user.agency.name}` : undefined,
      });
      router.replace(safeNext());
    } catch (err) {
      setFormError(describeLoginError(err));
    }
  });

  const fillDemo = (demoEmail: string) => {
    setFormError(null);
    setValue('email', demoEmail, { shouldValidate: true, shouldDirty: true });
    setValue('password', DEMO_PASSWORD, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <div className="mt-8">
      <form
        onSubmit={onSubmit}
        noValidate
        className="grid gap-5"
        aria-describedby={formError ? 'login-error' : undefined}
      >
        {formError && (
          <div
            id="login-error"
            role="alert"
            className="flex items-start gap-2.5 rounded-tile border border-danger/25 bg-danger/8 px-3.5 py-3 text-[13px] text-[color-mix(in_srgb,var(--danger)_80%,var(--text))] animate-fade-in"
          >
            <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />
            <span>{formError}</span>
          </div>
        )}

        <FormField label="Email" error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="username"
            inputMode="email"
            placeholder="you@agency.com"
            startIcon={<Mail />}
            {...register('email')}
          />
        </FormField>

        <FormField label="Password" error={errors.password?.message}>
          <Input
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Your password"
            startIcon={<Lock />}
            endSlot={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="grid size-8 place-items-center rounded-full text-subtle transition-colors hover:bg-surface hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            }
            {...register('password')}
          />
        </FormField>

        <Button type="submit" size="lg" loading={isSubmitting} className="mt-1 w-full">
          {isSubmitting ? 'Signing in…' : 'Sign in'}
          {!isSubmitting && <ArrowRight />}
        </Button>
      </form>

      <div className="mt-8">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="eyebrow">Demo accounts</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          Pick a role to fill in its credentials, then sign in.
        </p>
        <div
          className="mt-3 flex flex-wrap justify-center gap-1.5"
          role="group"
          aria-label="Demo accounts"
        >
          {DEMO_ACCOUNTS.map((a) => {
            const selected = email === a.email;
            return (
              <button
                key={a.role}
                type="button"
                onClick={() => fillDemo(a.email)}
                aria-pressed={selected}
                aria-label={`${ROLE_LABELS[a.role]} demo account (${a.email})`}
                className={cn(
                  'h-8 rounded-full border px-3.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  selected
                    ? 'border-ink bg-ink text-ink-foreground'
                    : 'border-border bg-surface-raised text-muted hover:border-border-strong hover:text-foreground',
                )}
              >
                {ROLE_LABELS[a.role]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
