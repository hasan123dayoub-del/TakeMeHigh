// The public landing page is built in components/landing (see app/(public) routes).
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/login');
}
