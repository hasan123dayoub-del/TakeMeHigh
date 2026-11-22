import type { FontKey } from "./tokens";

// CSS variables are defined by next/font in app/design-lab/layout.tsx.
export const FONT_OPTIONS: { key: FontKey; label: string; css: string }[] = [
  { key: "inter", label: "Inter", css: "var(--font-dl-inter), ui-sans-serif, system-ui, sans-serif" },
  { key: "geist", label: "Geist", css: "var(--font-dl-geist), ui-sans-serif, system-ui, sans-serif" },
  { key: "manrope", label: "Manrope", css: "var(--font-dl-manrope), ui-sans-serif, system-ui, sans-serif" },
  { key: "jakarta", label: "Plus Jakarta Sans", css: "var(--font-dl-jakarta), ui-sans-serif, system-ui, sans-serif" },
  { key: "outfit", label: "Outfit", css: "var(--font-dl-outfit), ui-sans-serif, system-ui, sans-serif" },
];

export const fontCss = (key: FontKey) => FONT_OPTIONS.find((f) => f.key === key)?.css ?? FONT_OPTIONS[0].css;

export const MONO = "var(--font-dl-mono), ui-monospace, SFMono-Regular, Menlo, monospace";
