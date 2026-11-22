// Design Lab token definitions. Static, preview-only data: nothing here is
// applied to the rest of the app.

export type Mode = "light" | "dark";

export type Gradient = {
  name: string;
  angle: number;
  stops: string[];
  /** Text / icon colour that sits on top of this gradient. */
  ink: string;
};

export type SidebarTokens = {
  bg: string;
  text: string;
  muted: string;
  active: string;
  activeText: string;
  border: string;
};

/** Optional "glass on gradient" material (used by the Cirrus concepts). */
export type GlassTokens = {
  canvas: string; // CSS background of the page behind the panel
  panel: string; // translucent panel fill
  panelBorder: string;
  shadow: string;
};

export type ModeTokens = {
  primary: string;
  primaryFg: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  /** 5 categorical colours; an optional 6th is a contrasting "target" series. */
  chart: string[];
  gradients: Gradient[];
  sidebar: SidebarTokens;
  glass?: GlassTokens;
};

export type ScoreKey =
  | "premium"
  | "travel"
  | "modern"
  | "readability"
  | "ux"
  | "memorability"
  | "enterprise"
  | "distinctiveness";

export const SCORE_LABELS: Record<ScoreKey, string> = {
  premium: "Premium appearance",
  travel: "Travel identity",
  modern: "Modern SaaS aesthetics",
  readability: "Readability",
  ux: "UX clarity",
  memorability: "Memorability",
  enterprise: "Enterprise suitability",
  distinctiveness: "Hackathon distinctiveness",
};

export type FontKey = "inter" | "geist" | "manrope" | "jakarta" | "outfit";

export type ButtonVariant = { label: string; bg: string; fg: string };

export type Concept = {
  id: string;
  name: string;
  tagline: string;
  inspiration: string;
  badge?: string;
  original?: boolean;
  description: string;
  strengths: string[];
  weaknesses: string[];
  scores: Record<ScoreKey, number>;
  radius: number;
  font: FontKey;
  uppercaseHeadings?: boolean;
  /** 11-step scale (50 … 950) when the concept is built around one hue. */
  scale?: { name: string; steps: [string, string][] };
  /** Alternative primary-button shades to compare for accessibility. */
  buttonVariants?: ButtonVariant[];
  light: ModeTokens;
  dark: ModeTokens;
};

const g = (name: string, angle: number, ink: string, ...stops: string[]): Gradient => ({
  name,
  angle,
  ink,
  stops,
});

const sb = (
  bg: string,
  text: string,
  muted: string,
  active: string,
  activeText: string,
  border: string,
): SidebarTokens => ({ bg, text, muted, active, activeText, border });

export const gradientCss = (gr: Gradient) => `linear-gradient(${gr.angle}deg, ${gr.stops.join(", ")})`;

export const overallScore = (c: Concept) => {
  const v = Object.values(c.scores);
  return v.reduce((a, b) => a + b, 0) / v.length;
};

// ---------------------------------------------------------------------------
// Featured: Cirrus (inspired by the user's reference) + Cirrus Deep
// ---------------------------------------------------------------------------

export const CIRRUS_SCALE: [string, string][] = [
  ["50", "#F2F8FD"],
  ["100", "#E3EFFA"],
  ["200", "#C9DDF3"],
  ["300", "#A9C8EC"],
  ["400", "#7FA7D3"],
  ["500", "#5B8CC4"],
  ["600", "#3F70AB"],
  ["700", "#335A8C"],
  ["800", "#2C4B73"],
  ["900", "#273F5F"],
  ["950", "#18263B"],
];

export const CIRRUS_DEEP_SCALE: [string, string][] = [
  ["50", "#EEF8FF"],
  ["100", "#D8EEFF"],
  ["200", "#B5DFFE"],
  ["300", "#84CBFB"],
  ["400", "#4FB0F5"],
  ["500", "#2894E6"],
  ["600", "#1677C9"],
  ["700", "#145FA3"],
  ["800", "#154F84"],
  ["900", "#16426C"],
  ["950", "#0E2A47"],
];

const cirrus: Concept = {
  id: "cirrus",
  name: "Cirrus",
  tagline: "Frosted glass at cruising altitude.",
  inspiration: "Powder sky + ink black + frosted glass",
  badge: "Inspired by your reference",
  original: true,
  description:
    "Named after the highest, lightest clouds. A powder-sky gradient canvas carries one big frosted-glass panel; navigation is a white pill bar whose active item is ink black, and an 11-step sky scale (50–950) drives charts, badges, hover and active states. Headings go wide, light and uppercase for a calm, editorial feel.",
  strengths: [
    "Instantly reads as air travel: sky, altitude, lightness, without a single cliché icon.",
    "Black active pills give the soft palette a confident, premium anchor and a clear 'you are here'.",
    "A full sky scale gives charts five related blues plus an ink target line, so data stays on-brand.",
  ],
  weaknesses: [
    "The reference's muted steel-blue CTA (#7FA7D3) with white text is only about 2.5:1 and fails WCAG AA; buttons here use sky-600 #3F70AB (≈5.1:1) or ink text on sky-400 instead.",
    "Glass and translucency cost GPU time and can wash out dense tables; keep blur to one or two layers.",
    "Glassmorphism on sky blue is a popular look in 2025–26, so it is less unique than it feels.",
  ],
  scores: {
    premium: 9,
    travel: 8,
    modern: 10,
    readability: 8,
    ux: 8,
    memorability: 8,
    enterprise: 7,
    distinctiveness: 7,
  },
  radius: 18,
  font: "outfit",
  uppercaseHeadings: true,
  scale: { name: "Sky", steps: CIRRUS_SCALE },
  buttonVariants: [
    { label: "Reference-inspired · sky-400 + white", bg: "#7FA7D3", fg: "#FFFFFF" },
    { label: "AA · sky-600 + white", bg: "#3F70AB", fg: "#FFFFFF" },
    { label: "AA · sky-400 + ink", bg: "#7FA7D3", fg: "#111418" },
  ],
  light: {
    primary: "#3F70AB",
    primaryFg: "#FFFFFF",
    secondary: "#1C1C1E",
    accent: "#7FA7D3",
    background: "#F5F9FD",
    surface: "#F3F6FA",
    border: "#E3EBF4",
    text: "#111418",
    textMuted: "#5A6878",
    success: "#2E8A62",
    warning: "#B7740A",
    error: "#C23A3A",
    info: "#335A8C",
    chart: ["#335A8C", "#5B8CC4", "#3AA5D8", "#7FA7D3", "#B5D3F0", "#1C1C1E"],
    gradients: [
      g("Altitude", 120, "#FFFFFF", "#335A8C", "#5B8CC4", "#A9C8EC"),
      g("Powder sky", 135, "#111418", "#C9DDF3", "#7FA7D3", "#3F70AB"),
    ],
    sidebar: sb("#FFFFFF", "#1C1C1E", "#6B7785", "#1C1C1E", "#FFFFFF", "#E3EBF4"),
    glass: {
      canvas:
        "radial-gradient(120% 80% at 0% 0%, #E6F0FA 0%, transparent 55%), radial-gradient(90% 70% at 100% 100%, #A9C8EC 0%, transparent 60%), linear-gradient(135deg, #DCE9F7 0%, #C9DDF3 48%, #E6F0FA 100%)",
      panel: "rgba(255,255,255,0.74)",
      panelBorder: "rgba(255,255,255,0.9)",
      shadow: "0 30px 60px -30px rgba(63,112,171,0.45), 0 2px 6px rgba(63,112,171,0.08)",
    },
  },
  dark: {
    primary: "#7FB4EA",
    primaryFg: "#0A1626",
    secondary: "#E3EFFA",
    accent: "#A9C8EC",
    background: "#121E30",
    surface: "#19273B",
    border: "#24344B",
    text: "#EAF2FB",
    textMuted: "#9DB0C7",
    success: "#4CC99A",
    warning: "#F2C063",
    error: "#F08A8A",
    info: "#84CBFB",
    chart: ["#7FB4EA", "#4FB0F5", "#A9C8EC", "#5B8CC4", "#D8E9F8", "#F5F7FA"],
    gradients: [
      g("Night altitude", 120, "#F2F8FD", "#10233D", "#2C4B73", "#5B8CC4"),
      g("Moonlit sky", 135, "#0A1626", "#4FB0F5", "#A9C8EC"),
    ],
    sidebar: sb("#0E1828", "#DCE8F5", "#7F93AB", "#E3EFFA", "#111418", "#1E2C40"),
    glass: {
      canvas:
        "radial-gradient(110% 80% at 0% 0%, #1B3557 0%, transparent 55%), radial-gradient(90% 70% at 100% 100%, #16426C 0%, transparent 60%), linear-gradient(160deg, #0B1626 0%, #10233D 50%, #0A1A2E 100%)",
      panel: "rgba(18,30,48,0.72)",
      panelBorder: "rgba(169,200,236,0.14)",
      shadow: "0 30px 60px -30px rgba(0,0,0,0.7), 0 0 0 1px rgba(127,180,234,0.04)",
    },
  },
};

