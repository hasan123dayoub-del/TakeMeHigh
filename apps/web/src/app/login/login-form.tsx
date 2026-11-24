'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { ApiError, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { defineMessages, fmt, useMessages } from '@/lib/i18n';
import { common } from '@/lib/i18n/common';

const m = defineMessages({
  ar: {
    email: 'البريد الإلكتروني',
    emailRequired: 'أدخل بريدك الإلكتروني',
    emailInvalid: 'أدخل بريداً إلكترونياً صحيحاً',
    password: 'كلمة المرور',
    passwordPlaceholder: 'كلمة المرور',
    passwordRequired: 'أدخل كلمة المرور',
    show: 'إظهار كلمة المرور',
    hide: 'إخفاء كلمة المرور',
    signIn: 'تسجيل الدخول',
    signingIn: 'جارٍ تسجيل الدخول…',
    wrong: 'البريد الإلكتروني وكلمة المرور غير متطابقين. تحقّق منهما وحاول مجدداً.',
    tooMany: 'محاولات كثيرة. انتظر دقيقة ثم حاول مجدداً.',
    locked: 'تم قفل الحساب مؤقتاً بعد 5 محاولات فاشلة. حاول بعد 15 دقيقة أو اطلب من المدير إعادة تعيين كلمة المرور.',
    welcome: 'أهلاً {name}',
    signedInTo: '{role} · {branch}',
    allBranches: 'كل الفروع',
  },
  en: {
    email: 'Email',
    emailRequired: 'Enter your email address',
    emailInvalid: 'Enter a valid email address',
    password: 'Password',
    passwordPlaceholder: 'Your password',
    passwordRequired: 'Enter your password',
    show: 'Show password',
    hide: 'Hide password',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    wrong: "That email and password don't match. Check them and try again.",
    tooMany: 'Too many sign-in attempts. Wait a minute, then try again.',
    locked: 'The account is locked for 15 minutes after 5 failed attempts. Try later or ask the admin to reset your password.',
    welcome: 'Welcome, {name}',
    signedInTo: '{role} · {branch}',
    allBranches: 'All branches',
  },
});

/** Only same-origin dashboard paths are allowed as post-login destinations (no open redirect). */
function safeNext() {
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/dashboard') && !next.startsWith('//') ? next : '/dashboard';
}

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const t = useMessages(m);
  const c = useMessages(common);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().trim().min(1, { error: t.emailRequired }).pipe(z.email({ error: t.emailInvalid })),
        password: z.string().min(1, { error: t.passwordRequired }),
      }),
    [t],
  );
  type Values = z.input<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' }, mode: 'onTouched' });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const user = await login(values.email.trim(), values.password);
      toast.success(fmt(t.welcome, { name: user.fullName.split(' ')[0] }), {
        description: fmt(t.signedInTo, { role: user.role.nameAr, branch: user.branch?.name ?? t.allBranches }),
      });
      router.replace(user.mustChangePassword ? '/change-password' : safeNext());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401 && /Too many/.test(err.message)) setFormError(t.locked);
      else if (err instanceof ApiError && err.status === 401) setFormError(t.wrong);
      else if (err instanceof ApiError && err.status === 429) setFormError(t.tooMany);
      else if (err instanceof ApiError && err.isNetwork) setFormError(c.networkError);
      else setFormError(errorMessage(err));
    }
  });

  return (
    <div className="mt-8">
      <form onSubmit={onSubmit} noValidate className="grid gap-5" aria-describedby={formError ? 'login-error' : undefined}>
        {formError && (
          <div
            id="login-error"
            role="alert"
            className="flex items-start gap-2.5 rounded-tile border border-danger/25 bg-danger/8 px-3.5 py-3 text-[14px] text-[color-mix(in_srgb,var(--danger)_80%,var(--text))] animate-fade-in"
          >
            <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />
            <span>{formError}</span>
          </div>
        )}

        <FormField label={t.email} error={errors.email?.message}>
          <Input type="email" dir="ltr" autoComplete="username" inputMode="email" placeholder="you@office.com" startIcon={<Mail />} {...register('email')} />
        </FormField>

        <FormField label={t.password} error={errors.password?.message}>
          <Input
            type={showPassword ? 'text' : 'password'}
            dir="ltr"
            autoComplete="current-password"
            placeholder={t.passwordPlaceholder}
            startIcon={<Lock />}
            endSlot={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? t.hide : t.show}
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
          {isSubmitting ? t.signingIn : t.signIn}
          {!isSubmitting && <ArrowRight className="rtl-flip" />}
        </Button>
      </form>
    </div>
  );
}
