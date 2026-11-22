"use client";

import { Check } from "lucide-react";
import { coreChecks } from "./contrast";
import { DashboardPreview } from "./dashboard-preview";
import { cn } from "./cn";
import { MONO } from "./fonts";
import { GradeBadge, Label } from "./ui";
import { CONCEPTS, CONCEPT_BY_ID, SCORE_LABELS, overallScore, type FontKey, type Mode, type ScoreKey } from "./tokens";

export function Compare({
  ids,
  onToggle,
  mode,
  fontFor,
}: {
  ids: string[];
  onToggle: (id: string) => void;
  mode: Mode;
  fontFor: (k: FontKey) => string;
}) {
  const chosen = ids.map((id) => CONCEPT_BY_ID[id]).filter(Boolean);
  const cols = chosen.length === 3 ? "xl:grid-cols-3" : chosen.length === 2 ? "lg:grid-cols-2" : "";
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[11px] font-medium text-[var(--c-faint)]">{ids.length}/3 selected</span>
        {CONCEPTS.map((c) => {
          const on = ids.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onToggle(c.id)}
              aria-pressed={on}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[12px] font-medium transition-colors",
                on
                  ? "border-[var(--c-invert)] bg-[var(--c-invert)] text-[var(--c-invert-fg)]"
                  : "border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-muted)] hover:text-[var(--c-text)]",
              )}
            >
              <span className="flex h-5 w-8 overflow-hidden rounded-full">
                <span className="flex-1" style={{ background: c[mode].primary }} />
                <span className="flex-1" style={{ background: c[mode].accent }} />
                <span className="flex-1" style={{ background: c[mode].background }} />
              </span>
              {on && <Check className="size-3" />}
              {c.name}
            </button>
          );
        })}
      </div>

      {chosen.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[var(--c-border-strong)] p-12 text-center text-sm text-[var(--c-muted)]">
          Pick two or three concepts to compare them side by side.
        </div>
      ) : (
        <div className={cn("grid grid-cols-1 gap-4", cols)}>
          {chosen.map((c) => {
            const t = c[mode];
            return (
              <div key={c.id} className="min-w-0 rounded-[22px] border border-[var(--c-border)] bg-[var(--c-surface)] p-3 sm:p-4">
                <div className="mb-3 flex items-baseline justify-between gap-2 px-1">
                  <div className="text-base font-semibold tracking-tight">{c.name}</div>
                  <div className="text-xs text-[var(--c-muted)]">
                    <span className="text-lg font-semibold tabular-nums text-[var(--c-text)]">{overallScore(c).toFixed(2)}</span> / 10
                  </div>
                </div>
                <DashboardPreview t={t} radius={c.radius} fontFamily={fontFor(c.font)} uppercaseHeadings={c.uppercaseHeadings} minHeight={520} />
                <div className="mt-4 grid gap-4 px-1 sm:grid-cols-2">
                  <div>
                    <Label>Scores</Label>
                    <div className="space-y-1">
                      {(Object.keys(SCORE_LABELS) as ScoreKey[]).map((k) => (
                        <div key={k} className="flex justify-between gap-2 text-[11px]">
                          <span className="truncate text-[var(--c-muted)]">{SCORE_LABELS[k]}</span>
                          <span className="font-semibold tabular-nums">{c.scores[k]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Contrast ({mode})</Label>
                    <div className="space-y-1.5">
                      {coreChecks(t).map((ch) => (
                        <div key={ch.label} className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="tabular-nums" style={{ fontFamily: MONO }}>
                            {ch.ratio.toFixed(2)}
                          </span>
                          <span className="truncate text-[var(--c-muted)]">{ch.label.split(" /")[0]}</span>
                          <GradeBadge ratio={ch.ratio} />
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex h-6 overflow-hidden rounded-md">
                      {t.chart.map((col, i) => (
                        <span key={i} className="flex-1" style={{ background: col }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
