import type { Metadata } from "next";
import { AeroDashboard } from "@/components/design-lab/aero-dashboard";

export const metadata: Metadata = {
  title: "Cirrus · full-size preview · TravelOS Design Lab",
  robots: { index: false, follow: false },
};

export default function AeroPage() {
  return <AeroDashboard />;
}
