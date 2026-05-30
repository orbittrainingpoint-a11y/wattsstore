/** Admin brand CRUD with cache invalidation. */
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { cacheDel, cacheDelPattern } from '../../config/redis';
import { AppError } from '../../utils/AppError';
import { slugify } from '../../utils/slugify';

async function invalidateBrandCache() {
  await cacheDel('catalog:brands:all');
  await cacheDel('catalog:brands:featured');
  await cacheDelPattern('catalog:product:*');
}

export interface BrandInput {
  name: string;
  slug?: string;
  logoUrl?: string | null;
  bannerImageUrl?: string | null;
  originCountry?: string | null;
  description?: string | null;
  websiteUrl?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  isActive?: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
}

export const brandService = {
  async list(filters: { status?: string; search?: string } = {}) {
    const where: Prisma.BrandWhereInput = {};
    if (filters.status === 'active') where.isActive = true;
    if (filters.status === 'archived') where.isActive = false;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { slug: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return prisma.brand.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
  },

  async get(id: number) {
    const brand = await prisma.brand.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
    if (!brand) throw AppError.notFound('BRAND_NOT_FOUND', 'Brand not found.');
    return brand;
  },

  async create(input: BrandInput) {
    const slug = (input.slug?.trim() || slugify(input.name)).slice(0, 160);
    const existing = await prisma.brand.findUnique({ where: { slug } });
    if (existing) throw AppError.badRequest('BRAND_SLUG_TAKEN', 'A brand with this slug already exists.');
    const created = await prisma.brand.create({ data: { ...input, slug, name: input.name.trim() } as Prisma.BrandUncheckedCreateInput });
    await invalidateBrandCache();
    return created;
  },

  async update(id: number, input: Partial<BrandInput>) {
    if (input.slug !== undefined && input.slug !== null) {
      const slug = input.slug.trim() || slugify(input.name ?? '');
      if (slug) {
        const clash = await prisma.brand.findFirst({ where: { slug, NOT: { id } } });
        if (clash) throw AppError.badRequest('BRAND_SLUG_TAKEN', 'A brand with this slug already exists.');
        input.slug = slug.slice(0, 160);
      }
    }
    const updated = await prisma.brand.update({ where: { id }, data: input as Prisma.BrandUncheckedUpdateInput });
    await invalidateBrandCache();
    return updated;
  },

  async archive(id: number) {
    await prisma.brand.update({ where: { id }, data: { isActive: false } });
    await invalidateBrandCache();
  },

  async restore(id: number) {
    const updated = await prisma.brand.update({ where: { id }, data: { isActive: true } });
    await invalidateBrandCache();
    return updated;
  },
};
