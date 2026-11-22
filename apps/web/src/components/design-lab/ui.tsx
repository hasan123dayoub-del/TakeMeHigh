"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Moon, Sun } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "./cn";
import { contrastRatio, grade, type ContrastCheck } from "./contrast";
import { MONO } from "./fonts";
import type { Mode } from "./tokens";

// Neutral chrome for the gallery itself, so the concepts stand out.
export const CHROME: Record<Mode, Record<string, string>> = {
  light: {
    "--c-bg": "#F7F7F5",
    "--c-surface": "#FFFFFF",
    "--c-raised": "#FBFBFA",
    "--c-border": "#E7E6E3",
    "--c-border-strong": "#D6D4CF",
    "--c-text": "#111110",
    "--c-muted": "#6B6A66",
    "--c-faint": "#9C9A95",
    "--c-invert": "#111110",
    "--c-invert-fg": "#FAFAF9",
    "--c-pass": "#15803D",
    "--c-fail": "#B91C1C",
    "--c-warn": "#A16207",
  },
  dark: {
    "--c-bg": "#0A0A0B",
    "--c-surface": "#111113",
    "--c-raised": "#161618",
    "--c-border": "#232326",
    "--c-border-strong": "#323236",
    "--c-text": "#F4F4F5",
    "--c-muted": "#A1A1AA",
    "--c-faint": "#71717A",
    "--c-invert": "#F4F4F5",
    "--c-invert-fg": "#0A0A0B",
    "--c-pass": "#4ADE80",
    "--c-fail": "#F87171",
    "--c-warn": "#FACC15",
  },
};

// ---------------------------------------------------------------------------
// Copy-to-clipboard with a small toast
// ---------------------------------------------------------------------------

type CopyFn = (text: string, label?: string) => void;
const CopyContext = createContext<CopyFn>(() => {});
export const useCopy = () => useContext(CopyContext);

export function CopyProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; label: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback<CopyFn>((text, label) => {
    const done = () => {
      const id = Date.now();
      setToast({ id, label: label ?? text });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setToast(null), 1600);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done, () => setToast({ id: Date.now(), label: "Copy failed" }));
    }
  }, []);

  return (
    <CopyContext.Provider value={copy}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center" aria-live="polite">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className="flex items-center gap-2 rounded-full bg-[var(--c-invert)] px-4 py-2 text-xs font-medium text-[var(--c-invert-fg)] shadow-2xl"
            >
              <Check className="size-3.5" />
              Copied <span style={{ fontFamily: MONO }}>{toast.label}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </CopyContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = "md",
  className,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center rounded-full border border-[var(--c-border)] bg-[var(--c-raised)] p-0.5",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-full font-medium transition-colors",
              size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
              active ? "text-[var(--c-invert-fg)]" : "text-[var(--c-muted)] hover:text-[var(--c-text)]",
            )}
          >
            {active && <span className="absolute inset-0 rounded-full bg-[var(--c-invert)] shadow-sm" />}
            <span className="relative inline-flex items-center gap-1.5">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ModeToggle({ mode, onChange, size = "sm" }: { mode: Mode; onChange: (m: Mode) => void; size?: "sm" | "md" }) {
  return (
    <Segmented
      ariaLabel="Colour mode"
      size={size}
      value={mode}
      onChange={onChange}
      options={[
        { value: "light", label: <><Sun className="size-3" /> Light</> },
        { value: "dark", label: <><Moon className="size-3" /> Dark</> },
      ]}
    />
  );
}

export function Swatch({ label, hex, compact }: { label: string; hex: string; compact?: boolean }) {
  const copy = useCopy();
  return (
    <button
      type="button"
      onClick={() => copy(hex, `${label} ${hex}`)}
      className="group flex min-w-0 items-center gap-2 rounded-lg p-1 text-left transition-colors hover:bg-[var(--c-raised)]"
      title={`Copy ${hex}`}
    >
      <span
        className={cn("shrink-0 rounded-md", compact ? "size-6" : "size-8")}
        style={{ background: hex, boxShadow: "inset 0 0 0 1px rgba(127,127,127,0.25)" }}
      />
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-medium text-[var(--c-text)]">{label}</span>
        <span className="flex items-center gap-1 text-[10.5px] text-[var(--c-muted)]" style={{ fontFamily: MONO }}>
          {hex.toUpperCase()}
          <Copy className="size-2.5 opacity-0 transition-opacity group-hover:opacity-100" />
        </span>
      </span>
    </button>
  );
}

