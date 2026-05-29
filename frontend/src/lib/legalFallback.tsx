/** Static fallbacks for legal pages — used when CMS row hasn't been seeded yet. */
import { LegalPage, LegalSection } from '@/components/ui/LegalPage';
import { loadLegalPage } from '@/lib/cms';

export interface StaticLegalDoc {
  slug: string;
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
}

/** Render a legal page: CMS row wins; static doc is the fallback. */
export async function renderLegalPage(region: string, fallback: StaticLegalDoc) {
  const cms = await loadLegalPage(fallback.slug, region);
  const title = cms?.title ?? fallback.title;
  const intro = cms?.intro ?? fallback.intro;
  const updated = cms?.updatedLabel ?? fallback.updated;
  const sections = (cms?.sections && cms.sections.length > 0) ? cms.sections : fallback.sections;

  return (
    <LegalPage
      region={region}
      title={title}
      crumbLabel={title}
      intro={intro}
      updated={updated}
      sections={sections}
      heroImageUrl={cms?.heroImageUrl}
    />
  );
}