const cirrusDeep: Concept = {
  ...cirrus,
  id: "cirrus-deep",
  name: "Cirrus Deep",
  tagline: "The same glass, a bluer, clearer sky.",
  inspiration: "Saturated sky + cyan + ink black",
  badge: "Inspired by your reference · deeper",
  description:
    "Cirrus with the saturation turned up: a clearer cyan-leaning sky scale for users who found the powder version too quiet. Same glass panel, same ink-black active pills, but stronger chart separation and a more energetic primary.",
  strengths: [
    "More vivid chart colours: the five blues separate better at small sizes than in Cirrus.",
    "Feels sunnier and more consumer-friendly, good for a demo on a projector.",
    "Primary sky-600 #1677C9 passes AA with white text (≈4.7:1) without looking muddy.",
  ],
  weaknesses: [
    "sky-400 #4FB0F5 with white text fails AA (≈2.4:1); white-on-sky must use sky-600 or darker.",
    "Closer to generic 'tech blue' than Cirrus; less of the calm, premium mood.",
    "Saturated blue glass can look busy behind dense tables.",
  ],
  scores: {
    premium: 8,
    travel: 8,
    modern: 9,
    readability: 8,
    ux: 8,
    memorability: 8,
    enterprise: 7,
    distinctiveness: 7,
  },
  scale: { name: "Sky (deep)", steps: CIRRUS_DEEP_SCALE },
  buttonVariants: [
    { label: "Vivid · sky-400 + white", bg: "#4FB0F5", fg: "#FFFFFF" },
    { label: "AA · sky-600 + white", bg: "#1677C9", fg: "#FFFFFF" },
    { label: "AA · sky-400 + ink", bg: "#4FB0F5", fg: "#0E1620" },
  ],
  light: {
    primary: "#1677C9",
    primaryFg: "#FFFFFF",
    secondary: "#0E1620",
    accent: "#4FB0F5",
    background: "#F3FAFF",
    surface: "#EEF5FB",
    border: "#D6E8F6",
    text: "#0E1620",
    textMuted: "#4E6275",
    success: "#138A63",
    warning: "#B5730A",
    error: "#C9343F",
    info: "#145FA3",
    chart: ["#145FA3", "#1677C9", "#2894E6", "#4FB0F5", "#84CBFB", "#0E1620"],
    gradients: [
      g("Clear sky", 120, "#FFFFFF", "#154F84", "#1677C9", "#4FB0F5"),
      g("Cyan haze", 135, "#0E1620", "#B5DFFE", "#4FB0F5", "#2894E6"),
    ],
    sidebar: sb("#FFFFFF", "#0E1620", "#5F7387", "#0E1620", "#FFFFFF", "#D6E8F6"),
    glass: {
      canvas:
        "radial-gradient(120% 80% at 0% 0%, #E2F3FF 0%, transparent 55%), radial-gradient(90% 70% at 100% 100%, #84CBFB 0%, transparent 60%), linear-gradient(135deg, #CFE9FD 0%, #A9D8FB 48%, #E2F3FF 100%)",
      panel: "rgba(255,255,255,0.74)",
      panelBorder: "rgba(255,255,255,0.9)",
      shadow: "0 30px 60px -30px rgba(22,119,201,0.45), 0 2px 6px rgba(22,119,201,0.08)",
    },
  },
  dark: {
    primary: "#4FB0F5",
    primaryFg: "#04121F",
    secondary: "#E8F4FF",
    accent: "#84CBFB",
    background: "#0C1C30",
    surface: "#12263E",
    border: "#1C3550",
    text: "#E8F4FF",
    textMuted: "#95B3CF",
    success: "#3DD6A3",
    warning: "#F6C350",
    error: "#F7838F",
    info: "#B5DFFE",
    chart: ["#4FB0F5", "#2894E6", "#84CBFB", "#1677C9", "#B5DFFE", "#F4FAFF"],
    gradients: [
      g("Deep night", 120, "#E8F4FF", "#0B2A4A", "#145FA3", "#2894E6"),
      g("Cyan glow", 135, "#04121F", "#2894E6", "#84CBFB"),
    ],
    sidebar: sb("#081627", "#D8EEFF", "#7193B3", "#D8EEFF", "#0E1620", "#142C46"),
    glass: {
      canvas:
        "radial-gradient(110% 80% at 0% 0%, #0F3A66 0%, transparent 55%), radial-gradient(90% 70% at 100% 100%, #154F84 0%, transparent 60%), linear-gradient(160deg, #061426 0%, #0B2A4A 50%, #071B33 100%)",
      panel: "rgba(12,28,48,0.72)",
      panelBorder: "rgba(132,203,251,0.16)",
      shadow: "0 30px 60px -30px rgba(0,0,0,0.75), 0 0 0 1px rgba(79,176,245,0.05)",
    },
  },
};

