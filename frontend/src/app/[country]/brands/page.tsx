import Link from 'next/link';
import { PageHero } from '@/components/ui/PageHero';
import { BrandTile, BrandTileData } from '@/components/catalog/BrandTile';
import { api } from '@/lib/api';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface ApiBrand {
  name: string;
  slug: string;
  originCountry?: string | null;
}

export default async function BrandsPage({ params }: { params: Promise<{ country: string }> }) {
  const region = (await params).country;
  const rows = await api.get<ApiBrand[]>('/catalog/brands', { country: region }).then((res) => res.data).catch(() => []);
  const brands: BrandTileData[] = rows.map((brand) => ({
    name: brand.name,
    slug: brand.slug,
    origin: brand.originCountry === 'India' ? 'Indian' : brand.originCountry === 'China' ? 'Chinese' : brand.originCountry === 'Germany' ? 'German' : undefined,
  }));
  const groups: Record<string, BrandTileData[]> = {};
  for (const brand of brands) {
    const key = brand.name.charAt(0).toUpperCase();
    (groups[key] ??= []).push(brand);
  }

  return (
    <div>
      <PageHero
        crumbs={[{ label: 'Home', href: `/${region}` }, { label: 'Brands' }]}
        eyebrow="Verified manufacturers"
        title={<>{brands.length} industrial brands,<br/><span className="text-gradient-on-dark">curated A-Z.</span></>}
        sub="Every brand tile shows origin of manufacture and links to its product collection."
      />

      <section className="container-ws py-10">
        <div className="mb-8 flex flex-wrap gap-1.5 rounded-xl border border-gray-200 bg-white/80 p-3 backdrop-blur">
          {ALPHABET.map((letter) => (
            <a key={letter} href={`#letter-${letter}`} className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${groups[letter] ? 'bg-brand-blue text-white hover:bg-brand-blue-700' : 'cursor-not-allowed bg-gray-50 text-brand-gray'}`}>
              {letter}
            </a>
          ))}
        </div>

        {Object.keys(groups).sort().map((letter) => (
          <section key={letter} id={`letter-${letter}`} className="mb-10 scroll-mt-[200px]">
            <h2 className="section-title mb-4 inline-flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-blue text-lg font-extrabold text-white">{letter}</span>
              <span className="text-base font-medium text-brand-gray">{groups[letter].length} brand{groups[letter].length === 1 ? '' : 's'}</span>
            </h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {groups[letter].map((brand) => <BrandTile key={brand.slug} region={region} brand={brand} />)}
            </div>
          </section>
        ))}

        <div className="card mt-10 p-6 text-center">
          <p className="text-sm text-brand-gray">Looking for a brand we do not list?</p>
          <Link href={`/${region}/contact`} className="btn-outline btn-sm mt-3 inline-flex">Request a brand -&gt;</Link>
        </div>
      </section>
    </div>
  );
}
