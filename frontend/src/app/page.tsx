import { redirect } from 'next/navigation';

// Root → default region. NGINX GeoIP handles this in production; default to UAE here.
export default function Home() {
  redirect('/ae');
}