export function ChipStrip({ colors, label }: { colors: string[]; label?: string }) {
  const copy = useCopy();
  return (
    <div>
      {label && <div className="mb-1.5 text-[11px] font-medium text-[var(--c-muted)]">{label}</div>}
      <div className="flex overflow-hidden rounded-lg border border-[var(--c-border)]">
        {colors.map((c, i) => (
          <button
            key={`${c}-${i}`}
            type="button"
            onClick={() => copy(c, c)}
            title={`Copy ${c}`}
            className="group flex h-12 flex-1 items-end p-1.5 transition-[flex] hover:flex-[1.6]"
            style={{ background: c }}
          >
            <span
              className="rounded px-1 text-[9px] font-medium"
              style={{
                fontFamily: MONO,
                background: "rgba(255,255,255,0.85)",
                color: "#111",
              }}
            >
              {c.toUpperCase()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function GradeBadge({ ratio }: { ratio: number }) {
  const gr = grade(ratio);
  const color = gr === "Fail" ? "var(--c-fail)" : gr === "AA Large" ? "var(--c-warn)" : "var(--c-pass)";
  return (
    <span
      className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      {ratio >= 4.5 ? `AA pass${gr === "AAA" ? " · AAA" : ""}` : gr === "AA Large" ? "AA fail · large only" : "AA fail"}
    </span>
  );
}

export function ContrastRow({ check }: { check: ContrastCheck }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span
        className="grid h-7 w-9 shrink-0 place-items-center rounded-md text-[12px] font-semibold"
        style={{ background: check.bg, color: check.fg, boxShadow: "inset 0 0 0 1px rgba(127,127,127,0.25)" }}
      >
        Aa
      </span>
      <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--c-muted)]">{check.label}</span>
      <span className="text-[11px] font-semibold tabular-nums text-[var(--c-text)]" style={{ fontFamily: MONO }}>
        {check.ratio.toFixed(2)}:1
      </span>
      <GradeBadge ratio={check.ratio} />
    </div>
  );
}

export function ButtonVariantRow({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  const ratio = contrastRatio(fg, bg);
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span
        className="inline-flex h-7 shrink-0 items-center rounded-full px-3 text-[11px] font-semibold"
        style={{ background: bg, color: fg }}
      >
        New booking
      </span>
      <span className="min-w-0 flex-1 text-[11px] leading-tight text-[var(--c-muted)]">
        {label}
        <span className="block" style={{ fontFamily: MONO }}>
          {fg.toUpperCase()} on {bg.toUpperCase()}
        </span>
      </span>
      <span className="text-[11px] font-semibold tabular-nums" style={{ fontFamily: MONO }}>
        {ratio.toFixed(2)}:1
      </span>
      <GradeBadge ratio={ratio} />
    </div>
  );
}

export function ScoreBar({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_88px_20px] items-center gap-2.5">
      <span className="truncate text-[11px] text-[var(--c-muted)]">{label}</span>
      <span className="h-1.5 overflow-hidden rounded-full bg-[var(--c-border)]">
        <motion.span
          className="block h-full rounded-full"
          style={{ background: color ?? "var(--c-text)" }}
          initial={{ width: 0 }}
          whileInView={{ width: `${value * 10}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </span>
      <span className="text-right text-[11px] font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  children,
  style,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div className="mb-8 max-w-3xl" style={style}>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--c-faint)]">{eyebrow}</div>
      <h2 className="text-2xl font-semibold tracking-tight text-[var(--c-text)] sm:text-3xl">{title}</h2>
      {children && <div className="mt-3 text-sm leading-relaxed text-[var(--c-muted)]">{children}</div>}
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--c-faint)]">{children}</div>;
}
