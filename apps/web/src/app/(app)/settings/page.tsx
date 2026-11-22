import type { Metadata } from 'next';
import { SettingsView } from './settings-view';

// Rendered behind the client-side auth gate; see (app)/layout.tsx.
export const instant = false;

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return <SettingsView />;
}
