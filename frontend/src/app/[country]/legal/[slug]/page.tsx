import { api } from '@/lib/api';
import { LegalPage } from '@/components/ui/LegalPage';
import { notFound } from 'next/navigation';

interface CmsLegalPage {
  id: number;
  slug: string;
  title: string;
  intro: string | null;
  updatedLabel: string | null;
  sections: { heading: string; paragraphs: string[] }[];
  heroImageUrl: string | null;
}

export default async function DynamicLegalPage({
  params,
}: {
  params: Promise<{ country: string; slug: string }>;
}) {
  const { country: region, slug } = await params;
  const res = await api.get<CmsLegalPage>(`/legal/${encodeURIComponent(slug)}`, { country: region }).catch(() => null);
  const page = res?.data ?? null;
  if (!page) return notFound();

  return (
    <LegalPage
      region={region}
      title={page.title}
      crumbLabel={page.title}
      intro={page.intro ?? ''}
      updated={page.updatedLabel ?? ''}
      sections={page.sections ?? []}
      heroImageUrl={page.heroImageUrl ?? undefined}
    />
  );
}
