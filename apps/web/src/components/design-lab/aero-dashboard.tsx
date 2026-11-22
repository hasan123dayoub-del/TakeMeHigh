"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Check,
  Download,
  MapPin,
  Moon,
  Plane,
  Plus,
  Search,
  Sun,
  TrendingDown,
  Users,
} from "lucide-react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useState, type CSSProperties, type ReactNode } from "react";
import { coreChecks } from "./contrast";
import { Badge, mix, tint } from "./dashboard-preview";
import { fontCss } from "./fonts";
import { BOOKINGS, DEPARTURES, EXTRA_BOOKINGS, KPIS, REVENUE_BY_MONTH, type BookingStatus } from "./sample-data";
import { CONCEPT_BY_ID, gradientCss, type Mode } from "./tokens";

const NAV = ["Dashboard", "Trips", "Bookings", "Customers", "Suppliers", "Finance", "Reports", "Settings"];
const SPARKS: Record<string, number[]> = {
  revenue: [12, 14, 13, 17, 16, 19, 22, 21, 25, 27],
  bookings: [30, 28, 33, 35, 31, 38, 40, 39, 44, 46],
  seats: [60, 55, 52, 50, 46, 44, 40, 36, 33, 31],
  outstanding: [18, 21, 19, 24, 22, 26, 23, 25, 24, 23],
};
const RANGES = { "12M": 12, "6M": 6, "3M": 3 } as const;
type Range = keyof typeof RANGES;
type Filter = "All" | BookingStatus;

