import { redirect } from 'next/navigation';

/** Legacy URL — the real tracking page lives at /[country]/track. */
export default async function TrackOrderRedirect({ params }: { params: Promise<{ country: string }> }) {
  redirect(`/${(await params).country}/track`);
}
