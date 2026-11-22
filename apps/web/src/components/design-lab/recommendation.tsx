"use client";

import { ArrowRight, Trophy } from "lucide-react";
import { MONO } from "./fonts";
import { FONT_OPTIONS } from "./fonts";
import { RANKED, SCORE_LABELS, gradientCss, overallScore, type ScoreKey } from "./tokens";

const WHY: Record<string, { headline: string; points: string[] }> = {
  "boarding-pass": {
    headline: "The only palette that tells a travel story by itself.",
    points: [
      "It is built from an object every traveller recognises, so judges 'get' it in a second, even with no travel content on screen.",
      "Ink-navy primary and paper surfaces stay sober enough for finance, invoices and reports; orange is rationed to signals.",
      "Two moods for the price of one: paper ticket by day, departure board by night. Both modes pass AA on every core check.",
    ],
  },
  "terracotta-sea": {
    headline: "The most ownable warm direction.",
    points: [
      "Teal + terracotta is rare in SaaS, so it is remembered after a dozen demos of blue dashboards.",
      "Warmth suits customer-facing artefacts (itineraries, vouchers, invoices) better than any blue.",
      "Teal primary gives 7.5:1 with white text in light mode; contrast is not a compromise here.",
    ],
  },
  cirrus: {
    headline: "The most modern and polished surface, close to your reference.",
    points: [
      "Glass panel + ink-black pills + sky scale looks like a 2026 product and keeps the airy, premium feel you liked.",
      "The 11-step sky scale gives a complete system for charts, badges, hover and active states.",
      "Honest caveat: the reference's #7FA7D3 button with white text fails AA (2.51:1). Use sky-600 #3F70AB (5.10:1) or ink text on sky-400 (7.36:1).",
    ],
  },
};

export function Recommendation() {
  const top = RANKED.slice(0, 3);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {top.map((c, i) => {
          const why = WHY[c.id];
          const font = FONT_OPTIONS.find((f) => f.key === c.font);
          return (
            <div key={c.id} className="relative overflow-hidden rounded-[22px] border border-[var(--c-border)] bg-[var(--c-surface)]">
              <div className="relative h-28 p-5" style={{ background: c.light.glass ? c.light.glass.canvas : gradientCss(c.light.gradients[0]) }}>
                <div
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{ background: "rgba(255,255,255,0.9)", color: "#111" }}
                >
                  <Trophy className="size-3" /> #{i + 1} · {overallScore(c).toFixed(2)}
                </div>
                <div className="absolute bottom-3 right-4 flex gap-1">
                  {c.light.chart.slice(0, 5).map((col, j) => (
                    <span key={j} className="size-4 rounded-full ring-2 ring-white/70" style={{ background: col }} />
                  ))}
                </div>
              </div>
              <div className="p-5">
                <a href={`#${c.id}`} className="group inline-flex items-center gap-1.5 text-lg font-semibold tracking-tight">
                  {c.name}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </a>
                <p className="mt-1 text-sm font-medium text-[var(--c-text)]">{why?.headline}</p>
                <ul className="mt-3 space-y-2">
                  {why?.points.map((p) => (
                    <li key={p} className="text-[12.5px] leading-relaxed text-[var(--c-muted)]">
                      {p}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 text-[11px] text-[var(--c-faint)]">
                  Suggested type: <span className="font-semibold text-[var(--c-text)]">{font?.label}</span> · radius {c.radius}px
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-[22px] border border-[var(--c-border)] bg-[var(--c-surface)] p-5 text-sm leading-relaxed text-[var(--c-muted)]">
        <p>
          <span className="font-semibold text-[var(--c-text)]">Why these three beat the rest. </span>
          Every concept here passes AA on its core pairs, so the decision is about identity, not accessibility. The blue
          family (Polar Night, Ocean Blue, Glacier, Arctic Silver, Cloud Steel) scores highest on enterprise suitability
          and readability, but they look like most B2B dashboards; Polar Night is the best of them and ties Cirrus on
          score, only losing on premium feel. The luxury directions (Sand &amp; Gold, Dark Luxury, Sapphire &amp; Champagne)
          look expensive but say &ldquo;hotel&rdquo; or &ldquo;fashion&rdquo; more than &ldquo;travel operations&rdquo;. Midnight Emerald is
          excellent for finance screens but its green primary collides with &ldquo;success&rdquo; states. Horizon Dusk and
          Cirrus Deep are strong, yet slightly too consumer-leaning for an operations tool.
        </p>
        <p className="mt-3">
          <span className="font-semibold text-[var(--c-text)]">A pragmatic path: </span>
          Boarding Pass as the product identity; borrow Cirrus&apos;s ink-black active pills and sky scale for the marketing
          and login screens if you want the airy feel from your reference. Scores are a design judgement, not
          user-research data.
        </p>
      </div>

      <div className="overflow-x-auto rounded-[22px] border border-[var(--c-border)] bg-[var(--c-surface)]">
        <table className="w-full min-w-[920px] text-left text-[12px]">
          <thead className="text-[10.5px] uppercase tracking-[0.1em] text-[var(--c-faint)]">
            <tr className="border-b border-[var(--c-border)]">
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-2 py-3 font-semibold">Concept</th>
              {(Object.keys(SCORE_LABELS) as ScoreKey[]).map((k) => (
                <th key={k} className="px-2 py-3 text-center font-semibold" title={SCORE_LABELS[k]}>
                  {SCORE_LABELS[k].split(" ")[0]}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-semibold">Overall</th>
            </tr>
          </thead>
          <tbody>
            {RANKED.map((c, i) => (
              <tr key={c.id} className="border-b border-[var(--c-border)] last:border-0 hover:bg-[var(--c-raised)]">
                <td className="px-4 py-2.5 tabular-nums text-[var(--c-faint)]" style={{ fontFamily: MONO }}>
                  {String(i + 1).padStart(2, "0")}
                </td>
                <td className="px-2 py-2.5">
                  <a href={`#${c.id}`} className="flex items-center gap-2 font-medium text-[var(--c-text)] hover:underline">
                    <span className="flex h-4 w-10 overflow-hidden rounded">
                      <span className="flex-1" style={{ background: c.light.primary }} />
                      <span className="flex-1" style={{ background: c.light.accent }} />
                      <span className="flex-1" style={{ background: c.dark.background }} />
                    </span>
                    {c.name}
                    {c.badge && <span className="rounded-full bg-[var(--c-invert)] px-1.5 text-[9px] font-semibold text-[var(--c-invert-fg)]">ref</span>}
                  </a>
                </td>
                {(Object.keys(SCORE_LABELS) as ScoreKey[]).map((k) => (
                  <td key={k} className="px-2 py-2.5 text-center tabular-nums text-[var(--c-muted)]">
                    <span className={c.scores[k] >= 9 ? "font-semibold text-[var(--c-text)]" : undefined}>{c.scores[k]}</span>
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{overallScore(c).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
