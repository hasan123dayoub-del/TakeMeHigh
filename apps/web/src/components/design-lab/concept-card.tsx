"use client";

import { motion } from "motion/react";
import { Braces, Check, Columns3, Minus, Plus, Sparkles } from "lucide-react";
import { coreChecks } from "./contrast";
import { DashboardPreview } from "./dashboard-preview";
import { MONO } from "./fonts";
import { cn } from "./cn";
import {
  ButtonVariantRow,
  ChipStrip,
  ContrastRow,
  Label,
  ModeToggle,
  ScoreBar,
  Swatch,
  useCopy,
} from "./ui";
import { SCORE_LABELS, gradientCss, overallScore, type Concept, type Mode, type ModeTokens, type ScoreKey } from "./tokens";

export const TOKEN_FIELDS: { key: keyof ModeTokens; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "primaryFg", label: "On primary" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent" },
  { key: "background", label: "Background" },
  { key: "surface", label: "Surface" },
  { key: "border", label: "Border" },
  { key: "text", label: "Text primary" },
  { key: "textMuted", label: "Text secondary" },
  { key: "success", label: "Success" },
  { key: "warning", label: "Warning" },
  { key: "error", label: "Error" },
  { key: "info", label: "Info" },
];

export function conceptJson(c: Concept) {
  return JSON.stringify(
    {
      name: c.name,
      id: c.id,
      font: c.font,
      radius: c.radius,
      ...(c.scale ? { scale: Object.fromEntries(c.scale.steps) } : {}),
      light: c.light,
      dark: c.dark,
    },
    null,
    2,
  );
}

export function TokenPanel({ t }: { t: ModeTokens }) {
  return (
    <div className="space-y-5">
      <div>
        <Label>Core tokens</Label>
        <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 sm:grid-cols-3">
          {TOKEN_FIELDS.map((f) => (
            <Swatch key={f.key} label={f.label} hex={t[f.key] as string} compact />
          ))}
        </div>
      </div>
      <ChipStrip label={t.chart.length > 5 ? "Chart palette (5 + target series)" : "Chart palette"} colors={t.chart} />
      <div>
        <Label>Gradients</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {t.gradients.map((gr) => (
            <GradientChip key={gr.name} name={gr.name} css={gradientCss(gr)} stops={gr.stops} ink={gr.ink} />
          ))}
        </div>
      </div>
    </div>
  );
}

function GradientChip({ name, css, stops, ink }: { name: string; css: string; stops: string[]; ink: string }) {
  const copy = useCopy();
  return (
    <button
      type="button"
      onClick={() => copy(css, `${name} gradient`)}
      className="flex h-[68px] flex-col justify-between rounded-xl p-2.5 text-left transition-transform hover:-translate-y-0.5"
      style={{ background: css, color: ink }}
      title="Copy CSS gradient"
    >
      <span className="text-[11px] font-semibold">{name}</span>
      <span className="text-[9.5px] opacity-90" style={{ fontFamily: MONO }}>
        {stops.map((s) => s.toUpperCase()).join(" → ")}
      </span>
    </button>
  );
}

