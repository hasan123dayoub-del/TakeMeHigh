'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Brand } from '@/components/app-shell/brand';
import { FullPageLoader } from '@/components/app-shell/full-page-loader';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { LoginResponse } from '@/lib/auth-types';
import { defineMessages, useMessages } from '@/lib/i18n';

export const instant = false;

const m = defineMessages({
  ar: {
    title: 'تغيير كلمة المرور',
    firstTime: 'هذه أول مرة تدخل فيها. اختر كلمة مرور جديدة خاصة بك قبل المتابعة.',
    regular: 'اختر كلمة مرور جديدة. ستُغلق جلساتك الأخرى.',
    current: 'كلمة المرور الحالية',
    next: 'كلمة المرور الجديدة',
    confirm: 'تأكيد كلمة المرور الجديدة',
    rule: '10 محارف على الأقل، وتحتوي على حرف ورقم.',
    mismatch: 'كلمتا المرور غير متطابقتين',
    weak: 'كلمة المرور يجب أن تكون 10 محارف على الأقل وتحتوي على حرف ورقم',
    required: 'هذا الحقل مطلوب',
    save: 'حفظ كلمة المرور',
    done: 'تم تغيير كلمة المرور',
    back: 'رجوع',
  },
  en: {
    title: 'Change password',
    firstTime: 'This is your first sign-in. Choose your own password before continuing.',
    regular: 'Choose a new password. Your other sessions will be signed out.',
    current: 'Current password',
    next: 'New password',
    confirm: 'Confirm the new password',
    rule: 'At least 10 characters, with a letter and a digit.',
    mismatch: 'The passwords do not match',
    weak: 'The password needs at least 10 characters with a letter and a digit',
    required: 'This field is required',
    save: 'Save password',
    done: 'Password changed',
    back: 'Back',
  },
});

/** AUTH-10: the initial password must be changed at the first sign-in. */
export default function ChangePasswordPage() {
  const t = useMessages(m);
  const { status, user, adoptSession } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  const schema = useMemo(
    () =>
      z
        .object({
          currentPassword: z.string().min(1, { error: t.required }),
          newPassword: z.string().regex(/^(?=.*[A-Za-z؀-ۿ])(?=.*\d).{10,128}$/, { error: t.weak }),
          confirm: z.string(),
        })
        .refine((v) => v.newPassword === v.confirm, { error: t.mismatch, path: ['confirm'] }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { currentPassword: '', newPassword: '', confirm: '' } });

  if (status !== 'authenticated' || !user) return <FullPageLoader label="…" />;

  const onSubmit = form.handleSubmit(async (v) => {
    try {
      const res = await api.post<LoginResponse>('/auth/change-password', { currentPassword: v.currentPassword, newPassword: v.newPassword });
      adoptSession(res);
      toast.success(t.done);
      router.replace('/dashboard');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  });

  return (
    <div className="grid min-h-dvh flex-1 place-items-center bg-canvas p-4">
      <GlassPanel className="w-full max-w-md p-8">
        <Brand />
        <div className="mt-8 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-primary">
            <KeyRound className="size-5" aria-hidden />
          </span>
          <h1 className="font-display text-2xl font-light uppercase tracking-wide">{t.title}</h1>
        </div>
        <p className="mt-3 text-sm text-muted">{user.mustChangePassword ? t.firstTime : t.regular}</p>
        <form onSubmit={onSubmit} className="mt-6 grid gap-4" noValidate>
          <FormField label={t.current} error={form.formState.errors.currentPassword?.message} required>
            <Input type="password" autoComplete="current-password" dir="ltr" {...form.register('currentPassword')} />
          </FormField>
          <FormField label={t.next} hint={t.rule} error={form.formState.errors.newPassword?.message} required>
            <Input type="password" autoComplete="new-password" dir="ltr" {...form.register('newPassword')} />
          </FormField>
          <FormField label={t.confirm} error={form.formState.errors.confirm?.message} required>
            <Input type="password" autoComplete="new-password" dir="ltr" {...form.register('confirm')} />
          </FormField>
          <div className="mt-2 flex gap-2">
            <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="animate-spin" />} {t.save}
            </Button>
            {!user.mustChangePassword && (
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                {t.back}
              </Button>
            )}
          </div>
        </form>
      </GlassPanel>
    </div>
  );
}
