import { HomeRedirect } from '@/components/auth/home-redirect';

/** `/` sends signed-in users to the dashboard and everyone else to sign-in. */
export default function HomePage() {
  return <HomeRedirect />;
}
