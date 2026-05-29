/** Prisma query layer for carts. */
import { prisma } from '../config/database';

export const cartRepository = {
  /** Get or create the user's cart for a country. */
  async getOrCreate(userId: number, countryId: number) {
    let cart = await prisma.cart.findFirst({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId, sessionId: `user-${userId}`, countryId } });
    } else if (cart.countryId !== countryId) {
      cart = await prisma.cart.update({ where: { id: cart.id }, data: { countryId } });
    }
    return cart;
  },

  getCartWithItems(cartId: number, countryId: number) {
    return prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        coupon: true,
        items: {
          include: {
            variant: {
              include: {
                product: { select: { id: true, title: true, slug: true, categoryId: true, taxClass: true } },
                pricing: { where: { countryId }, take: 1 },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  },

  findItem(cartId: number, variantId: number) {
    return prisma.cartItem.findUnique({
      where: { cartId_productVariantId: { cartId, productVariantId: variantId } },
    });
  },

  upsertItem(cartId: number, variantId: number, quantity: number, unitPrice: number) {
    return prisma.cartItem.upsert({
      where: { cartId_productVariantId: { cartId, productVariantId: variantId } },
      create: { cartId, productVariantId: variantId, quantity, unitPrice },
      update: { quantity },
    });
  },

  removeItem(cartId: number, variantId: number) {
    return prisma.cartItem.deleteMany({ where: { cartId, productVariantId: variantId } });
  },

  clearItems(cartId: number) {
    return prisma.cartItem.deleteMany({ where: { cartId } });
  },

  setCoupon(cartId: number, couponId: number | null, discountAmount: number) {
    return prisma.cart.update({ where: { id: cartId }, data: { couponId, discountAmount } });
  },
};
