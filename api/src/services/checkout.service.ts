/**
 * Checkout: shipping estimate, order creation (reservation transaction), shipping verification.
 * Totals are always recomputed server-side from the persisted cart — never trusted from client (PRD §11.4).
 */
import { prisma } from '../config/database';
import { cartService } from './cart.service';
import { inventoryService } from './inventory.service';
import { pricingService } from './pricing.service';
import { paymentService, PaymentGateway } from './payment.service';
import { notificationService } from './notification.service';
import { orderRepository } from '../repositories/order.repository';
import { AppError } from '../utils/AppError';
import { generateOpaqueToken } from '../utils/jwt';
import { env } from '../config/env';
import { GeoContext } from '../types/express';
import { addHours } from 'date-fns';
import { pdfQueue } from '../config/bullmq';
import { getOrderDocumentSettings } from './orderDocumentSettings.service';
import { logger } from '../config/logger';

export interface ShippingAddressInput {
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  countryCode: string;
  phone?: string;
}

export const checkoutService = {
  /** Estimate shipping for the current cart. */
  async shippingEstimate(userId: number, geo: GeoContext) {
    const cart = await cartService.getCart(userId, geo);
    return {
      shippingAmount: cart.totals.shippingAmount,
      currencyCode: geo.currencyCode,
      estimatedDays: this.leadTime(geo.countryCode),
    };
  },

  leadTime(countryCode: string): string {
    // Keep a quick fallback for callers that do not need a DB read.
    const map: Record<string, string> = { AE: '2–5 business days', KE: '5–10 business days', DE: '3–7 business days' };
    return map[countryCode] ?? '5–14 business days';
  },

  /**
   * Create an order from the user's cart. Reserves stock for every line inside a single
   * interactive transaction; if any line lacks stock the whole order rolls back.
   */
  async createOrder(
    userId: number,
    userEmail: string,
    geo: GeoContext,
    input: { shipping: ShippingAddressInput; paymentGateway: PaymentGateway; customerNotes?: string; ip?: string },
  ) {
    const cart = await cartService.getCart(userId, geo);
    if (!cart.items.length) throw AppError.badRequest('CART_EMPTY', 'Your cart is empty.');

    const order = await prisma.$transaction(async (tx) => {
      // 1. Reserve stock for each line (throws INSUFFICIENT_STOCK on failure → full rollback)
      for (const item of cart.items) {
        await inventoryService.reserveStock(tx, item.variantId, geo.countryId, item.quantity);
      }

      // 2. Generate order number atomically
      const orderNumber = await orderRepository.generateOrderNumber(tx, geo.countryCode);
      const verificationToken = generateOpaqueToken();

      // 3. Per-line tax allocation
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId,
          countryId: geo.countryId,
          status: 'pending_payment',
          paymentStatus: 'unpaid',
          currencyCode: geo.currencyCode,
          subtotal: cart.totals.subtotal,
          discountAmount: cart.totals.discountAmount,
          couponCode: cart.couponCode,
          shippingAmount: cart.totals.shippingAmount,
          taxAmount: cart.totals.taxAmount,
          totalAmount: cart.totals.totalAmount,
          shippingFirstName: input.shipping.firstName,
          shippingLastName: input.shipping.lastName,
          shippingCompany: input.shipping.company,
          shippingAddress1: input.shipping.addressLine1,
          shippingAddress2: input.shipping.addressLine2,
          shippingCity: input.shipping.city,
          shippingState: input.shipping.state,
          shippingPostalCode: input.shipping.postalCode,
          shippingCountryCode: input.shipping.countryCode,
          shippingPhone: input.shipping.phone,
          shippingVerificationToken: verificationToken,
          verificationExpiresAt: addHours(new Date(), 48),
          paymentGateway: input.paymentGateway,
          customerNotes: input.customerNotes,
          ipAddress: input.ip,
          items: {
            create: cart.items.map((it) => ({
              productVariantId: it.variantId,
              productTitle: it.title,
              variantSku: it.variantSku,
              variantAttributes: it.attributes as object,
              unitPrice: it.unitPrice,
              quantity: it.quantity,
              subtotal: it.lineSubtotal,
              weightKg: it.weightKg,
            })),
          },
          statusHistory: { create: { status: 'pending_payment', note: 'Order created' } },
        },
      });

      // 4. Clear the cart within the same transaction
      await tx.cartItem.deleteMany({ where: { cart: { userId } } });
      await tx.cart.updateMany({ where: { userId }, data: { couponId: null, discountAmount: 0 } });

      return created;
    });

    // 5. Initiate payment (outside txn — external call)
    const payment = await paymentService.initiate(input.paymentGateway, {
      orderNumber: order.orderNumber,
      amount: Number(order.totalAmount),
      currency: order.currencyCode,
      email: userEmail,
    });

    // Bank transfer: notify immediately (awaiting manual confirmation)
    if (input.paymentGateway === 'bank_transfer') {
      await notificationService.queueEmail({
        template: 'order-confirmation',
        recipient: userEmail,
        subject: `Order ${order.orderNumber} received`,
        notificationType: 'order_confirmed',
        userId,
        referenceId: order.id,
        referenceType: 'order',
        data: { orderNumber: order.orderNumber, total: Number(order.totalAmount), currency: order.currencyCode },
      });
    }

    const documentSettings = await getOrderDocumentSettings();
    if (documentSettings.autoGenerateInvoiceOnOrder) {
      await pdfQueue.add(
        'order_invoice',
        { type: 'order_invoice', id: order.id },
        { jobId: `order-invoice-${order.id}` },
      ).catch((e) => logger.warn('order invoice queue failed', { orderId: order.id, error: e.message }));
    }

    return { orderId: order.id, orderNumber: order.orderNumber, payment };
  },

  /** Customer clicks the email link → unlock logistics (PRD §11.6). */
  async verifyShipping(token: string) {
    const order = await orderRepository.findByVerificationToken(token);
    if (!order) throw AppError.badRequest('INVALID_TOKEN', 'Invalid or expired verification link.');
    if (order.verificationExpiresAt && order.verificationExpiresAt < new Date()) {
      throw AppError.badRequest('TOKEN_EXPIRED', 'This verification link has expired.');
    }
    if (!order.isShippingVerified) {
      await prisma.order.update({
        where: { id: order.id },
        data: { isShippingVerified: true, status: order.status === 'paid' ? 'verified' : order.status },
      });
      await orderRepository.addStatusHistory(order.id, 'verified', 'Shipping address verified by customer');
    }
    return order.orderNumber;
  },
};
