// WCAG 2.x contrast, computed from relative luminance.
// https://www.w3.org/TR/WCAG21/#dfn-relative-luminance

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channel(v: number) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export type Grade = "AAA" | "AA" | "AA Large" | "Fail";

export function grade(ratio: number): Grade {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA Large";
  return "Fail";
}

export const passesAA = (ratio: number) => ratio >= 4.5;

export type ContrastCheck = { label: string; fg: string; bg: string; ratio: number; pass: boolean };

export function coreChecks(t: {
  text: string;
  textMuted: string;
  background: string;
  primary: string;
  primaryFg: string;
}): ContrastCheck[] {
  const mk = (label: string, fg: string, bg: string): ContrastCheck => {
    const ratio = contrastRatio(fg, bg);
    return { label, fg, bg, ratio, pass: passesAA(ratio) };
  };
  return [
    mk("Text / background", t.text, t.background),
    mk("Secondary text / background", t.textMuted, t.background),
    mk("Button text / primary", t.primaryFg, t.primary),
  ];
}
