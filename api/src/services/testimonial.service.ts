import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';

export interface TestimonialInput {
  name: string;
  role?: string | null;
  company?: string | null;
  avatarUrl?: string | null;
  quote: string;
  rating?: number;
  countryIds?: number[];
  sortOrder?: number;
  isFeatured?: boolean;
  isActive?: boolean;
}

export const testimonialService = {
  async publicList(countryId?: number) {
    const rows = await prisma.testimonial.findMany({
      where: { isActive: true, isFeatured: true },
      orderBy: { sortOrder: 'asc' },
    });
    return rows
      .filter((row: { countryIds: number[] }) => row.countryIds.length === 0 || (countryId != null && row.countryIds.includes(countryId)))
      .map((row: { rating: unknown }) => ({ ...row, rating: Number(row.rating) }));
  },

  async list() {
    const rows = await prisma.testimonial.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] });
    return rows.map((row: { rating: unknown }) => ({ ...row, rating: Number(row.rating) }));
  },

  create(input: TestimonialInput) {
    return prisma.testimonial.create({
      data: {
        ...input,
        rating: input.rating ?? 5,
        countryIds: input.countryIds ?? [],
        sortOrder: input.sortOrder ?? 0,
        isFeatured: input.isFeatured ?? true,
        isActive: input.isActive ?? true,
      },
    });
  },

  async update(id: number, input: Partial<TestimonialInput>) {
    const existing = await prisma.testimonial.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('TESTIMONIAL_NOT_FOUND', 'Testimonial not found.');
    return prisma.testimonial.update({ where: { id }, data: input });
  },

  async delete(id: number) {
    const existing = await prisma.testimonial.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('TESTIMONIAL_NOT_FOUND', 'Testimonial not found.');
    await prisma.testimonial.delete({ where: { id } });
    return { deleted: true };
  },
};
