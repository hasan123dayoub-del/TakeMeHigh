import type { Metadata } from 'next';
import { LoginView } from './login-view';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your TravelOS agency workspace.',
};

export default function LoginPage() {
  return <LoginView />;
}
