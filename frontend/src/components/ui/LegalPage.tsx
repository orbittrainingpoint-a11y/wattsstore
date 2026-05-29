import { PageHero } from '@/components/ui/PageHero';

export interface LegalSection { heading: string; paragraphs: string[] }

export function LegalPage({
  region,
  title,
  intro,
  updated,
  crumbLabel,
  sections,
  heroImageUrl,
}: {
  region: string;
  title: string;
  intro?: string;
  updated: string;
  crumbLabel: string;
  sections: LegalSection[];
  heroImageUrl?: string | null;
}) {
  return (
    <div>
      <PageHero
        crumbs={[{ label: 'Home', href: `/${region}` }, { label: crumbLabel }]}
        eyebrow={`Updated · ${updated}`}
        title={title}
        sub={intro}
        illustration={heroImageUrl ?? undefined}
      />
      <section className="container-ws py-12 max-w-3xl">
        <nav className="card p-5 mb-8 text-sm">
          <div className="section-eyebrow mb-3">On this page</div>
          <ol className="grid sm:grid-cols-2 gap-1.5">
            {sections.map((s, i) => (
              <li key={s.heading}>
                <a href={`#sec-${i}`} className="text-brand-blue link-underline">{i + 1}. {s.heading}</a>
              </li>
            ))}
          </ol>
        </nav>
        {sections.map((s, i) => (
          <section key={s.heading} id={`sec-${i}`} className="mb-10 scroll-mt-[180px]">
            <h2 className="text-xl font-extrabold">{i + 1}. {s.heading}</h2>
            {s.paragraphs.map((p, j) => (
              <p key={j} className="mt-3 text-sm text-brand-gray leading-relaxed">{p}</p>
            ))}
          </section>
        ))}
      </section>
    </div>
  );
}
