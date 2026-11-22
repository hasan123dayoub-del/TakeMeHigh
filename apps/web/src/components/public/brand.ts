/**
 * Office brand colours are chosen by each office, so they can be anything.
 * These helpers keep text on them readable (WCAG AA, 4.5:1).
 */

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
const FALLBACK = '#3f70ab'; // Cirrus sky-600

function parse(hex: string | null | undefined): [number, number, number] {
  const m = HEX.exec(hex ?? '') ?? HEX.exec(FALLBACK)!;
  let h = m[1];
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

const toHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

function luminance([r, g, b]: number[]) {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** The office colour, darkened just enough for white text on top of it to pass AA. */
export function brandSurface(hex: string | null | undefined) {
  let rgb = parse(hex);
  for (let i = 0; i < 12 && contrast(luminance(rgb), 1) < 4.6; i++) {
    rgb = rgb.map((v) => v * 0.88) as [number, number, number];
  }
  return toHex(rgb);
}

/** The raw office colour (validated), for decorative accents only. */
export const brandAccent = (hex: string | null | undefined) => toHex(parse(hex));

/** A stable 0..n-1 bucket for a string (destination -> cover gradient). */
export function bucket(text: string, n: number) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return h % n;
}

/** Up to two initials of an office name, Arabic or Latin. */
export function officeInitials(name: string) {
  const words = name.replace(/^(ال)/, '').trim().split(/\s+/).filter(Boolean);
  const first = [...(words[0] ?? '?')][0];
  const second = words[1] ? [...words[1].replace(/^ال/, '')][0] : '';
  return (first + (second ?? '')).toUpperCase();
}

/** OpenStreetMap embed and Google Maps links for a point. */
export function mapLinks(lat: number, lng: number, span = 0.01) {
  const bbox = [lng - span, lat - span, lng + span, lat + span].map((v) => v.toFixed(5)).join(',');
  return {
    embed: `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`,
    google: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
  };
}
