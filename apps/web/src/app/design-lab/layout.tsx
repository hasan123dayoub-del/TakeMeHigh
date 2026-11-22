import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono, Inter, Manrope, Outfit, Plus_Jakarta_Sans } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-dl-inter", display: "swap" });
const geist = Geist({ subsets: ["latin"], variable: "--font-dl-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-dl-mono", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-dl-manrope", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-dl-jakarta", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-dl-outfit", display: "swap" });

export const metadata: Metadata = {
  title: "Design Lab · TravelOS",
  description: "Visual identity exploration for TravelOS (internal).",
  robots: { index: false, follow: false },
};

export default function DesignLabLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${inter.variable} ${geist.variable} ${geistMono.variable} ${manrope.variable} ${jakarta.variable} ${outfit.variable} flex min-h-full flex-1 flex-col`}
    >
      {children}
    </div>
  );
}