// ---------------------------------------------------------------------------
// Core concepts
// ---------------------------------------------------------------------------

const concepts: Concept[] = [
  cirrus,
  cirrusDeep,
  {
    id: "boarding-pass",
    name: "Boarding Pass",
    tagline: "Ink, ticket paper and a departure-board signal.",
    inspiration: "Ink navy + ticket paper + signal orange",
    original: true,
    description:
      "Built from the one object every traveller holds: the boarding pass. Warm ticket-paper surfaces, ink-navy type and chrome, and a signal-orange accent borrowed from airport wayfinding. Dark mode becomes the departure board: near-black with flap-display yellow and signal orange.",
    strengths: [
      "The strongest travel story of the set; the metaphor extends naturally to tickets, stubs and timelines.",
      "Ink-navy primary keeps it serious enough for finance and reports.",
      "Dark mode feels like a different, equally deliberate product (departure board), not an inversion.",
    ],
    weaknesses: [
      "Orange is an accent only; orange buttons with white text would fail contrast.",
      "Warning (amber) and accent (orange) sit close; status badges must use icons or labels too.",
    ],
    scores: {
      premium: 8,
      travel: 10,
      modern: 9,
      readability: 9,
      ux: 9,
      memorability: 10,
      enterprise: 8,
      distinctiveness: 10,
    },
    radius: 10,
    font: "geist",
    light: {
      primary: "#1B2A4A",
      primaryFg: "#FFFFFF",
      secondary: "#3D4A63",
      accent: "#F2622E",
      background: "#F6F3EC",
      surface: "#FFFDF8",
      border: "#E6DFD0",
      text: "#121826",
      textMuted: "#5A6070",
      success: "#1F8A5B",
      warning: "#A87800",
      error: "#C23030",
      info: "#2563A8",
      chart: ["#1B2A4A", "#F2622E", "#F4A259", "#6C7A99", "#CFC6B4"],
      gradients: [
        g("Night flight", 120, "#F6F3EC", "#121826", "#1B2A4A", "#24365C"),
        g("Signal", 90, "#121826", "#F2622E", "#F4A259"),
      ],
      sidebar: sb("#121826", "#F1ECE2", "#8C93A3", "#1F2A3F", "#F7A072", "#1C2333"),
    },
    dark: {
      primary: "#FF7A45",
      primaryFg: "#1A0A02",
      secondary: "#C9CFDB",
      accent: "#FFD166",
      background: "#0B0E14",
      surface: "#131823",
      border: "#242B3A",
      text: "#F1ECE2",
      textMuted: "#9EA5B4",
      success: "#4ADE80",
      warning: "#F59E0B",
      error: "#F87171",
      info: "#7AA7E8",
      chart: ["#FF7A45", "#FFD166", "#7AA7E8", "#C9CFDB", "#4B5468"],
      gradients: [
        g("Departure board", 120, "#F1ECE2", "#131823", "#1F2840", "#2A3556"),
        g("Flap display", 90, "#1A0A02", "#FF7A45", "#FFD166"),
      ],
      sidebar: sb("#07090D", "#EDE8DE", "#7A8191", "#161B26", "#FFD166", "#141821"),
    },
  },
  {
    id: "terracotta-sea",
    name: "Terracotta & Sea",
    tagline: "Sun-baked clay against deep Mediterranean water.",
    inspiration: "Limestone + deep sea teal + terracotta",
    original: true,
    description:
      "A coastal-village palette: limestone backgrounds, a deep sea-teal primary and a terracotta accent from rooftops and pottery. Warm without being beige, and clearly about places rather than software.",
    strengths: [
      "Very ownable: almost no SaaS dashboard uses teal + terracotta, so it is remembered.",
      "Warm palette makes customer-facing screens (itineraries, invoices) feel hospitable.",
      "Teal primary has excellent contrast in both modes.",
    ],
    weaknesses: [
      "Terracotta accent is close to error red; error uses a cooler crimson to keep them apart.",
      "Less 'enterprise neutral' than blue directions; some buyers expect blue.",
    ],
    scores: {
      premium: 8,
      travel: 9,
      modern: 8,
      readability: 8,
      ux: 8,
      memorability: 9,
      enterprise: 7,
      distinctiveness: 9,
    },
    radius: 12,
    font: "jakarta",
    light: {
      primary: "#0E5E63",
      primaryFg: "#FFFFFF",
      secondary: "#7A3B24",
      accent: "#C8603A",
      background: "#F7F3EE",
      surface: "#FFFFFF",
      border: "#E8DFD4",
      text: "#1F1A17",
      textMuted: "#6A5E55",
      success: "#3E7F4F",
      warning: "#B7791F",
      error: "#A4243B",
      info: "#2D6F9E",
      chart: ["#0E5E63", "#C8603A", "#E3A27F", "#5FA3A3", "#B8A99A"],
      gradients: [
        g("Deep water", 120, "#FFFFFF", "#0B4A4E", "#0E5E63", "#2E7D7A"),
        g("Clay", 90, "#1F1A17", "#C8603A", "#E3A27F"),
      ],
      sidebar: sb("#EFE7DC", "#1F1A17", "#76685C", "#E4D6C4", "#8E3F22", "#E5DACB"),
    },
    dark: {
      primary: "#4FB3B0",
      primaryFg: "#061A1B",
      secondary: "#E8C3AE",
      accent: "#E07B53",
      background: "#12100E",
      surface: "#1B1815",
      border: "#2E2924",
      text: "#F3ECE4",
      textMuted: "#B0A397",
      success: "#7BC48F",
      warning: "#E9B44C",
      error: "#F08A9A",
      info: "#7FB6DE",
      chart: ["#4FB3B0", "#E07B53", "#E8C3AE", "#2F7F82", "#6B5F55"],
      gradients: [
        g("Night harbour", 120, "#F3ECE4", "#0B2E30", "#0E5E63", "#2F7F82"),
        g("Ember clay", 90, "#1B0E08", "#E07B53", "#F2B59A"),
      ],
      sidebar: sb("#0E0C0A", "#EDE4DA", "#8A7D71", "#231E1A", "#F0A07F", "#1E1A17"),
    },
  },
  {
    id: "horizon-dusk",
    name: "Horizon Dusk",
    tagline: "The last ten minutes of light over the runway.",
    inspiration: "Dusk violet + apricot horizon",
    original: true,
    description:
      "Taken from the sky just after sunset: a dusk-violet primary, an apricot horizon accent and a gold highlight. Emotional and cinematic; the gradient carries the brand.",
    strengths: [
      "The most emotional direction; gradients feel like a destination, not a dashboard.",
      "Violet primary stands apart from the blue-heavy competition.",
    ],
    weaknesses: [
      "Purple + orange can feel consumer or lifestyle rather than operations software.",
      "Gradient-heavy; needs restraint in data-dense screens.",
    ],
    scores: {
      premium: 8,
      travel: 9,
      modern: 8,
      readability: 8,
      ux: 8,
      memorability: 8,
      enterprise: 6,
      distinctiveness: 8,
    },
    radius: 14,
    font: "manrope",
    light: {
      primary: "#4A2C7A",
      primaryFg: "#FFFFFF",
      secondary: "#2B1D4A",
      accent: "#F08A5D",
      background: "#FAF7F5",
      surface: "#FFFFFF",
      border: "#ECE3E0",
      text: "#1E1530",
      textMuted: "#645A72",
      success: "#2F8A5F",
      warning: "#B9770E",
      error: "#C23A4E",
      info: "#3B6FC4",
      chart: ["#4A2C7A", "#F08A5D", "#B57BD6", "#F6C177", "#A7A0B8"],
      gradients: [
        g("Dusk", 115, "#FFFFFF", "#2B1D4A", "#6B3487", "#C2577A", "#F08A5D"),
        g("Golden hour", 90, "#1E1530", "#F6C177", "#F08A5D"),
      ],
      sidebar: sb("#1E1530", "#F0EAF6", "#A396B8", "#33244F", "#F6B48F", "#2A1E42"),
    },
    dark: {
      primary: "#B79AF5",
      primaryFg: "#140C24",
      secondary: "#E2D6F7",
      accent: "#FF9F70",
      background: "#0E0A17",
      surface: "#171223",
      border: "#2A2238",
      text: "#F1ECF7",
      textMuted: "#A79DB8",
      success: "#5FD39A",
      warning: "#F4C35A",
      error: "#F4889A",
      info: "#8AB4F8",
      chart: ["#B79AF5", "#FF9F70", "#F6C177", "#7A5BC4", "#4E465E"],
      gradients: [
        g("Afterglow", 115, "#F1ECF7", "#171223", "#3A2366", "#8E3F7A", "#E07850"),
        g("Ember", 90, "#140C24", "#F6C177", "#FF9F70"),
      ],
      sidebar: sb("#0A0712", "#E9E2F3", "#7C7191", "#1E1730", "#FFB48F", "#1A1426"),
    },
  },
  {
    id: "midnight-emerald",
    name: "Midnight Emerald",
    tagline: "Private-bank calm with a brass edge.",
    inspiration: "Deep forest ink + emerald + brass",
    description:
      "Emerald on near-black forest ink, with a restrained brass accent. Signals money handled carefully: the colour of private banking and old passports.",
    strengths: [
      "Trust and money: ideal for Finance, Payments and Outstanding balances.",
      "Excellent contrast; emerald primary works in both modes.",
    ],
    weaknesses: [
      "Green primary collides semantically with 'success'; badges need extra care.",
      "Feels more fintech than travel.",
    ],
    scores: {
      premium: 9,
      travel: 6,
      modern: 8,
      readability: 9,
      ux: 8,
      memorability: 7,
      enterprise: 9,
      distinctiveness: 6,
    },
    radius: 10,
    font: "inter",
    light: {
      primary: "#047857",
      primaryFg: "#FFFFFF",
      secondary: "#0F3D33",
      accent: "#B8892B",
      background: "#F6F8F7",
      surface: "#FFFFFF",
      border: "#E1E8E5",
      text: "#0B1F1A",
      textMuted: "#52645E",
      success: "#15803D",
      warning: "#B45309",
      error: "#B91C1C",
      info: "#0369A1",
      chart: ["#047857", "#34D399", "#0F766E", "#B8892B", "#94A3B8"],
      gradients: [
        g("Emerald depth", 120, "#FFFFFF", "#064E3B", "#047857", "#0F766E"),
        g("Brass", 90, "#1A1405", "#B8892B", "#E9C46A"),
      ],
      sidebar: sb("#0B1F1A", "#E6F2EE", "#8BA59C", "#12392F", "#6EE7B7", "#16302A"),
    },
    dark: {
      primary: "#10B981",
      primaryFg: "#022C22",
      secondary: "#A7D7C5",
      accent: "#D9B45A",
      background: "#07110E",
      surface: "#0D1A16",
      border: "#1C2E28",
      text: "#E8F1EE",
      textMuted: "#94A9A1",
      success: "#34D399",
      warning: "#FBBF24",
      error: "#F87171",
      info: "#38BDF8",
      chart: ["#10B981", "#6EE7B7", "#2DD4BF", "#D9B45A", "#64748B"],
      gradients: [
        g("Forest night", 120, "#ECFDF5", "#052E25", "#065F46", "#0F766E"),
        g("Brass glow", 90, "#1A1405", "#D9B45A", "#F5DFA0"),
      ],
      sidebar: sb("#050C0A", "#D7E6E0", "#6F877E", "#0F2A22", "#34D399", "#13221D"),
    },
  },
  {
    id: "sapphire-champagne",
    name: "Sapphire & Champagne",
    tagline: "First-class lounge: sapphire, pearl and a glass of champagne.",
    inspiration: "Sapphire + pearl white + champagne gold",
    description:
      "Sapphire blue on pearl white, with champagne gold reserved for highlights and premium states. Classic luxury-hotel codes applied to software.",
    strengths: [
      "Premium and trustworthy at once; blue reassures, gold signals upscale.",
      "Gold accent gives VIP customers and premium trips a natural visual tier.",
    ],
    weaknesses: [
      "Blue + gold is a familiar hospitality pairing; less surprising.",
      "Champagne can look beige on low-quality projectors.",
    ],
    scores: {
      premium: 9,
      travel: 8,
      modern: 7,
      readability: 8,
      ux: 8,
      memorability: 7,
      enterprise: 8,
      distinctiveness: 7,
    },
    radius: 12,
    font: "jakarta",
    light: {
      primary: "#1E3A8A",
      primaryFg: "#FFFFFF",
      secondary: "#0F1F4F",
      accent: "#C9A867",
      background: "#FBFAF7",
      surface: "#FFFFFF",
      border: "#E7E3D9",
      text: "#101A3A",
      textMuted: "#565E78",
      success: "#2E7D5B",
      warning: "#B07A16",
      error: "#B23A3A",
      info: "#2F5FC4",
      chart: ["#1E3A8A", "#C9A867", "#4F6FC6", "#E6D5AE", "#8E96AE"],
      gradients: [
        g("Sapphire", 120, "#FFFFFF", "#0F1F4F", "#1E3A8A", "#2D4FB0"),
        g("Champagne", 90, "#101A3A", "#C9A867", "#F1E3C2"),
      ],
      sidebar: sb("#0F1F4F", "#ECEFF8", "#9AA4C6", "#1D306D", "#E6D0A0", "#1B2B5E"),
    },
    dark: {
      primary: "#6D8EF0",
      primaryFg: "#060B1E",
      secondary: "#C6D0F3",
      accent: "#DDBF7E",
      background: "#070B1C",
      surface: "#0E1430",
      border: "#1F2850",
      text: "#EEF0F8",
      textMuted: "#A0A7C4",
      success: "#5FD3A0",
      warning: "#EBC15B",
      error: "#F08787",
      info: "#8FB0FF",
      chart: ["#6D8EF0", "#DDBF7E", "#3C5BC0", "#F1E3C2", "#4B5275"],
      gradients: [
        g("Midnight sapphire", 120, "#EEF0F8", "#0E1430", "#1E3A8A", "#3554C4"),
        g("Champagne glow", 90, "#060B1E", "#DDBF7E", "#F1E3C2"),
      ],
      sidebar: sb("#050817", "#E4E8F6", "#757EA3", "#141C40", "#DDBF7E", "#131A38"),
    },
  },
  {
    id: "polar-night",
    name: "Polar Night",
    tagline: "Midnight navy chrome, a clear sky-blue signal.",
    inspiration: "Sky blue + midnight navy",
    description:
      "A midnight-navy sidebar and primary with a crisp sky-blue accent. The safest high-quality choice: looks like serious infrastructure software while keeping a hint of the open sky.",
    strengths: [
      "Highest enterprise suitability; navy reads as reliable to every buyer.",
      "Sky accent gives charts and focus states a clear, calm signal colour.",
      "Very readable in both modes.",
    ],
    weaknesses: [
      "Navy + sky is common in B2B SaaS; distinctiveness relies on details, not colour.",
    ],
    scores: {
      premium: 8,
      travel: 7,
      modern: 9,
      readability: 9,
      ux: 9,
      memorability: 7,
      enterprise: 10,
      distinctiveness: 6,
    },
    radius: 10,
    font: "inter",
    light: {
      primary: "#0E1B3D",
      primaryFg: "#FFFFFF",
      secondary: "#1E3A8A",
      accent: "#38A9F5",
      background: "#F4F7FB",
      surface: "#FFFFFF",
      border: "#DDE4EE",
      text: "#0A1630",
      textMuted: "#51607A",
      success: "#0F8A5F",
      warning: "#B76E00",
      error: "#C8312B",
      info: "#0284C7",
      chart: ["#0E1B3D", "#38A9F5", "#7DD3FC", "#6574A0", "#CBD5E1"],
      gradients: [
        g("Polar night", 120, "#FFFFFF", "#0E1B3D", "#1E3A8A", "#2B6CB0"),
        g("Clear sky", 90, "#0A1630", "#38A9F5", "#BAE6FD"),
      ],
      sidebar: sb("#0E1B3D", "#E6EDF8", "#8A9AB8", "#1A2A55", "#7DD3FC", "#1A2850"),
    },
    dark: {
      primary: "#56B6F7",
      primaryFg: "#04122A",
      secondary: "#A5C8F0",
      accent: "#7DD3FC",
      background: "#060B1A",
      surface: "#0C1428",
      border: "#1B2642",
      text: "#E7EEFA",
      textMuted: "#94A3C0",
      success: "#34D399",
      warning: "#FBBF24",
      error: "#F87171",
      info: "#60A5FA",
      chart: ["#56B6F7", "#7DD3FC", "#818CF8", "#3B5BA9", "#475569"],
      gradients: [
        g("Aurora navy", 120, "#E7EEFA", "#0C1428", "#1E3A8A", "#2563EB"),
        g("Polar light", 90, "#04122A", "#56B6F7", "#BAE6FD"),
      ],
      sidebar: sb("#040815", "#DDE6F5", "#6E7FA3", "#111D3A", "#7DD3FC", "#111A33"),
    },
  },
  {
    id: "indigo-lagoon",
    name: "Indigo Lagoon",
    tagline: "Deep indigo water meeting a shallow cyan lagoon.",
    inspiration: "Soft cyan + deep indigo",
    description:
      "Deep indigo structure with a soft lagoon-cyan accent. Contemporary and slightly playful; the indigo keeps it grown-up.",
    strengths: [
      "Feels current (indigo is the colour of modern dev tools) while cyan hints at water.",
      "Cyan + indigo charts are very legible.",
    ],
    weaknesses: [
      "Indigo can drift toward 'generic AI startup'.",
      "Cyan text on white fails contrast; cyan must stay decorative.",
    ],
    scores: {
      premium: 7,
      travel: 6,
      modern: 9,
      readability: 8,
      ux: 8,
      memorability: 7,
      enterprise: 8,
      distinctiveness: 7,
    },
    radius: 12,
    font: "manrope",
    light: {
      primary: "#3B2F9E",
      primaryFg: "#FFFFFF",
      secondary: "#252062",
      accent: "#2CC7D6",
      background: "#F6F7FD",
      surface: "#FFFFFF",
      border: "#E0E3F3",
      text: "#14123A",
      textMuted: "#5A5B7E",
      success: "#12896B",
      warning: "#B8740C",
      error: "#C9364A",
      info: "#0E7F96",
      chart: ["#3B2F9E", "#2CC7D6", "#8B85E0", "#9AE6EE", "#B4B8D6"],
      gradients: [
        g("Lagoon", 120, "#FFFFFF", "#1A1650", "#3B2F9E", "#1C7E9A"),
        g("Shallows", 90, "#14123A", "#2CC7D6", "#9AE6EE"),
      ],
      sidebar: sb("#1A1650", "#E9E8FB", "#9D9AD0", "#2A2475", "#8FECF5", "#241F64"),
    },
    dark: {
      primary: "#8B85F0",
      primaryFg: "#0A0920",
      secondary: "#C7C4F7",
      accent: "#5CE1EC",
      background: "#0A0920",
      surface: "#12102E",
      border: "#24214A",
      text: "#ECEBFB",
      textMuted: "#A2A0C9",
      success: "#3DD6A3",
      warning: "#F6C350",
      error: "#F47F92",
      info: "#7CC7FF",
      chart: ["#8B85F0", "#5CE1EC", "#C7C4F7", "#3B9BD8", "#4A4870"],
      gradients: [
        g("Night lagoon", 120, "#ECEBFB", "#12102E", "#2A2475", "#16697E"),
        g("Bioluminescence", 90, "#0A0920", "#5CE1EC", "#C7C4F7"),
      ],
      sidebar: sb("#07061A", "#E1DFF8", "#7C79A8", "#1C1944", "#5CE1EC", "#18163A"),
    },
  },
  {
    id: "aegean",
    name: "Aegean",
    tagline: "Whitewashed walls, blue domes, turquoise coves.",
    inspiration: "Mediterranean blue + turquoise",
    description:
      "Mediterranean blue and turquoise on marble white. Fresh and sunny, with a clear holiday association that still fits a structured dashboard.",
    strengths: [
      "Strong, positive holiday association without being cartoonish.",
      "Blue + turquoise gives two clearly different brand colours for charts and highlights.",
    ],
    weaknesses: [
      "Turquoise text on white fails contrast; must be used as fills only.",
      "Can look like a tourism website rather than operations software.",
    ],
    scores: {
      premium: 7,
      travel: 9,
      modern: 8,
      readability: 8,
      ux: 8,
      memorability: 7,
      enterprise: 7,
      distinctiveness: 6,
    },
    radius: 14,
    font: "jakarta",
    light: {
      primary: "#0F5FA8",
      primaryFg: "#FFFFFF",
      secondary: "#0A3E66",
      accent: "#1CB5AC",
      background: "#F7FAFB",
      surface: "#FFFFFF",
      border: "#DCE8EC",
      text: "#08263A",
      textMuted: "#4D6878",
      success: "#0E8F6B",
      warning: "#B7740A",
      error: "#C23B33",
      info: "#1479B8",
      chart: ["#0F5FA8", "#1CB5AC", "#6FD3CC", "#4C8FD6", "#A9C3D1"],
      gradients: [
        g("Aegean", 120, "#FFFFFF", "#0A3E66", "#0F5FA8", "#0E8C8A"),
        g("Cove", 90, "#08263A", "#1CB5AC", "#A7EBE6"),
      ],
      sidebar: sb("#FFFFFF", "#08263A", "#5B7584", "#E3F4F3", "#0B7F79", "#E2ECEF"),
    },
    dark: {
      primary: "#4FA3E8",
      primaryFg: "#041726",
      secondary: "#A9D6EE",
      accent: "#3DD9CF",
      background: "#061620",
      surface: "#0B2130",
      border: "#173447",
      text: "#E4F1F5",
      textMuted: "#8EAFBD",
      success: "#34D399",
      warning: "#FBBF24",
      error: "#F87171",
      info: "#7CC4F2",
      chart: ["#4FA3E8", "#3DD9CF", "#9BE7E1", "#2F6FAE", "#48606C"],
      gradients: [
        g("Night sea", 120, "#E4F1F5", "#0B2130", "#0F4A7A", "#0E7A76"),
        g("Sea glass", 90, "#041726", "#3DD9CF", "#9BE7E1"),
      ],
      sidebar: sb("#04121B", "#D9EBF2", "#6C8E9D", "#0F2C3E", "#3DD9CF", "#0F2532"),
    },
  },
  {
    id: "luxury-sand-gold",
    name: "Luxury Sand & Gold",
    tagline: "Desert-resort warmth with gilded detail.",
    inspiration: "Warm sand + antique gold + espresso",
    description:
      "Sand and parchment surfaces, espresso text and antique-gold primary. Speaks to high-end travel (desert camps, safari lodges, riads) and feels hand-crafted.",
    strengths: [
      "Warmest and most 'high-end travel' of the set.",
      "Instantly differentiates from blue SaaS dashboards.",
    ],
    weaknesses: [
      "Gold primary needs a darker shade (#8A6A1F) to pass contrast, which looks less golden.",
      "Low colour separation between sand surfaces makes dense tables harder to scan.",
      "Can feel dated if overused.",
    ],
    scores: {
      premium: 9,
      travel: 8,
      modern: 6,
      readability: 7,
      ux: 7,
      memorability: 7,
      enterprise: 6,
      distinctiveness: 7,
    },
    radius: 8,
    font: "manrope",
    light: {
      primary: "#8A6A1F",
      primaryFg: "#FFFFFF",
      secondary: "#5B4636",
      accent: "#C8A24A",
      background: "#FAF6EF",
      surface: "#FFFDF9",
      border: "#EADFCB",
      text: "#2A2118",
      textMuted: "#6E5F4E",
      success: "#4D7C3A",
      warning: "#A66B12",
      error: "#A63D2F",
      info: "#3A6E8F",
      chart: ["#8A6A1F", "#C8A24A", "#5B4636", "#D9C3A0", "#3A6E8F"],
      gradients: [
        g("Desert dusk", 120, "#FFF8EA", "#5B4636", "#8A6A1F", "#B08A3E"),
        g("Gilt", 90, "#2A2118", "#C8A24A", "#E8D3A0"),
      ],
      sidebar: sb("#F1E8D8", "#2A2118", "#7D6C57", "#E5D5B8", "#5E4710", "#E3D6BF"),
    },
    dark: {
      primary: "#D4AF5A",
      primaryFg: "#1A1408",
      secondary: "#D8C4A6",
      accent: "#E8C979",
      background: "#14110C",
      surface: "#1C1812",
      border: "#2E271D",
      text: "#F3EBDD",
      textMuted: "#B3A58F",
      success: "#8FBF6A",
      warning: "#E3A53B",
      error: "#E07A66",
      info: "#7FB0CF",
      chart: ["#D4AF5A", "#E8C979", "#A8875A", "#7FB0CF", "#6D6150"],
      gradients: [
        g("Desert night", 120, "#F3EBDD", "#2E271D", "#5B4636", "#8A6A1F"),
        g("Gold leaf", 90, "#1A1408", "#D4AF5A", "#F0DCA0"),
      ],
      sidebar: sb("#0F0D09", "#EDE3D2", "#8C7F6A", "#231D13", "#E8C979", "#221D15"),
    },
  },
  {
    id: "dark-luxury",
    name: "Dark Luxury",
    tagline: "Onyx, ivory and bronze. Fashion-house confidence.",
    inspiration: "Onyx black + ivory + bronze + claret",
    description:
      "Onyx and ivory with bronze highlights and a single claret data colour. Bold and contemporary, closer to a fashion house than a travel agency.",
    strengths: [
      "Maximum drama on stage; the dark mode is the hero.",
      "Monochrome base makes every accent feel intentional.",
    ],
    weaknesses: [
      "Weak travel identity: could be any luxury brand.",
      "Ivory-on-black primary buttons feel heavy in light mode and data colours are limited.",
    ],
    scores: {
      premium: 9,
      travel: 5,
      modern: 8,
      readability: 7,
      ux: 7,
      memorability: 8,
      enterprise: 6,
      distinctiveness: 8,
    },
    radius: 6,
    font: "geist",
    light: {
      primary: "#0A0A0A",
      primaryFg: "#F4EBD8",
      secondary: "#3A3530",
      accent: "#9A7440",
      background: "#F4F1EC",
      surface: "#FFFFFF",
      border: "#E3DED5",
      text: "#0A0A0A",
      textMuted: "#5F5A52",
      success: "#2F7D52",
      warning: "#A86A12",
      error: "#A8323E",
      info: "#3D5A80",
      chart: ["#0A0A0A", "#9A7440", "#8E2C3A", "#C9B48A", "#7A746B"],
      gradients: [
        g("Onyx", 120, "#F4EBD8", "#0A0A0A", "#2A2520"),
        g("Bronze", 90, "#0A0A0A", "#9A7440", "#E9DCC0"),
      ],
      sidebar: sb("#0A0A0A", "#EDE7DC", "#8A8378", "#1E1C1A", "#E9DCC0", "#1A1918"),
    },
    dark: {
      primary: "#E9DCC0",
      primaryFg: "#0A0A0A",
      secondary: "#CFC6B6",
      accent: "#C9A46A",
      background: "#050505",
      surface: "#0E0E0E",
      border: "#222020",
      text: "#F2EEE6",
      textMuted: "#A39C90",
      success: "#7FC49A",
      warning: "#E2B657",
      error: "#E5787A",
      info: "#9DB4D6",
      chart: ["#E9DCC0", "#C9A46A", "#8B7E6A", "#9E3B4A", "#5A5650"],
      gradients: [
        g("Smoked onyx", 120, "#F2EEE6", "#0E0E0E", "#2A2520", "#3B3128"),
        g("Ivory bronze", 90, "#0A0A0A", "#C9A46A", "#E9DCC0"),
      ],
      sidebar: sb("#000000", "#EDE7DC", "#7E776C", "#171615", "#E9DCC0", "#1A1918"),
    },
  },
  {
    id: "ocean-blue",
    name: "Ocean Blue",
    tagline: "Clear, bright, unmistakably software.",
    inspiration: "Ocean blue + cyan",
    description:
      "A confident ocean blue with a cyan accent on clean white. Maximum clarity and familiarity: the 'modern tech' baseline the others are measured against.",
    strengths: [
      "Best-in-class clarity; users know exactly where to click.",
      "Easy to extend, and every component library default fits.",
    ],
    weaknesses: [
      "Looks like many other SaaS products; low memorability for judges.",
      "Travel identity comes only from content, not from the palette.",
    ],
    scores: {
      premium: 6,
      travel: 7,
      modern: 9,
      readability: 9,
      ux: 9,
      memorability: 5,
      enterprise: 9,
      distinctiveness: 4,
    },
    radius: 10,
    font: "inter",
    light: {
      primary: "#0B63CE",
      primaryFg: "#FFFFFF",
      secondary: "#0A3D7A",
      accent: "#00A3C4",
      background: "#F5F8FC",
      surface: "#FFFFFF",
      border: "#DCE5F0",
      text: "#0B1A2E",
      textMuted: "#50627A",
      success: "#0F8A5F",
      warning: "#B26E03",
      error: "#D0342C",
      info: "#0E7490",
      chart: ["#0B63CE", "#38BDF8", "#00A3C4", "#6366F1", "#94A3B8"],
      gradients: [
        g("Open ocean", 120, "#FFFFFF", "#0B4FA8", "#0B63CE", "#0891B2"),
        g("Surface", 90, "#04111F", "#00A3C4", "#38BDF8"),
      ],
      sidebar: sb("#FFFFFF", "#0B1A2E", "#5B6B82", "#E8F1FC", "#0B63CE", "#E3EAF3"),
    },
    dark: {
      primary: "#3B8EF0",
      primaryFg: "#04111F",
      secondary: "#9CC3F5",
      accent: "#22D3EE",
      background: "#08111F",
      surface: "#0E1A2C",
      border: "#1D2B40",
      text: "#E6EEF8",
      textMuted: "#93A4BC",
      success: "#34D399",
      warning: "#FBBF24",
      error: "#F87171",
      info: "#67E8F9",
      chart: ["#3B8EF0", "#22D3EE", "#818CF8", "#7DD3FC", "#475569"],
      gradients: [
        g("Deep ocean", 120, "#F0F7FF", "#0B3C86", "#1E5FD0", "#0E7490"),
        g("Glow", 90, "#04111F", "#22D3EE", "#7DD3FC"),
      ],
      sidebar: sb("#0A1524", "#DCE6F3", "#7488A3", "#13243B", "#7CB6FA", "#172539"),
    },
  },
  {
    id: "glacier",
    name: "Glacier",
    tagline: "Ice-blue air over deep fjord water.",
    inspiration: "Ice blue + ocean blue",
    description:
      "Pale ice-blue chrome with a deep ocean-blue primary. Fresh and cool, like a Nordic expedition brochure.",
    strengths: [
      "Very calm; long working sessions are comfortable.",
      "Ice sidebar keeps the whole UI light and airy.",
    ],
    weaknesses: [
      "Low colour separation between sidebar and canvas.",
      "Cool palette can feel clinical for a hospitality product.",
    ],
    scores: {
      premium: 7,
      travel: 7,
      modern: 8,
      readability: 8,
      ux: 8,
      memorability: 6,
      enterprise: 8,
      distinctiveness: 5,
    },
    radius: 12,
    font: "manrope",
    light: {
      primary: "#0369A1",
      primaryFg: "#FFFFFF",
      secondary: "#0C4A6E",
      accent: "#67C6E3",
      background: "#F2F8FB",
      surface: "#FFFFFF",
      border: "#D6E6EE",
      text: "#072A3D",
      textMuted: "#4C6A7A",
      success: "#0E8A6A",
      warning: "#B7740A",
      error: "#C2362F",
      info: "#0277B6",
      chart: ["#0369A1", "#67C6E3", "#A5DDF0", "#0C4A6E", "#8FB3C4"],
      gradients: [
        g("Fjord", 120, "#FFFFFF", "#0C4A6E", "#0369A1", "#0284C7"),
        g("Ice", 90, "#072A3D", "#BAE6FD", "#E0F2FE"),
      ],
      sidebar: sb("#E7F3F9", "#072A3D", "#557789", "#CFE8F3", "#035B8C", "#D3E6EF"),
    },
    dark: {
      primary: "#38BDF8",
      primaryFg: "#03202E",
      secondary: "#A5DDF0",
      accent: "#A5F3FC",
      background: "#04141D",
      surface: "#0A1F2B",
      border: "#16323F",
      text: "#E3F2F8",
      textMuted: "#8FB0BF",
      success: "#2DD4BF",
      warning: "#FCD34D",
      error: "#FB7185",
      info: "#7DD3FC",
      chart: ["#38BDF8", "#A5F3FC", "#0EA5E9", "#5EEAD4", "#4B6A78"],
      gradients: [
        g("Polar water", 120, "#E3F2F8", "#0A1F2B", "#0C4A6E", "#0369A1"),
        g("Ice glow", 90, "#03202E", "#0EA5E9", "#A5F3FC"),
      ],
      sidebar: sb("#03101A", "#D5EAF3", "#6A8E9E", "#0D2A38", "#A5F3FC", "#0E2430"),
    },
  },
  {
    id: "arctic-silver",
    name: "Arctic Silver",
    tagline: "Brushed aluminium and arctic steel.",
    inspiration: "Arctic blue + silver",
    description:
      "Silver-grey neutrals and a steel arctic-blue primary, like an aircraft fuselage. Precise and engineered; lets data speak.",
    strengths: [
      "Neutral base makes status colours and charts pop.",
      "Very enterprise-friendly and timeless.",
    ],
    weaknesses: [
      "Low emotional pull; the travel story is thin.",
      "Silver accent has too little contrast to carry information.",
    ],
    scores: {
      premium: 7,
      travel: 5,
      modern: 8,
      readability: 8,
      ux: 8,
      memorability: 5,
      enterprise: 9,
      distinctiveness: 4,
    },
    radius: 8,
    font: "geist",
    light: {
      primary: "#2B5C8A",
      primaryFg: "#FFFFFF",
      secondary: "#4F5B69",
      accent: "#9FB4C7",
      background: "#F5F7F9",
      surface: "#FFFFFF",
      border: "#DFE3E8",
      text: "#121A24",
      textMuted: "#5A6573",
      success: "#2F7D5B",
      warning: "#A86B12",
      error: "#B4383B",
      info: "#3A73A6",
      chart: ["#2B5C8A", "#9FB4C7", "#6B7785", "#C9D3DD", "#4F8FBF"],
      gradients: [
        g("Fuselage", 120, "#FFFFFF", "#1E3F5E", "#2B5C8A", "#4F7EA8"),
        g("Brushed silver", 90, "#121A24", "#C9D3DD", "#F5F7F9"),
      ],
      sidebar: sb("#EEF1F4", "#121A24", "#67717E", "#DFE5EC", "#234B71", "#E1E5EA"),
    },
    dark: {
      primary: "#8DB4DA",
      primaryFg: "#0B1520",
      secondary: "#C3CBD5",
      accent: "#B9C6D3",
      background: "#0C0F13",
      surface: "#14181E",
      border: "#262C35",
      text: "#E9EDF2",
      textMuted: "#9AA4B1",
      success: "#6FCF97",
      warning: "#E9B949",
      error: "#EF8A8A",
      info: "#7FB2E0",
      chart: ["#8DB4DA", "#C3CBD5", "#5E86AD", "#8A96A3", "#3E4752"],
      gradients: [
        g("Titanium", 120, "#E9EDF2", "#14181E", "#22303F", "#2B4A69"),
        g("Polar silver", 90, "#0B1520", "#8DB4DA", "#E1E6EC"),
      ],
      sidebar: sb("#0A0D10", "#E1E6EC", "#79838F", "#1B2129", "#B9D3EC", "#1A1F26"),
    },
  },
  {
    id: "cloud-steel",
    name: "Cloud Steel",
    tagline: "White cloud tops, steel-blue structure.",
    inspiration: "Cloud blue + white + steel blue",
    description:
      "Mostly white with cloud-blue tints and a steel-blue primary. Soft and approachable; the most neutral direction in the set.",
    strengths: [
      "Gentle and readable; an easy fit for any future marketing site.",
      "Cloud-blue tints make hover and selection states obvious without noise.",
    ],
    weaknesses: [
      "Forgettable on a judging stage.",
      "Steel blue feels slightly muted next to more saturated competitors.",
    ],
    scores: {
      premium: 6,
      travel: 6,
      modern: 8,
      readability: 9,
      ux: 9,
      memorability: 4,
      enterprise: 9,
      distinctiveness: 3,
    },
    radius: 12,
    font: "inter",
    light: {
      primary: "#3A6EA5",
      primaryFg: "#FFFFFF",
      secondary: "#2C4A6B",
      accent: "#8EC5F0",
      background: "#F7F9FC",
      surface: "#FFFFFF",
      border: "#E2E8F0",
      text: "#1A2433",
      textMuted: "#5B6777",
      success: "#2E8A64",
      warning: "#B0721A",
      error: "#C0443F",
      info: "#2F7DBF",
      chart: ["#3A6EA5", "#8EC5F0", "#C7E1F7", "#5C88B5", "#A8B4C3"],
      gradients: [
        g("Steel", 120, "#FFFFFF", "#2C4A6B", "#3A6EA5", "#4F86BF"),
        g("Cloud", 90, "#1A2433", "#C7E1F7", "#FFFFFF"),
      ],
      sidebar: sb("#EEF4FB", "#1A2433", "#5F6E82", "#DCE9F7", "#2F5F92", "#E0E9F3"),
    },
    dark: {
      primary: "#7FB0E3",
      primaryFg: "#0B1622",
      secondary: "#C4D6EA",
      accent: "#A9D4F5",
      background: "#0D1218",
      surface: "#141B24",
      border: "#243041",
      text: "#E6ECF3",
      textMuted: "#96A3B4",
      success: "#63C79A",
      warning: "#E6B556",
      error: "#EC8A84",
      info: "#8EC5F0",
      chart: ["#7FB0E3", "#A9D4F5", "#4E7DAF", "#D4E6F7", "#556273"],
      gradients: [
        g("Overcast night", 120, "#E6ECF3", "#141B24", "#24364D", "#35587F"),
        g("Silver lining", 90, "#0B1622", "#7FB0E3", "#D4E6F7"),
      ],
      sidebar: sb("#0A0F14", "#DEE6EF", "#74839A", "#1A2533", "#A9D4F5", "#18212C"),
    },
  },
];

export const CONCEPTS = concepts;
export const CONCEPT_BY_ID: Record<string, Concept> = Object.fromEntries(concepts.map((c) => [c.id, c]));

/** Ranking: overall score, ties broken by premium appearance, then readability. */
export const RANKED: Concept[] = [...concepts].sort(
  (a, b) =>
    overallScore(b) - overallScore(a) ||
    b.scores.premium - a.scores.premium ||
    b.scores.readability - a.scores.readability,
);