export function ScalePanel({ scale }: { scale: NonNullable<Concept["scale"]> }) {
  const copy = useCopy();
  return (
    <div>
      <Label>{scale.name} scale · 50–950</Label>
      <div className="grid grid-cols-11 overflow-hidden rounded-xl border border-[var(--c-border)]">
        {scale.steps.map(([step, hex], i) => (
          <button
            key={step}
            type="button"
            onClick={() => copy(hex, `${scale.name.toLowerCase()}-${step} ${hex}`)}
            title={`Copy ${hex}`}
            className="flex h-20 flex-col justify-between p-1 text-left transition-[filter] hover:brightness-105"
            style={{ background: hex, color: i < 5 ? "#111418" : "#FFFFFF" }}
          >
            <span className="text-[9px] font-semibold">{step}</span>
            <span className="text-[7.5px] leading-tight sm:text-[8.5px]" style={{ fontFamily: MONO }}>
              {hex.slice(1).toUpperCase()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ContrastPanel({ concept, light, dark }: { concept?: Concept; light: ModeTokens; dark: ModeTokens }) {
  return (
    <div>
      <Label>WCAG contrast (computed)</Label>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {(["light", "dark"] as Mode[]).map((m) => (
          <div key={m} className="rounded-xl border border-[var(--c-border)] px-3 py-1.5">
            <div className="pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--c-faint)]">{m} mode</div>
            {coreChecks(m === "light" ? light : dark).map((c) => (
              <ContrastRow key={c.label} check={c} />
            ))}
          </div>
        ))}
      </div>
      {concept?.buttonVariants && (
        <div className="mt-3 rounded-xl border border-[var(--c-border)] px-3 py-1.5">
          <div className="pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--c-faint)]">
            Primary button: reference shade vs AA-compliant
          </div>
          {concept.buttonVariants.map((b) => (
            <ButtonVariantRow key={b.label} {...b} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ScoresPanel({ concept }: { concept: Concept }) {
  const overall = overallScore(concept);
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <Label>Scores</Label>
        <span className="text-[11px] text-[var(--c-muted)]">
          Overall{" "}
          <span className="text-lg font-semibold tabular-nums text-[var(--c-text)]">{overall.toFixed(2)}</span>
          <span className="text-[var(--c-faint)]"> / 10</span>
        </span>
      </div>
      <div className="space-y-2">
        {(Object.keys(SCORE_LABELS) as ScoreKey[]).map((k) => (
          <ScoreBar key={k} label={SCORE_LABELS[k]} value={concept.scores[k]} color={concept.light.primary} />
        ))}
      </div>
    </div>
  );
}

type Props = {
  concept: Concept;
  index: number;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  font: string;
  inCompare: boolean;
  onToggleCompare: () => void;
};

export function ConceptCard({ concept, index, mode, onModeChange, font, inCompare, onToggleCompare }: Props) {
  const copy = useCopy();
  const t = concept[mode];
  return (
    <motion.article
      id={concept.id}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "scroll-mt-24 overflow-hidden rounded-[22px] border bg-[var(--c-surface)]",
        concept.badge ? "border-[var(--c-border-strong)] shadow-[0_30px_80px_-40px_rgba(63,112,171,0.45)]" : "border-[var(--c-border)]",
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--c-border)] p-5 sm:p-6">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] text-[var(--c-muted)]">
            <span className="tabular-nums text-[var(--c-faint)]" style={{ fontFamily: MONO }}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{concept.inspiration}</span>
            {concept.badge ? (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: "#1C1C1E", color: "#FFFFFF" }}
              >
                <Sparkles className="size-3" /> {concept.badge}
              </span>
            ) : (
              concept.original && (
                <span className="rounded-full border border-[var(--c-border-strong)] px-2 py-0.5 text-[10px] font-semibold text-[var(--c-text)]">
                  Original direction
                </span>
              )
            )}
          </div>
          <h3 className="flex items-center gap-3 text-xl font-semibold tracking-tight text-[var(--c-text)] sm:text-2xl">
            <span className="flex -space-x-1.5">
              {[concept.light.primary, concept.light.accent, concept.dark.background].map((c, i) => (
                <span key={i} className="size-4 rounded-full ring-2 ring-[var(--c-surface)]" style={{ background: c }} />
              ))}
            </span>
            {concept.name}
          </h3>
          <p className="mt-1 text-sm text-[var(--c-muted)]">{concept.tagline}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ModeToggle mode={mode} onChange={onModeChange} />
          <button
            type="button"
            onClick={onToggleCompare}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
              inCompare
                ? "border-[var(--c-invert)] bg-[var(--c-invert)] text-[var(--c-invert-fg)]"
                : "border-[var(--c-border)] text-[var(--c-muted)] hover:text-[var(--c-text)]",
            )}
          >
            {inCompare ? <Check className="size-3" /> : <Columns3 className="size-3" />}
            {inCompare ? "In compare" : "Compare"}
          </button>
          <button
            type="button"
            onClick={() => copy(conceptJson(concept), `${concept.name} tokens (JSON)`)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] px-3 py-1.5 text-[11px] font-medium text-[var(--c-muted)] transition-colors hover:text-[var(--c-text)]"
          >
            <Braces className="size-3" /> JSON
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6 border-b border-[var(--c-border)] p-4 sm:p-6 xl:border-b-0 xl:border-r">
          <DashboardPreview t={t} radius={concept.radius} fontFamily={font} uppercaseHeadings={concept.uppercaseHeadings} />
          <p className="max-w-3xl text-sm leading-relaxed text-[var(--c-muted)]">{concept.description}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <ProsCons title="Strengths" items={concept.strengths} positive />
            <ProsCons title="Weaknesses" items={concept.weaknesses} />
          </div>
          {concept.scale && <ScalePanel scale={concept.scale} />}
        </div>
        <div className="space-y-6 p-5 sm:p-6">
          <TokenPanel t={t} />
          <ContrastPanel concept={concept} light={concept.light} dark={concept.dark} />
          <ScoresPanel concept={concept} />
        </div>
      </div>
    </motion.article>
  );
}

function ProsCons({ title, items, positive }: { title: string; items: string[]; positive?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--c-border)] p-4">
      <Label>{title}</Label>
      <ul className="space-y-2">
        {items.map((s) => (
          <li key={s} className="flex gap-2 text-[12.5px] leading-relaxed text-[var(--c-text)]">
            <span
              className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full"
              style={{
                color: positive ? "var(--c-pass)" : "var(--c-fail)",
                background: `color-mix(in srgb, ${positive ? "var(--c-pass)" : "var(--c-fail)"} 12%, transparent)`,
              }}
            >
              {positive ? <Plus className="size-2.5" strokeWidth={3} /> : <Minus className="size-2.5" strokeWidth={3} />}
            </span>
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
