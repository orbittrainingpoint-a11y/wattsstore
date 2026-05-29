/**
 * CMS service — public + admin reads/writes for editable site content:
 *   • Banners (placement-targeted: home_hero, home_strip, category, sidebar, pdp, promo)
 *   • Legal pages (Privacy, Terms, Returns, Shipping, etc.)
 *   • FAQ entries
 *
 * Banner.placement and the LegalPage model are added in prisma/schema.prisma — run
 * `npx prisma migrate dev` to apply, then the Prisma client picks them up automatically.
 */
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';

// Local typed views (so callers stay strict even before prisma generate refreshes)
export interface BannerInput {
  placement: string;
  title?: string | null;
  subtitle?: string | null;
  eyebrow?: string | null;
  imageUrl: string;
  mobileImageUrl?: string | null;
  linkUrl?: string | null;
  ctaLabel?: string | null;
  tone?: string | null;
  countryIds?: number[];
  sortOrder?: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive?: boolean;
}

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}
export interface LegalPageInput {
  slug: string;
  title: string;
  intro?: string | null;
  heroImageUrl?: string | null;
  sections: LegalSection[];
  updatedLabel?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  isPublished?: boolean;
}

export const VALID_PLACEMENTS = new Set([
  'home_hero',
  'home_mosaic',
  'home_strip',
  'home_promo',
  'about_cta',
  'category',
  'sidebar',
  'pdp',
  'promo',
]);

export const cmsService = {
  // ───────── Banners (public reads) ─────────

  /** Public: list active banners for a placement, region-scoped + time-windowed. */
  async publicBanners(placement: string, countryId?: number) {
    if (!VALID_PLACEMENTS.has(placement)) {
      throw AppError.badRequest('INVALID_PLACEMENT', `Unknown banner placement: ${placement}`);
    }
    const now = new Date();
    const rows = await (prisma as any).banner.findMany({
      where: {
        placement,
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: { sortOrder: 'asc' },
    });
    // Region scoping: empty countryIds[] means "all regions".
    return rows.filter((b: any) => !b.countryIds?.length || (countryId != null && b.countryIds.includes(countryId)));
  },

  // ───────── Banners (admin CRUD) ─────────

  async listBanners(filter: { placement?: string; isActive?: boolean }) {
    const where: Record<string, unknown> = {};
    if (filter.placement) where.placement = filter.placement;
    if (filter.isActive != null) where.isActive = filter.isActive;
    return (prisma as any).banner.findMany({ where, orderBy: [{ placement: 'asc' }, { sortOrder: 'asc' }] });
  },

  async getBanner(id: number) {
    const row = await (prisma as any).banner.findUnique({ where: { id } });
    if (!row) throw AppError.notFound('BANNER_NOT_FOUND', 'Banner not found.');
    return row;
  },

  async createBanner(input: BannerInput) {
    if (!VALID_PLACEMENTS.has(input.placement)) {
      throw AppError.badRequest('INVALID_PLACEMENT', `Unknown banner placement: ${input.placement}`);
    }
    return (prisma as any).banner.create({
      data: {
        ...input,
        countryIds: input.countryIds ?? [],
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
      },
    });
  },

  async updateBanner(id: number, patch: Partial<BannerInput>) {
    if (patch.placement && !VALID_PLACEMENTS.has(patch.placement)) {
      throw AppError.badRequest('INVALID_PLACEMENT', `Unknown banner placement: ${patch.placement}`);
    }
    // Make sure the row exists; throws if not.
    await this.getBanner(id);
    return (prisma as any).banner.update({ where: { id }, data: patch });
  },

  async deleteBanner(id: number) {
    await this.getBanner(id);
    await (prisma as any).banner.delete({ where: { id } });
    return { deleted: true };
  },

  async reorderBanners(rows: { id: number; sortOrder: number }[]) {
    await prisma.$transaction(rows.map((r) => (prisma as any).banner.update({ where: { id: r.id }, data: { sortOrder: r.sortOrder } })));
    return { reordered: rows.length };
  },

  // ───────── Legal pages ─────────

  /** Public: read a published legal page by slug. */
  async publicLegalPage(slug: string) {
    const row = await (prisma as any).legalPage.findFirst({ where: { slug, isPublished: true } });
    if (!row) throw AppError.notFound('LEGAL_NOT_FOUND', 'Page not found.');
    return row;
  },

  async listLegalPages() {
    return (prisma as any).legalPage.findMany({ orderBy: { slug: 'asc' } });
  },

  async getLegalPage(id: number) {
    const row = await (prisma as any).legalPage.findUnique({ where: { id } });
    if (!row) throw AppError.notFound('LEGAL_NOT_FOUND', 'Legal page not found.');
    return row;
  },

  async upsertLegalPage(input: LegalPageInput) {
    const slug = input.slug.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(slug)) throw AppError.badRequest('INVALID_SLUG', 'Slug must be lowercase letters, digits, and hyphens.');
    if (!Array.isArray(input.sections) || input.sections.some((s) => typeof s.heading !== 'string' || !Array.isArray(s.paragraphs))) {
      throw AppError.badRequest('INVALID_SECTIONS', 'Sections must be an array of { heading, paragraphs[] }.');
    }
    const data = {
      title: input.title,
      intro: input.intro ?? null,
      heroImageUrl: input.heroImageUrl ?? null,
      sections: input.sections as object,
      updatedLabel: input.updatedLabel ?? null,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      isPublished: input.isPublished ?? true,
    };
    return (prisma as any).legalPage.upsert({
      where: { slug },
      create: { slug, ...data },
      update: data,
    });
  },

  async deleteLegalPage(id: number) {
    await this.getLegalPage(id);
    await (prisma as any).legalPage.delete({ where: { id } });
    return { deleted: true };
  },
};
