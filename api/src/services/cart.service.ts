/** Cart business logic: stock-validated mutations + server-side total calculation (PRD §11). */
import { prisma } from '../config/database';
import { cartRepository } from '../repositories/cart.repository';
import { couponService } from './coupon.service';
import { pricingService, round2 } from './pricing.service';
import { AppError } from '../utils/AppError';
import { GeoContext } from '../types/express';

const dec = (v: unknown): number => (v == null ? 0 : Number(v));

export const cartService = {
  async getCart(userId: number, geo: GeoContext) {
    const cart = await cartRepository.getOrCreate(userId, geo.countryId);
    return this.buildCartView(cart.id, userId, geo);
  },

  async addItem(userId: number, geo: GeoContext, variantId: number, quantity: number) {
    const cart = await cartRepository.getOrCreate(userId, geo.countryId);
    const pricing = await this.getVariantPricing(variantId, geo.countryId);
    const existing = await cartRepository.findItem(cart.id, variantId);
    const newQty = (existing?.quantity ?? 0) + quantity;
    this.assertStock(pricing, newQty);
    await cartRepository.upsertItem(cart.id, variantId, newQty, dec(pricing.retailPrice));
    return this.buildCartView(cart.id, userId, geo);
  },

  async updateQuantity(userId: number, geo: GeoContext, variantId: number, quantity: number) {
    const cart = await cartRepository.getOrCreate(userId, geo.countryId);
    if (quantity <= 0) {
      await cartRepository.removeItem(cart.id, variantId);
    } else {
      const pricing = await this.getVariantPricing(variantId, geo.countryId);
      this.assertStock(pricing, quantity);
      await cartRepository.upsertItem(cart.id, variantId, quantity, dec(pricing.retailPrice));
    }
    return this.buildCartView(cart.id, userId, geo);
  },

  async removeItem(userId: number, geo: GeoContext, variantId: number) {
    const cart = await cartRepository.getOrCreate(userId, geo.countryId);
    await cartRepository.removeItem(cart.id, variantId);
    return this.buildCartView(cart.id, userId, geo);
  },

  async clear(userId: number, geo: GeoContext) {
    const cart = await cartRepository.getOrCreate(userId, geo.countryId);
    await cartRepository.clearItems(cart.id);
    await cartRepository.setCoupon(cart.id, null, 0);
    return this.buildCartView(cart.id, userId, geo);
  },

  async applyCoupon(userId: number, geo: GeoContext, code: string) {
    const cart = await cartRepository.getOrCreate(userId, geo.countryId);
    const view = await this.buildCartView(cart.id, userId, geo);
    if (!view.items.length) throw AppError.badRequest('CART_EMPTY', 'Your cart is empty.');

    const { coupon, discount } = await couponService.validate(code, {
      userId,
      countryId: geo.countryId,
      subtotal: view.totals.subtotal,
      itemCategoryIds: view.items.map((i) => i.categoryId),
      itemProductIds: view.items.map((i) => i.productId),
    });
    await cartRepository.setCoupon(cart.id, coupon.id, discount);
    return this.buildCartView(cart.id, userId, geo);
  },

  async removeCoupon(userId: number, geo: GeoContext) {
    const cart = await cartRepository.getOrCreate(userId, geo.countryId);
    await cartRepository.setCoupon(cart.id, null, 0);
    return this.buildCartView(cart.id, userId, geo);
  },

  // ── helpers ──
  async getVariantPricing(variantId: number, countryId: number) {
    const pricing = await prisma.regionalInventoryPricing.findUnique({
      where: { productVariantId_countryId: { productVariantId: variantId, countryId } },
    });
    if (!pricing) throw AppError.notFound('PRICING_NOT_FOUND', 'This item is not available in your region.');
    return pricing;
  },

  assertStock(pricing: { stockOnHand: number; stockReserved: number; isAvailable: boolean }, quantity: number) {
    if (!pricing.isAvailable) throw AppError.badRequest('UNAVAILABLE', 'This item is unavailable in your region.');
    const available = pricing.stockOnHand - pricing.stockReserved;
    if (available < quantity) {
      throw AppError.badRequest('INSUFFICIENT_STOCK', `Only ${available} unit(s) available.`, 'quantity');
    }
  },

  /** Assemble the full cart view with server-computed totals. Never trusts client values. */
  async buildCartView(cartId: number, userId: number, geo: GeoContext) {
    const cart = await cartRepository.getCartWithItems(cartId, geo.countryId);
    if (!cart) throw AppError.notFound('CART_NOT_FOUND', 'Cart not found.');

    const items = cart.items.map((it) => {
      const p = it.variant.pricing[0];
      const currentPrice = dec(p?.retailPrice);
      const lineSubtotal = round2(dec(it.unitPrice) * it.quantity);
      return {
        variantId: it.productVariantId,
        productId: it.variant.product.id,
        categoryId: it.variant.product.categoryId,
        taxClass: it.variant.product.taxClass,
        title: it.variant.product.title,
        slug: it.variant.product.slug,
        variantSku: it.variant.variantSku,
        attributes: it.variant.attributes,
        weightKg: dec(it.variant.weightKg),
        unitPrice: dec(it.unitPrice),
        currentPrice,
        priceChanged: currentPrice !== dec(it.unitPrice),
        quantity: it.quantity,
        lineSubtotal,
        baseShippingCost: dec(p?.baseShippingCost),
        perKgAdder: dec(p?.perKgAdder),
        stockAvailable: p ? p.stockOnHand - p.stockReserved : 0,
      };
    });

    const subtotal = round2(items.reduce((s, i) => s + i.lineSubtotal, 0));
    const isFreeShipping = cart.coupon?.discountType === 'free_shipping';
    let discountAmount = dec(cart.discountAmount);
    // re-validate discount value against current subtotal if a non-shipping coupon is applied
    if (cart.coupon && cart.coupon.discountType !== 'free_shipping') {
      discountAmount = couponService.computeDiscount(cart.coupon, subtotal);
    }

    const shipping = isFreeShipping
      ? 0
      : await pricingService.calculateShipping(
          items.map((i) => ({
            baseShippingCost: i.baseShippingCost,
            perKgAdder: i.perKgAdder,
            weightKg: i.weightKg,
            quantity: i.quantity,
          })),
          geo.countryId,
          subtotal,
        );

    const taxable = Math.max(0, subtotal - discountAmount) + shipping;
    const tax = await pricingService.calculateTax(taxable, geo.countryId, 'standard');
    const total = round2(Math.max(0, subtotal - discountAmount) + shipping + tax);

    return {
      cartId: cart.id,
      currencyCode: geo.currencyCode,
      currencySymbol: geo.currencySymbol,
      couponCode: cart.coupon?.code ?? null,
      items,
      totals: { subtotal, discountAmount, shippingAmount: shipping, taxAmount: tax, totalAmount: total },
    };
  },
};
