/** Profile, address book (max 10), wishlist (PRD §8.5). */
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';

const MAX_ADDRESSES = 10;

export const accountService = {
  // ── Profile ──
  async getProfile(userId: number) {
    const u = await prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw AppError.unauthorized();
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      isEmailVerified: u.isEmailVerified,
      newsletterOptIn: u.newsletterOptIn,
    };
  },

  updateProfile(userId: number, data: { firstName?: string; lastName?: string; phone?: string; newsletterOptIn?: boolean }) {
    return prisma.user.update({ where: { id: userId }, data });
  },

  // ── Addresses ──
  listAddresses(userId: number) {
    return prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
  },

  async addAddress(userId: number, data: Record<string, unknown>) {
    const count = await prisma.address.count({ where: { userId } });
    if (count >= MAX_ADDRESSES) throw AppError.badRequest('ADDRESS_LIMIT', `Maximum ${MAX_ADDRESSES} addresses allowed.`);
    const country = await prisma.country.findFirst({ where: { countryCode: String(data.countryCode), isActive: true } });
    if (!country) throw AppError.badRequest('INVALID_COUNTRY', 'Country is not supported.', 'countryCode');
    const isFirst = count === 0;
    return prisma.address.create({ data: { ...(data as object), userId, isDefault: isFirst } as never });
  },

  async updateAddress(userId: number, id: number, data: Record<string, unknown>) {
    const addr = await prisma.address.findUnique({ where: { id } });
    if (!addr || addr.userId !== userId) throw AppError.notFound('ADDRESS_NOT_FOUND', 'Address not found.');
    return prisma.address.update({ where: { id }, data: data as never });
  },

  async deleteAddress(userId: number, id: number) {
    const addr = await prisma.address.findUnique({ where: { id } });
    if (!addr || addr.userId !== userId) throw AppError.notFound('ADDRESS_NOT_FOUND', 'Address not found.');
    const count = await prisma.address.count({ where: { userId } });
    if (addr.isDefault && count > 1) {
      throw AppError.badRequest('CANNOT_DELETE_DEFAULT', 'Set another address as default before deleting this one.');
    }
    await prisma.address.delete({ where: { id } });
  },

  async setDefaultAddress(userId: number, id: number) {
    const addr = await prisma.address.findUnique({ where: { id } });
    if (!addr || addr.userId !== userId) throw AppError.notFound('ADDRESS_NOT_FOUND', 'Address not found.');
    await prisma.$transaction([
      prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }),
      prisma.address.update({ where: { id }, data: { isDefault: true } }),
    ]);
  },

  // ── Wishlist ──
  async listWishlist(userId: number, countryId: number) {
    const items = await prisma.wishlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            variants: { where: { isActive: true }, take: 1, include: { pricing: { where: { countryId }, take: 1 } } },
          },
        },
      },
    });
    return items.map((w) => ({
      productId: w.productId,
      title: w.product.title,
      slug: w.product.slug,
      image: w.product.images[0]?.imageUrl ?? null,
      price: w.product.isPriceVisible ? Number(w.product.variants[0]?.pricing[0]?.retailPrice ?? 0) : null,
    }));
  },

  addWishlist(userId: number, productId: number) {
    return prisma.wishlist.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
  },

  removeWishlist(userId: number, productId: number) {
    return prisma.wishlist.deleteMany({ where: { userId, productId } });
  },
};
