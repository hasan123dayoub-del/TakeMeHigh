/**
 * Generates the demo cover images locally (no network, no licensing questions): stylised
 * landscapes rendered from SVG to WebP with sharp. Used only by the demo seed.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

export type Theme = 'sea' | 'island' | 'desert' | 'oldcity' | 'mountain' | 'mosque' | 'ruins' | 'night';

const W = 1600;
const H = 1000;

function svg(theme: Theme, seed: number): string {
  const r = (n: number) => ((Math.sin(seed * 97 + n * 13.7) + 1) / 2) * 1;
  const sky: Record<Theme, [string, string]> = {
    sea: ['#4FA3E0', '#F9D9A7'],
    island: ['#2B7DBF', '#FCE3B0'],
    desert: ['#F6B26B', '#FFE8C2'],
    oldcity: ['#E8A87C', '#FBE3C9'],
    mountain: ['#6FA8DC', '#DDEEF9'],
    mosque: ['#1E3A5F', '#F4C27A'],
    ruins: ['#F0A35E', '#FFF1D6'],
    night: ['#0B1D3A', '#3A5A8C'],
  };
  const [top, bottom] = sky[theme];
  const sunY = 260 + r(1) * 160;
  const sunX = 300 + r(2) * 1000;
  const parts: string[] = [];
  parts.push(`<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
    <radialGradient id="glow"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`);
  parts.push(`<rect width="${W}" height="${H}" fill="url(#sky)"/>`);
  if (theme === 'night') {
    for (let i = 0; i < 90; i++) parts.push(`<circle cx="${r(i + 10) * W}" cy="${r(i + 200) * 520}" r="${1 + r(i + 400) * 2}" fill="#fff" opacity="${0.4 + r(i) * 0.6}"/>`);
    parts.push(`<circle cx="${sunX}" cy="180" r="70" fill="#F7F3D9"/><circle cx="${sunX + 28}" cy="165" r="62" fill="${top}"/>`);
  } else {
    parts.push(`<circle cx="${sunX}" cy="${sunY}" r="220" fill="url(#glow)"/><circle cx="${sunX}" cy="${sunY}" r="80" fill="#FFF6D8" opacity=".95"/>`);
    for (let i = 0; i < 4; i++) {
      const cx = r(i + 30) * W;
      const cy = 120 + r(i + 60) * 200;
      parts.push(`<g fill="#fff" opacity=".55"><ellipse cx="${cx}" cy="${cy}" rx="120" ry="34"/><ellipse cx="${cx + 70}" cy="${cy - 18}" rx="80" ry="30"/></g>`);
    }
  }
  const wave = (y: number, amp: number, color: string, op: number) => {
    let d = `M0 ${y}`;
    for (let x = 0; x <= W; x += 100) d += ` Q ${x + 50} ${y - amp} ${x + 100} ${y}`;
    return `<path d="${d} L ${W} ${H} L 0 ${H} Z" fill="${color}" opacity="${op}"/>`;
  };
  switch (theme) {
    case 'sea':
      parts.push(wave(640, 18, '#2E86C1', 0.9), wave(700, 22, '#1F6FA8', 0.95), wave(780, 16, '#175A8A', 1));
      parts.push(`<path d="M0 860 Q 400 800 800 860 T 1600 850 L1600 1000 L0 1000Z" fill="#F2D49B"/>`);
      parts.push(`<g transform="translate(${900 + r(5) * 300} 590)"><path d="M0 0 L120 0 L100 30 L20 30 Z" fill="#fff"/><path d="M60 -110 L60 0 L120 -10 Z" fill="#fff"/><rect x="58" y="-110" width="4" height="110" fill="#5a4630"/></g>`);
      break;
    case 'island':
      parts.push(wave(620, 14, '#2E86C1', 0.95));
      parts.push(`<path d="M520 640 Q 700 520 900 560 Q 1050 540 1180 640 Z" fill="#C9A86A"/><g fill="#8C6A3D"><rect x="640" y="540" width="60" height="70"/><rect x="720" y="520" width="80" height="90"/><rect x="820" y="545" width="55" height="65"/><path d="M720 520 L760 480 L800 520Z"/></g>`);
      parts.push(wave(700, 20, '#1F6FA8', 1), wave(790, 18, '#175A8A', 1));
      break;
    case 'desert':
      parts.push(`<path d="M0 640 Q 300 520 650 620 T 1600 600 L1600 1000 L0 1000Z" fill="#E7A65A"/><path d="M0 760 Q 400 640 900 740 T 1600 720 L1600 1000 L0 1000Z" fill="#D48C3E"/><path d="M0 880 Q 500 800 1000 870 T 1600 860 L1600 1000 L0 1000Z" fill="#BD7430"/>`);
      parts.push(`<g transform="translate(${300 + r(7) * 800} 700)" fill="#5B3A1E"><ellipse cx="0" cy="0" rx="46" ry="20"/><rect x="-36" y="10" width="7" height="40"/><rect x="26" y="10" width="7" height="40"/><path d="M40 -6 Q 70 -40 60 -60 L 70 -64 Q 84 -36 52 0Z"/><circle cx="-6" cy="-18" r="16"/></g>`);
      break;
    case 'oldcity':
    case 'mosque': {
      const base = theme === 'mosque' ? '#2F2A46' : '#8A5A3B';
      parts.push(`<rect x="0" y="640" width="${W}" height="${H - 640}" fill="${base}" opacity=".9"/>`);
      for (let i = 0; i < 14; i++) {
        const x = i * 120 - 20;
        const h = 120 + r(i + 80) * 200;
        parts.push(`<rect x="${x}" y="${640 - h}" width="${100 + r(i) * 40}" height="${h}" fill="${base}"/>`);
        if (r(i + 3) > 0.55) parts.push(`<circle cx="${x + 60}" cy="${640 - h}" r="${36 + r(i + 9) * 20}" fill="${base}"/>`);
        if (r(i + 5) > 0.75) parts.push(`<rect x="${x + 80}" y="${640 - h - 160}" width="16" height="170" fill="${base}"/><circle cx="${x + 88}" cy="${640 - h - 166}" r="12" fill="${base}"/>`);
        for (let w = 0; w < 3; w++) parts.push(`<rect x="${x + 18 + w * 26}" y="${660 - h + 40}" width="12" height="20" rx="6" fill="#FFD98A" opacity="${theme === 'mosque' ? 0.85 : 0.35}"/>`);
      }
      if (theme === 'mosque') parts.push(`<path d="M640 640 L640 420 Q 800 260 960 420 L960 640Z" fill="${base}"/><rect x="560" y="260" width="22" height="380" fill="${base}"/><rect x="1018" y="260" width="22" height="380" fill="${base}"/><path d="M795 268 L 800 230 L 805 268Z" fill="#F4C27A"/>`);
      break;
    }
    case 'mountain':
      parts.push(`<path d="M0 700 L260 360 L460 560 L700 300 L980 620 L1200 380 L1600 700 L1600 1000 L0 1000Z" fill="#5D7A99"/><path d="M700 300 L770 380 L730 380 L700 350 L670 390 L640 380Z" fill="#fff"/><path d="M1200 380 L1260 450 L1220 440 L1190 410Z" fill="#fff"/>`);
      parts.push(`<path d="M0 780 Q 400 680 800 760 T 1600 740 L1600 1000 L0 1000Z" fill="#3F7D4E"/><path d="M0 880 Q 500 800 1000 860 T 1600 850 L1600 1000 L0 1000Z" fill="#2E6B3D"/>`);
      for (let i = 0; i < 16; i++) parts.push(`<path d="M${i * 100 + 20} 860 l 24 -70 l 24 70Z" fill="#1F4F2C"/>`);
      break;
    case 'ruins':
      parts.push(`<path d="M0 720 Q 400 660 800 700 T 1600 690 L1600 1000 L0 1000Z" fill="#D9A863"/>`);
      for (let i = 0; i < 9; i++) {
        const x = 200 + i * 140;
        const h = 200 + (i % 3) * 60;
        parts.push(`<rect x="${x}" y="${700 - h}" width="40" height="${h}" fill="#C98F4E"/><rect x="${x - 10}" y="${700 - h - 18}" width="60" height="18" fill="#B9803F"/>`);
      }
      parts.push(`<rect x="180" y="460" width="1180" height="24" fill="#B9803F"/>`);
      break;
    case 'night':
      parts.push(`<path d="M0 760 Q 400 700 800 740 T 1600 730 L1600 1000 L0 1000Z" fill="#0A1426"/>`);
      for (let i = 0; i < 40; i++) parts.push(`<rect x="${r(i + 500) * W}" y="${700 - r(i + 600) * 200}" width="${30 + r(i) * 40}" height="${100 + r(i + 7) * 220}" fill="#0E1B33"/>`);
      break;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join('')}</svg>`;
}

/** Writes uploads/public/demo/<name>.webp and returns its public URL. */
export async function demoImage(uploadRoot: string, apiBase: string, name: string, theme: Theme, seed: number) {
  const dir = join(uploadRoot, 'public', 'demo');
  mkdirSync(dir, { recursive: true });
  const buf = await sharp(Buffer.from(svg(theme, seed))).webp({ quality: 84 }).toBuffer();
  writeFileSync(join(dir, `${name}.webp`), buf);
  return `${apiBase}/uploads/demo/${name}.webp`;
}
