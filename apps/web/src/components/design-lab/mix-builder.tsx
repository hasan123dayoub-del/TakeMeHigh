"use client";

import { Braces, PanelLeft, Palette, Rows3, Shuffle, SwatchBook } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { coreChecks } from "./contrast";
import { DashboardPreview } from "./dashboard-preview";
import { ContrastRow, Label, ModeToggle, useCopy } from "./ui";
import { CONCEPTS, CONCEPT_BY_ID, gradientCss, type Mode, type ModeTokens } from "./tokens";

type Slot = "sidebar" | "surfaces" | "gradients" | "accent";

const SLOTS: { key: Slot; label: string; hint: string; icon: ReactNode }[] = [
  { key: "sidebar", label: "Sidebar", hint: "Navigation background, text, active state", icon: <PanelLeft className="size-3.5" /> },
  { key: "surfaces", label: "Background & surfaces", hint: "Canvas, cards, borders, text, glass", icon: <Rows3 className="size-3.5" /> },
  { key: "gradients", label: "Gradients", hint: "Hero banner, logo mark, avatar", icon: <Palette className="size-3.5" /> },
  { key: "accent", label: "Cards, buttons & accent", hint: "Primary, accent, status, chart palette, radius", icon: <SwatchBook className="size-3.5" /> },
];

export function composeMix(sel: Record<Slot, string>, mode: Mode): { tokens: ModeTokens; radius: number; uppercase: boolean } {
  const A = CONCEPT_BY_ID[sel.sidebar][mode];
  const B = CONCEPT_BY_ID[sel.surfaces][mode];
  const C = CONCEPT_BY_ID[sel.gradients][mode];
  const D = CONCEPT_BY_ID[sel.accent][mode];
  const tokens: ModeTokens = {
    primary: D.primary,
    primaryFg: D.primaryFg,
    secondary: D.secondary,
    accent: D.accent,
    success: D.success,
    warning: D.warning,
    error: D.error,
    info: D.info,
    chart: D.chart,
    background: B.background,
    surface: B.surface,
    border: B.border,
    text: B.text,
    textMuted: B.textMuted,
    glass: B.glass,
    gradients: C.gradients,
    sidebar: A.sidebar,
  };
  return {
    tokens,
    radius: CONCEPT_BY_ID[sel.accent].radius,
    uppercase: !!CONCEPT_BY_ID[sel.surfaces].uppercaseHeadings,
  };
}

const PRESET: Record<Slot, string> = {
  sidebar: "polar-night",
  surfaces: "cirrus",
  gradients: "horizon-dusk",
  accent: "boarding-pass",
};

export function MixBuilder({ globalMode, font }: { globalMode: Mode; font: string }) {
  const copy = useCopy();
  const [sel, setSel] = useState<Record<Slot, string>>(PRESET);
  const [modeOverride, setModeOverride] = useState<{ base: Mode; mode: Mode } | null>(null);
  const mode = modeOverride && modeOverride.base === globalMode ? modeOverride.mode : globalMode;

  const light = useMemo(() => composeMix(sel, "light"), [sel]);
  const dark = useMemo(() => composeMix(sel, "dark"), [sel]);
  const current = mode === "light" ? light : dark;

  const randomize = () => {
    const pick = () => CONCEPTS[Math.floor(Math.random() * CONCEPTS.length)].id;
    setSel({ sidebar: pick(), surfaces: pick(), gradients: pick(), accent: pick() });
  };

  const exportJson = () => {
    const payload = {
      name: "TravelOS custom mix",
      sources: Object.fromEntries(SLOTS.map((s) => [s.key, CONCEPT_BY_ID[sel[s.key]].name])),
      radius: current.radius,
      light: light.tokens,
      dark: dark.tokens,
    };
    copy(JSON.stringify(payload, null, 2), "mixed token set (JSON)");
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="space-y-5 rounded-[22px] border border-[var(--c-border)] bg-[var(--c-surface)] p-5">
        <div className="flex items-center justify-between gap-2">
          <ModeToggle mode={mode} onChange={(m) => setModeOverride({ base: globalMode, mode: m })} />
          <button
            type="button"
            onClick={randomize}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] px-3 py-1.5 text-[11px] font-medium text-[var(--c-muted)] hover:text-[var(--c-text)]"
          >
            <Shuffle className="size-3" /> Shuffle
          </button>
        </div>

        {SLOTS.map((slot) => {
          const src = CONCEPT_BY_ID[sel[slot.key]][mode];
          const preview =
            slot.key === "sidebar"
              ? [src.sidebar.bg, src.sidebar.active, src.sidebar.activeText]
              : slot.key === "surfaces"
                ? [src.background, src.surface, src.text]
                : slot.key === "accent"
                  ? [src.primary, src.accent, ...src.chart.slice(0, 3)]
                  : [];
          return (
            <label key={slot.key} className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--c-text)]">
                {slot.icon}
                {slot.label}
              </span>
              <span className="mb-2 block text-[11px] text-[var(--c-faint)]">{slot.hint}</span>
              <span className="flex items-center gap-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-raised)] p-1.5 pr-2 focus-within:border-[var(--c-text)]">
                <span className="flex h-7 w-16 shrink-0 overflow-hidden rounded-lg">
                  {slot.key === "gradients" ? (
                    <span className="flex-1" style={{ background: gradientCss(src.gradients[0]) }} />
                  ) : (
                    preview.map((c, i) => <span key={i} className="flex-1" style={{ background: c }} />)
                  )}
                </span>
                <select
                  value={sel[slot.key]}
                  onChange={(e) => setSel((s) => ({ ...s, [slot.key]: e.target.value }))}
                  className="min-w-0 flex-1 cursor-pointer bg-transparent text-[13px] font-medium text-[var(--c-text)] outline-none"
                >
                  {CONCEPTS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </span>
            </label>
          );
        })}

        <div>
          <Label>Contrast of this mix ({mode})</Label>
          {coreChecks(current.tokens).map((c) => (
            <ContrastRow key={c.label} check={c} />
          ))}
        </div>

        <button
          type="button"
          onClick={exportJson}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--c-invert)] px-4 py-2.5 text-[13px] font-semibold text-[var(--c-invert-fg)] transition-opacity hover:opacity-90"
        >
          <Braces className="size-4" /> Copy token set as JSON
        </button>
        <p className="text-[11px] leading-relaxed text-[var(--c-faint)]">
          Exports both light and dark tokens of the mix. Mixing can break contrast between, e.g., one concept&apos;s surfaces and
          another&apos;s primary; the check above updates live.
        </p>
      </div>

      <div className="min-w-0 rounded-[22px] border border-[var(--c-border)] bg-[var(--c-surface)] p-3 sm:p-5">
        <DashboardPreview t={current.tokens} radius={current.radius} fontFamily={font} uppercaseHeadings={current.uppercase} minHeight={600} />
      </div>
    </div>
  );
}
