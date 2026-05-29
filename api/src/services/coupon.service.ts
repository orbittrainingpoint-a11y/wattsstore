/** Coupon validation + discount computation (PRD §7.4, §16.2). */
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { round2 } from './pricing.service';

export interface CouponContext {
  userId: number;
  countryId: number;
  subtotal: number;
  itemCategoryIds: number[];
  itemProductIds: number[];
}

export const couponService = {
  /** Validate a coupon for a cart context, returning the coupon + computed discount. */
  async validate(code: string, ctx: CouponContext) {
    const coupon = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (!coupon || !coupon.isActive) throw AppError.badRequest('COUPON_NOT_FOUND', 'Invalid coupon code.', 'code');

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) throw AppError.badRequest('COUPON_EXPIRED', 'This coupon is not yet active.', 'code');
    if (coupon.expiresAt && coupon.expiresAt < now) throw AppError.badRequest('COUPON_EXPIRED', 'This coupon has expired.', 'code');

    if (coupon.usageLimitTotal != null && coupon.usageCount >= coupon.usageLimitTotal) {
      throw AppError.badRequest('COUPON_USAGE_LIMIT_REACHED', 'This coupon has reached its usage limit.', 'code');
    }

    const userUses = await prisma.couponUsage.count({ where: { couponId: coupon.id, userId: ctx.userId } });
    if (userUses >= coupon.usageLimitPerUser) {
      throw AppError.badRequest('COUPON_ALREADY_USED', 'You have already used this coupon.', 'code');
    }

    if (ctx.subtotal < Number(coupon.minOrderValue)) {
      throw AppError.badRequest(
        'COUPON_MIN_ORDER_NOT_MET',
        `Minimum order value of ${Number(coupon.minOrderValue)} not met.`,
        'code',
      );
    }

    if (coupon.countryIds.length && !coupon.countryIds.includes(ctx.countryId)) {
      throw AppError.badRequest('COUPON_NOT_VALID_REGION', 'This coupon is not valid in your region.', 'code');
    }

    if (coupon.appliesTo === 'category' && !ctx.itemCategoryIds.some((id) => coupon.applicableIds.includes(id))) {
      throw AppError.badRequest('COUPON_NOT_APPLICABLE', 'No eligible items for this coupon.', 'code');
    }
    if (coupon.appliesTo === 'product' && !ctx.itemProductIds.some((id) => coupon.applicableIds.includes(id))) {
      throw AppError.badRequest('COUPON_NOT_APPLICABLE', 'No eligible items for this coupon.', 'code');
    }

    const discount = this.computeDiscount(coupon, ctx.subtotal);
    return { coupon, discount };
  },

  computeDiscount(
    coupon: { discountType: string; discountValue: unknown; maxDiscountCap: unknown },
    subtotal: number,
  ): number {
    const value = Number(coupon.discountValue);
    if (coupon.discountType === 'percentage') {
      let d = subtotal * (value / 100);
      const cap = coupon.maxDiscountCap == null ? null : Number(coupon.maxDiscountCap);
      if (cap != null) d = Math.min(d, cap);
      return round2(Math.min(d, subtotal));
    }
    if (coupon.discountType === 'fixed_amount') {
      return round2(Math.min(value, subtotal));
    }
    // free_shipping handled at shipping calc; no subtotal discount
    return 0;
  },

  /** Record usage atomically on order completion. */
  async recordUsage(couponId: number, userId: number, orderId: number, discountApplied: number) {
    await prisma.$transaction([
      prisma.couponUsage.create({ data: { couponId, userId, orderId, discountApplied } }),
      prisma.coupon.update({ where: { id: couponId }, data: { usageCount: { increment: 1 } } }),
    ]);
  },
};
