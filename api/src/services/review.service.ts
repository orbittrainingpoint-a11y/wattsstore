/** Product reviews — verified-purchase gated, moderated (PRD §8.8, §14.1). */
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';

export const reviewService = {
  async listForProduct(slug: string, skip: number, take: number, sort: 'recent' | 'helpful') {
    const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!product) throw AppError.notFound('PRODUCT_NOT_FOUND', 'Product not found.');

    const orderBy = sort === 'helpful' ? { helpfulCount: 'desc' as const } : { createdAt: 'desc' as const };
    const [items, totalCount, distribution] = await Promise.all([
      prisma.productReview.findMany({
        where: { productId: product.id, status: 'approved' },
        orderBy,
        skip,
        take,
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
      prisma.productReview.count({ where: { productId: product.id, status: 'approved' } }),
      prisma.productReview.groupBy({
        by: ['rating'],
        where: { productId: product.id, status: 'approved' },
        _count: true,
      }),
    ]);
    return { items, totalCount, distribution };
  },

  /** Submit a review — login required; verified-purchase status is attached when an order item exists. */
  async submit(userId: number, input: { productId: number; rating: number; title?: string; body?: string }) {
    const purchase = await prisma.orderItem.findFirst({
      where: {
        variant: { productId: input.productId },
        order: { userId, status: { in: ['delivered', 'shipped'] } },
      },
      select: { id: true },
    });

    try {
      return await prisma.productReview.create({
        data: {
          productId: input.productId,
          userId,
          orderItemId: purchase?.id,
          rating: input.rating,
          title: input.title,
          body: input.body,
          isVerifiedPurchase: Boolean(purchase),
          status: 'pending',
        },
      });
    } catch {
      throw AppError.conflict('ALREADY_REVIEWED', 'You have already reviewed this product.');
    }
  },

  async voteHelpful(userId: number, reviewId: number) {
    try {
      await prisma.$transaction([
        prisma.reviewHelpfulVote.create({ data: { reviewId, userId } }),
        prisma.productReview.update({ where: { id: reviewId }, data: { helpfulCount: { increment: 1 } } }),
      ]);
    } catch {
      throw AppError.conflict('ALREADY_VOTED', 'You have already marked this review helpful.');
    }
  },
};
