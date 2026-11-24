'use client';

import { ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { api, errorMessage } from '@/lib/api';
import { defineMessages, useMessages } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const m = defineMessages({
  ar: {
    choose: 'اختر صورة',
    replace: 'استبدال',
    remove: 'إزالة',
    uploading: 'جارٍ الرفع…',
    rules: 'JPEG أو PNG أو WebP حتى 5 ميغابايت. يحوّلها الخادم إلى WebP.',
    badType: 'الصيغ المقبولة: JPEG وPNG وWebP فقط',
    tooBig: 'حجم الصورة أكبر من 5 ميغابايت',
  },
  en: {
    choose: 'Choose image',
    replace: 'Replace',
    remove: 'Remove',
    uploading: 'Uploading…',
    rules: 'JPEG, PNG or WebP up to 5 MB. The server converts it to WebP.',
    badType: 'Only JPEG, PNG and WebP images are accepted',
    tooBig: 'The image is larger than 5 MB',
  },
});

/** Client-side check (CMS-05); the server validates again by the file's real bytes. */
export function checkImage(file: File, t: { badType: string; tooBig: string }) {
  if (!IMAGE_TYPES.includes(file.type)) return t.badType;
  if (file.size > MAX_IMAGE_BYTES) return t.tooBig;
  return null;
}

/** POST /uploads/images (multipart field `file`) → public URL. */
export async function uploadImage(file: File) {
  const body = new FormData();
  body.append('file', file);
  const res = await api.post<{ url: string }>('/uploads/images', body);
  return res.url;
}

/** Hook that validates, uploads and toasts errors. */
export function useImageUploader() {
  const t = useMessages(m);
  const [busy, setBusy] = useState(false);
  const upload = async (files: File[]) => {
    const urls: string[] = [];
    setBusy(true);
    try {
      for (const file of files) {
        const problem = checkImage(file, t);
        if (problem) {
          toast.error(`${file.name}: ${problem}`);
          continue;
        }
        try {
          urls.push(await uploadImage(file));
        } catch (e) {
          toast.error(`${file.name}: ${errorMessage(e)}`);
        }
      }
    } finally {
      setBusy(false);
    }
    return urls;
  };
  return { upload, busy };
}

/** One image with preview, upload/replace and remove. */
export function ImageField({
  value,
  onChange,
  aspect = 'aspect-[16/9]',
  className,
  label,
  fit = 'cover',
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  aspect?: string;
  className?: string;
  label: string;
  fit?: 'cover' | 'contain';
}) {
  const t = useMessages(m);
  const input = useRef<HTMLInputElement>(null);
  const { upload, busy } = useImageUploader();

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    const [url] = await upload([files[0]]);
    if (url) onChange(url);
    if (input.current) input.current.value = '';
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <div
        className={cn('relative overflow-hidden rounded-tile border border-dashed border-border-strong bg-surface-sunken', aspect)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void pick(e.dataTransfer.files);
        }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className={cn('absolute inset-0 size-full', fit === 'cover' ? 'object-cover' : 'object-contain p-4')} />
        ) : (
          <button type="button" onClick={() => input.current?.click()} className="absolute inset-0 grid place-items-center text-muted hover:text-foreground" aria-label={`${t.choose}: ${label}`}>
            <span className="flex flex-col items-center gap-2 text-xs">
              <ImagePlus className="size-6" aria-hidden />
              {t.choose}
            </span>
          </button>
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-surface-raised/70 text-sm">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> {t.uploading}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="xs" variant="secondary" onClick={() => input.current?.click()} disabled={busy}>
          <Upload /> {value ? t.replace : t.choose}
        </Button>
        {value && (
          <Button type="button" size="xs" variant="ghost" onClick={() => onChange(null)} disabled={busy}>
            <Trash2 /> {t.remove}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted">{t.rules}</p>
      <input ref={input} type="file" accept={IMAGE_TYPES.join(',')} className="hidden" onChange={(e) => void pick(e.target.files)} />
    </div>
  );
}

export const imageMessages = m;
