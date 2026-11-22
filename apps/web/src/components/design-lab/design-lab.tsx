"use client";

import Link from "next/link";
import { ArrowUpRight, Plane, Type } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { Compare } from "./compare";
import { ConceptCard } from "./concept-card";
import { FONT_OPTIONS, MONO, fontCss } from "./fonts";
import { MixBuilder } from "./mix-builder";
import { Recommendation } from "./recommendation";
import { CHROME, CopyProvider, ModeToggle, SectionHeader } from "./ui";
import { CONCEPTS, RANKED, type FontKey, type Mode } from "./tokens";

type FontChoice = "auto" | FontKey;

const SECTIONS = [
  { id: "concepts", label: "Concepts" },
  { id: "compare", label: "Compare" },
  { id: "mix", label: "Mix & Match" },
  { id: "recommendation", label: "Recommendation" },
];

export function DesignLab() {
  const [mode, setMode] = useState<Mode>("light");
  const [overrides, setOverrides] = useState<Record<string, Mode>>({});
  const [font, setFont] = useState<FontChoice>("auto");
  const [compare, setCompare] = useState<string[]>(["cirrus", "boarding-pass", "terracotta-sea"]);

  const setGlobalMode = (m: Mode) => {
    setMode(m);
    setOverrides({});
  };
  const fontFor = (k: FontKey) => fontCss(font === "auto" ? k : font);
  const toggleCompare = (id: string) =>
    setCompare((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(-3)));

  const chromeFont = "var(--font-dl-geist), ui-sans-serif, system-ui, sans-serif";
  const checks = CONCEPTS.length * 2 * 3;

  return (
    <CopyProvider>
      <div
        className="min-h-screen bg-[var(--c-bg)] text-[var(--c-text)] antialiased transition-colors duration-300"
        style={{ ...(CHROME[mode] as CSSProperties), fontFamily: chromeFont, colorScheme: mode }}
      >
        {/* Top bar */}
        <div className="sticky top-0 z-40 border-b border-[var(--c-border)] bg-[color-mix(in_srgb,var(--c-bg)_82%,transparent)] backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[1480px] items-center gap-4 px-4 sm:px-6">
            <a href="#top" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <span className="grid size-7 place-items-center rounded-lg bg-[var(--c-invert)] text-[var(--c-invert-fg)]">
                <Plane className="size-3.5" />
              </span>
              TravelOS
              <span className="hidden font-normal text-[var(--c-faint)] sm:inline">/ Design Lab</span>
            </a>
            <nav className="ml-4 hidden items-center gap-1 xl:flex">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] text-[var(--c-muted)] transition-colors hover:bg-[var(--c-raised)] hover:text-[var(--c-text)]"
                >
                  {s.label}
                </a>
              ))}
              <Link
                href="/design-lab/aero"
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] text-[var(--c-muted)] transition-colors hover:bg-[var(--c-raised)] hover:text-[var(--c-text)]"
              >
                Cirrus full-size <ArrowUpRight className="size-3" />
              </Link>
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <label className="hidden items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--c-raised)] py-1 pl-2.5 pr-1 text-xs sm:flex">
                <Type className="size-3 text-[var(--c-muted)]" />
                <span className="sr-only">Preview font</span>
                <select
                  value={font}
                  onChange={(e) => setFont(e.target.value as FontChoice)}
                  className="cursor-pointer bg-transparent pr-1 text-xs font-medium text-[var(--c-text)] outline-none"
                >
                  <option value="auto">Concept default font</option>
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
              <ModeToggle mode={mode} onChange={setGlobalMode} size="md" />
            </div>
          </div>
        </div>

        <div id="top" className="mx-auto max-w-[1480px] px-4 sm:px-6">
          {/* Hero */}
          <section className="pb-14 pt-14 sm:pt-20">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-1 text-[11px] font-medium text-[var(--c-muted)]">
              <span className="size-1.5 rounded-full bg-[var(--c-pass)]" />
              Design exploration · internal · nothing here is applied to the app
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-6xl">
              {CONCEPTS.length} visual directions for TravelOS.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--c-muted)] sm:text-lg">
              Each concept ships a full light and dark token set, a live dashboard rendered with those tokens, contrast
              computed from WCAG relative luminance, and an honest score. Compare them, remix them, copy the JSON.
            </p>

            <div className="mt-8 flex flex-wrap gap-x-10 gap-y-4 text-sm">
              {[
                [String(CONCEPTS.length), "concepts"],
                [String(CONCEPTS.length * 2), "designed modes"],
                [String(checks), "contrast checks, all computed"],
                [String(FONT_OPTIONS.length), "type options"],
              ].map(([n, l]) => (
                <div key={l}>
                  <div className="text-2xl font-semibold tabular-nums tracking-tight">{n}</div>
                  <div className="text-[12px] text-[var(--c-muted)]">{l}</div>
                </div>
              ))}
            </div>

            {/* Index */}
            <div className="mt-12 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
              {CONCEPTS.map((c, i) => {
                const t = c[mode];
                const rank = RANKED.findIndex((r) => r.id === c.id) + 1;
                return (
                  <a
                    key={c.id}
                    href={`#${c.id}`}
                    className="group overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] transition-all hover:-translate-y-0.5 hover:border-[var(--c-border-strong)] hover:shadow-lg"
                  >
                    <div className="flex h-16" style={{ background: t.glass?.canvas }}>
                      {t.glass ? (
                        <div className="m-2 flex flex-1 items-center gap-1 rounded-xl px-2" style={{ background: t.glass.panel }}>
                          <span className="h-3 w-8 rounded-full" style={{ background: t.sidebar.active }} />
                          <span className="h-3 w-5 rounded-full" style={{ background: t.primary }} />
                          <span className="h-3 w-3 rounded-full" style={{ background: t.accent }} />
                        </div>
                      ) : (
                        <>
                          <span className="w-1/4" style={{ background: t.sidebar.bg }} />
                          <span className="flex flex-1 flex-col justify-end gap-1 p-2" style={{ background: t.background }}>
                            <span className="h-2 w-3/4 rounded-full" style={{ background: t.primary }} />
                            <span className="h-2 w-1/2 rounded-full" style={{ background: t.accent }} />
                          </span>
                        </>
                      )}
                    </div>
                    <div className="px-2.5 py-2">
                      <div className="flex items-center justify-between text-[10px] text-[var(--c-faint)]" style={{ fontFamily: MONO }}>
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <span>rank {rank}</span>
                      </div>
                      <div className="truncate text-[12px] font-medium">{c.name}</div>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>

          <section id="concepts" className="scroll-mt-20 border-t border-[var(--c-border)] py-16">
            <SectionHeader eyebrow="01 · Concepts" title="The directions">
              Toggle light or dark per concept (the global switch resets them). Click any swatch, gradient or scale step to
              copy its value.
            </SectionHeader>
            <div className="space-y-10">
              {CONCEPTS.map((c, i) => (
                <ConceptCard
                  key={c.id}
                  concept={c}
                  index={i}
                  mode={overrides[c.id] ?? mode}
                  onModeChange={(m) => setOverrides((o) => ({ ...o, [c.id]: m }))}
                  font={fontFor(c.font)}
                  inCompare={compare.includes(c.id)}
                  onToggleCompare={() => toggleCompare(c.id)}
                />
              ))}
            </div>
          </section>

          <section id="compare" className="scroll-mt-20 border-t border-[var(--c-border)] py-16">
            <SectionHeader eyebrow="02 · Compare" title="Side by side">
              Choose up to three concepts. They render in the global {mode} mode with the current font setting.
            </SectionHeader>
            <Compare ids={compare} onToggle={toggleCompare} mode={mode} fontFor={fontFor} />
          </section>

          <section id="mix" className="scroll-mt-20 border-t border-[var(--c-border)] py-16">
            <SectionHeader eyebrow="03 · Mix & Match" title="Build your own combination">
              Take the sidebar from one concept, surfaces from another, gradients from a third and buttons, accent and charts
              from a fourth. The preview, contrast and exported JSON update live.
            </SectionHeader>
            <MixBuilder globalMode={mode} font={font === "auto" ? fontCss("inter") : fontCss(font)} />
          </section>

          <section id="recommendation" className="scroll-mt-20 border-t border-[var(--c-border)] py-16">
            <SectionHeader eyebrow="04 · Recommendation" title="Ranking and top three">
              Ranked by the mean of eight criteria (ties broken by premium appearance). The scores are a design judgement
              and are shown in full so you can disagree with them.
            </SectionHeader>
            <Recommendation />
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--c-border)] py-8 text-[12px] text-[var(--c-faint)]">
            <span>TravelOS Design Lab · temporary exploration page</span>
            <span>Sample data is static and for preview only.</span>
          </footer>
        </div>
      </div>
    </CopyProvider>
  );
}