function Sparkline({ data, color, width = 96, height = 30 }: { data: number[]; color: string; width?: number; height?: number }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * width, height - 3 - ((v - min) / (max - min || 1)) * (height - 6)]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path d={`${d} L${width},${height} L0,${height} Z`} fill={color} opacity={0.12} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AeroDashboard() {
  const [mode, setMode] = useState<Mode>("light");
  const [variant, setVariant] = useState<"cirrus" | "cirrus-deep">("cirrus");
  const [range, setRange] = useState<Range>("12M");
  const [filter, setFilter] = useState<Filter>("All");

  const concept = CONCEPT_BY_ID[variant];
  const t = concept[mode];
  const glass = t.glass!;
  const light = mode === "light";
  const white = light ? "#FFFFFF" : tint(t.surface, 92);
  const ink = t.sidebar.active; // near-black in light, near-white in dark
  const inkFg = t.sidebar.activeText;
  const hero = t.gradients[0];
  const scale = concept.scale!.steps.map(([, hex]) => hex);

  const heading: CSSProperties = { textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 300 };
  const card: CSSProperties = {
    background: light ? t.surface : tint(t.surface, 85),
    border: `1px solid ${light ? "transparent" : tint(t.border, 80)}`,
    borderRadius: 24,
  };
  const pillBtn = (active: boolean): CSSProperties => ({
    background: active ? ink : white,
    color: active ? inkFg : t.textMuted,
    border: `1px solid ${active ? ink : tint(t.border, 90)}`,
  });

  const revenue = REVENUE_BY_MONTH.slice(-RANGES[range]);
  const rows = [...BOOKINGS, ...EXTRA_BOOKINGS].filter((b) => filter === "All" || b.status === filter);
  const checks = coreChecks(t);

  return (
    <div
      className="min-h-screen p-2 transition-[background] duration-500 sm:p-5 lg:p-8"
      style={{ background: glass.canvas, color: t.text, fontFamily: fontCss("outfit"), colorScheme: mode }}
    >
      <div className="mx-auto mb-3 flex max-w-[1440px] items-center justify-between px-2 text-[12px]" style={{ color: t.textMuted }}>
        <Link href="/design-lab" className="inline-flex items-center gap-1.5 hover:underline">
          <ArrowLeft className="size-3.5" /> Design Lab
        </Link>
        <span className="hidden sm:inline">
          {concept.name} · full-size preview · static sample data
        </span>
      </div>

      <div
        className="mx-auto max-w-[1440px] overflow-hidden rounded-[32px] p-3 sm:p-6 lg:p-8"
        style={{
          background: glass.panel,
          border: `1px solid ${glass.panelBorder}`,
          boxShadow: glass.shadow,
          backdropFilter: "blur(24px) saturate(150%)",
          WebkitBackdropFilter: "blur(24px) saturate(150%)",
        }}
      >
        {/* Top bar with pill navigation */}
        <header className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5 pr-2">
            <span className="grid size-10 place-items-center rounded-full" style={{ background: ink, color: inkFg }}>
              <Plane className="size-4" />
            </span>
            <span className="text-lg font-medium tracking-tight">TravelOS</span>
          </div>

          <nav
            className="order-3 flex w-full gap-1 overflow-x-auto rounded-full p-1 [scrollbar-width:none] lg:order-none lg:w-auto"
            style={{ background: white, border: `1px solid ${tint(t.border, 80)}` }}
          >
            {NAV.map((n, i) => (
              <span
                key={n}
                className="shrink-0 cursor-pointer rounded-full px-4 py-2 text-[13px] font-medium transition-colors"
                style={i === 0 ? { background: ink, color: inkFg } : { color: t.textMuted }}
              >
                {n}
              </span>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden rounded-full p-1 text-[12px] md:flex" style={{ background: white, border: `1px solid ${tint(t.border, 80)}` }}>
              {(["cirrus", "cirrus-deep"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVariant(v)}
                  className="rounded-full px-3 py-1.5 font-medium"
                  style={v === variant ? { background: ink, color: inkFg } : { color: t.textMuted }}
                >
                  {CONCEPT_BY_ID[v].name}
                </button>
              ))}
            </div>
            <IconCircle bg={white} border={t.border} color={t.text} label="Search">
              <Search className="size-4" />
            </IconCircle>
            <IconCircle bg={white} border={t.border} color={t.text} label="Notifications" dot={t.accent}>
              <Bell className="size-4" />
            </IconCircle>
            <button
              type="button"
              onClick={() => setMode(light ? "dark" : "light")}
              aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
              className="grid size-10 place-items-center rounded-full transition-transform active:scale-95"
              style={{ background: ink, color: inkFg }}
            >
              {light ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </button>
            <span
              className="grid size-10 place-items-center rounded-full text-[13px] font-medium"
              style={{ background: gradientCss(t.gradients[1]), color: t.gradients[1].ink }}
            >
              LH
            </span>
          </div>
        </header>

        {/* Greeting */}
        <section className="mt-8 flex flex-wrap items-end justify-between gap-6 sm:mt-12">
          <div>
            <div className="text-[12px] font-medium uppercase tracking-[0.22em]" style={{ color: t.textMuted }}>
              Sunday, 22 November 2026
            </div>
            <h1 className="mt-2 text-[34px] leading-[1.05] sm:text-5xl lg:text-[56px]" style={heading}>
              Good morning, <span style={{ fontWeight: 500 }}>Lina</span>
            </h1>
            <p className="mt-3 max-w-xl text-[15px]" style={{ color: t.textMuted }}>
              6 departures this week, 12 bookings waiting for confirmation and 3 overdue invoices.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-[14px] font-medium"
              style={{ background: white, color: t.text, border: `1px solid ${tint(t.border, 90)}` }}
            >
              <Download className="size-4" /> Export report
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium transition-transform hover:-translate-y-0.5"
              style={{ background: t.primary, color: t.primaryFg, boxShadow: `0 12px 30px -12px ${tint(t.primary, 70)}` }}
            >
              <Plus className="size-4" /> New booking
            </button>
          </div>
        </section>

        {/* KPI row */}
        <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {KPIS.map((k, i) => {
            const featured = i === 0;
            const c = k.up ? t.success : t.warning;
            return (
              <div
                key={k.key}
                className="relative flex flex-col justify-between gap-6 overflow-hidden p-5"
                style={featured ? { background: gradientCss(hero), color: hero.ink, borderRadius: 24 } : card}
              >
                {featured && (
                  <span aria-hidden className="absolute -right-12 -top-16 size-48 rounded-full" style={{ background: tint(hero.ink, 10) }} />
                )}
                <div className="relative flex items-center justify-between">
                  <span className="text-[12px] font-medium uppercase tracking-[0.16em]" style={{ color: featured ? hero.ink : t.textMuted, opacity: featured ? 0.85 : 1 }}>
                    {k.label}
                  </span>
                  <span
                    className="grid size-8 place-items-center rounded-full"
                    style={{ background: featured ? tint(hero.ink, 18) : white, color: featured ? hero.ink : t.text }}
                  >
                    <ArrowUpRight className="size-4" />
                  </span>
                </div>
                <div className="relative flex items-end justify-between gap-3">
                  <div>
                    <div className="text-[32px] font-medium leading-none tracking-tight tabular-nums">{k.value}</div>
                    <div className="mt-2 flex items-center gap-2 text-[12px]">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium"
                        style={
                          featured
                            ? { background: hero.ink, color: hero.stops[0] }
                            : { background: tint(c, 14), color: mix(c, t.text, 72) }
                        }
                      >
                        {!k.up && <TrendingDown className="size-3" />}
                        {k.delta}
                      </span>
                      <span style={{ color: featured ? hero.ink : t.textMuted }}>{k.note}</span>
                    </div>
                  </div>
                  <Sparkline data={SPARKS[k.key]} color={featured ? hero.ink : scale[light ? 6 : 4]} />
                </div>
              </div>
            );
          })}
        </section>

        {/* Chart + departures */}
        <section className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-12">
          <div className="p-5 sm:p-6 xl:col-span-8" style={card}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px]" style={heading}>
                  Revenue
                </h2>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[28px] font-medium tracking-tight tabular-nums">$1.77M</span>
                  <span className="text-[13px]" style={{ color: mix(t.success, t.text, 72) }}>
                    +14.6% vs last year
                  </span>
                </div>
              </div>
              <div className="flex gap-1.5">
                {(Object.keys(RANGES) as Range[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className="rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors"
                    style={pillBtn(r === range)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 h-[280px]">
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 800, height: 280 }}>
                <ComposedChart data={revenue} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`rev-${variant}-${mode}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={t.chart[1]} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={t.chart[1]} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={tint(t.border, 90)} strokeDasharray="3 4" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: t.textMuted, fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: t.textMuted, fontSize: 12 }} tickFormatter={(v) => `$${v}k`} width={56} />
                  <Tooltip
                    cursor={{ stroke: t.accent, strokeDasharray: "3 3" }}
                    contentStyle={{ background: light ? "#FFFFFF" : t.surface, border: `1px solid ${t.border}`, borderRadius: 14, fontSize: 12, color: t.text }}
                    labelStyle={{ color: t.text, fontWeight: 600 }}
                    itemStyle={{ color: t.text }}
                    formatter={(v) => `$${v}k`}
                  />
                  <Area type="monotone" dataKey="revenue" name="This year" stroke={t.chart[0]} strokeWidth={2.25} fill={`url(#rev-${variant}-${mode})`} />
                  <Line type="monotone" dataKey="last" name="Last year" stroke={t.chart[5] ?? t.textMuted} strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-4 text-[12px]" style={{ color: t.textMuted }}>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-4 rounded-full" style={{ background: t.chart[0] }} /> This year
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4" style={{ background: t.chart[5] }} /> Last year
              </span>
            </div>
          </div>

          <div className="p-5 sm:p-6 xl:col-span-4" style={card}>
            <div className="flex items-center justify-between">
              <h2 className="text-[15px]" style={heading}>
                Upcoming departures
              </h2>
              <span className="text-[12px]" style={{ color: t.textMuted }}>
                Next 60 days
              </span>
            </div>
            <ol className="relative mt-5">
              <span aria-hidden className="absolute bottom-6 left-[13px] top-3 w-[2px] rounded-full" style={{ background: `linear-gradient(${t.primary}, ${tint(t.accent, 40)})` }} />
              {DEPARTURES.map((d) => {
                const pct = Math.round((d.sold / d.seats) * 100);
                return (
                  <li key={d.trip} className="relative flex gap-4 pb-5 last:pb-0">
                    <span
                      className="relative z-10 mt-0.5 grid size-7 shrink-0 place-items-center rounded-full"
                      style={
                        d.done
                          ? { background: t.primary, color: t.primaryFg }
                          : { background: light ? "#FFFFFF" : t.background, border: `2px solid ${t.accent}`, color: t.accent }
                      }
                    >
                      {d.done ? <Check className="size-3.5" strokeWidth={3} /> : <span className="size-1.5 rounded-full" style={{ background: t.accent }} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: t.textMuted }}>
                            {d.date} · {d.time}
                          </div>
                          <div className="truncate text-[15px] font-medium">{d.trip}</div>
                          <div className="flex items-center gap-1 text-[12px]" style={{ color: t.textMuted }}>
                            <MapPin className="size-3" /> {d.from}
                          </div>
                        </div>
                        <button type="button" className="shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-medium" style={{ background: ink, color: inkFg }}>
                          Select
                        </button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: tint(t.accent, 22) }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: gradientCss(t.gradients[1]) }} />
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] tabular-nums" style={{ color: t.textMuted }}>
                          <Users className="size-3" /> {d.sold}/{d.seats}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Bookings table */}
        <section className="mt-3 p-5 sm:p-6" style={card}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[15px]" style={heading}>
              Recent bookings
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {(["All", "Confirmed", "Pending", "Cancelled"] as Filter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className="rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors"
                  style={pillBtn(f === filter)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead>
                <tr style={{ color: t.textMuted }}>
                  {["Booking", "Customer", "Trip", "Departure", "Pax", "Total", "Status", "Payment", ""].map((h) => (
                    <th key={h} className="px-3 pb-3 text-[11px] font-medium uppercase tracking-[0.12em]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.ref} className="transition-colors" style={{ borderTop: `1px solid ${tint(t.border, light ? 100 : 80)}` }}>
                    <td className="px-3 py-3 tabular-nums" style={{ color: t.textMuted }}>
                      {b.ref}
                    </td>
                    <td className="px-3 py-3 font-medium">{b.customer}</td>
                    <td className="px-3 py-3">{b.trip}</td>
                    <td className="px-3 py-3" style={{ color: t.textMuted }}>
                      {b.date}
                    </td>
                    <td className="px-3 py-3 tabular-nums">{b.pax}</td>
                    <td className="px-3 py-3 font-semibold tabular-nums">{b.total}</td>
                    <td className="px-3 py-3">
                      <Badge t={t} label={b.status} pill />
                    </td>
                    <td className="px-3 py-3">
                      <Badge t={t} label={b.payment} pill />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button type="button" className="rounded-lg px-3 py-1.5 text-[12px] font-medium" style={{ background: ink, color: inkFg }}>
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer: sky scale + contrast */}
        <section className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="p-5 lg:col-span-7" style={card}>
            <h2 className="mb-3 text-[13px]" style={heading}>
              {concept.scale!.name} scale
            </h2>
            <div className="grid grid-cols-11 overflow-hidden rounded-2xl">
              {concept.scale!.steps.map(([step, hex], i) => (
                <div key={step} className="flex h-16 flex-col justify-between p-1.5" style={{ background: hex, color: i < 5 ? "#111418" : "#FFFFFF" }}>
                  <span className="text-[10px] font-medium">{step}</span>
                  <span className="text-[8.5px] sm:text-[9.5px]">{hex.slice(1)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-5 lg:col-span-5" style={card}>
            <h2 className="mb-3 text-[13px]" style={heading}>
              Contrast · {mode}
            </h2>
            <div className="space-y-2 text-[13px]">
              {checks.map((c) => (
                <div key={c.label} className="flex items-center justify-between gap-3">
                  <span style={{ color: t.textMuted }}>{c.label}</span>
                  <span className="tabular-nums">
                    {c.ratio.toFixed(2)}:1{" "}
                    <span className="ml-1 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: tint(c.pass ? t.success : t.error, 16), color: mix(c.pass ? t.success : t.error, t.text, 72) }}>
                      {c.pass ? "AA" : "Fail"}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function IconCircle({ children, bg, border, color, label, dot }: { children: ReactNode; bg: string; border: string; color: string; label: string; dot?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="relative grid size-10 place-items-center rounded-full"
      style={{ background: bg, color, border: `1px solid ${tint(border, 80)}` }}
    >
      {children}
      {dot && <span className="absolute right-2.5 top-2.5 size-2 rounded-full" style={{ background: dot }} />}
    </button>
  );
}
