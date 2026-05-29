/** Order lifecycle: payment confirmation, status transitions, cancellation, customer reads (PRD §12). */
import { prisma } from '../config/database';
import { orderRepository } from '../repositories/order.repository';
import { inventoryService } from './inventory.service';
import { couponService } from './coupon.service';
import { notificationService } from './notification.service';
import { paymentService } from './payment.service';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { pdfQueue } from '../config/bullmq';
import { getOrderDocumentSettings } from './orderDocumentSettings.service';

const dec = (v: unknown) => Number(v);

export const orderService = {
  /** Called by the payment webhook on successful payment. Idempotent. */
  async markPaid(orderNumber: string, gatewayRef: string, gatewayResponse: object) {
    const order = await prisma.order.findUnique({ where: { orderNumber }, include: { items: true } });
    if (!order) throw AppError.notFound('ORDER_NOT_FOUND', 'Order not found.');
    if (order.paymentStatus === 'paid') return order; // idempotent

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'paid',
        status: 'pending_verification',
        paidAt: new Date(),
        paymentGatewayRef: gatewayRef,
        paymentGatewayResponse: gatewayResponse,
      },
    });
    await orderRepository.addStatusHistory(order.id, 'paid', 'Payment confirmed');
    await orderRepository.addStatusHistory(order.id, 'pending_verification', 'Awaiting shipping verification');

    // Record coupon usage now that payment succeeded (PRD §16.2)
    if (order.couponCode && order.userId) {
      const coupon = await prisma.coupon.findUnique({ where: { code: order.couponCode } });
      if (coupon) {
        await couponService
          .recordUsage(coupon.id, order.userId, order.id, dec(order.discountAmount))
          .catch((e) => logger.warn('coupon usage record failed', { error: e.message }));
      }
    }

    const email = order.guestEmail ?? (await this.userEmail(order.userId));
    if (email && order.shippingVerificationToken) {
      await notificationService.queueEmail({
        template: 'order-confirmation',
        recipient: email,
        subject: `Order ${order.orderNumber} confirmed`,
        notificationType: 'order_confirmed',
        userId: order.userId,
        referenceId: order.id,
        referenceType: 'order',
        data: { orderNumber: order.orderNumber, total: dec(order.totalAmount), currency: order.currencyCode },
      });
      await notificationService.queueEmail({
        template: 'shipping-verification',
        recipient: email,
        subject: `Verify your shipping address for ${order.orderNumber}`,
        notificationType: 'shipping_verification',
        userId: order.userId,
        referenceId: order.id,
        referenceType: 'order',
        data: {
          orderNumber: order.orderNumber,
          verifyUrl: `${env.API_BASE_URL}/api/v1/checkout/verify-shipping/${order.shippingVerificationToken}`,
        },
      });
    }
    // Admin new-order alert
    await notificationService.queueEmail({
      template: 'order-confirmation',
      recipient: env.ADMIN_ALERT_EMAIL,
      subject: `New order ${order.orderNumber}`,
      notificationType: 'admin_new_order',
      data: { orderNumber: order.orderNumber, total: dec(order.totalAmount), currency: order.currencyCode },
    });

    return updated;
  },

  async userEmail(userId: number | null): Promise<string | null> {
    if (!userId) return null;
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    return u?.email ?? null;
  },

  async getForUser(orderNumber: string, userId: number) {
    const order = await orderRepository.findByNumber(orderNumber);
    if (!order || order.userId !== userId) throw AppError.notFound('ORDER_NOT_FOUND', 'Order not found.');
    return order;
  },

  /**
   * Public order tracking by orderNumber + email. Used by the customer
   * tracking page where the user may not be logged in (guest checkout flow).
   * Returns a SAFE subset — no PII beyond what the requester already knows.
   */
  async trackByEmail(orderNumber: string, email: string) {
    const order = await orderRepository.findByNumber(orderNumber);
    if (!order) throw AppError.notFound('ORDER_NOT_FOUND', 'Order not found.');
    const orderEmail = order.guestEmail ?? (await this.userEmail(order.userId));
    if (!orderEmail || orderEmail.toLowerCase() !== email.trim().toLowerCase()) {
      // Return same error as not-found to prevent enumeration.
      throw AppError.notFound('ORDER_NOT_FOUND', 'Order not found.');
    }
    return {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      currencyCode: order.currencyCode,
      totalAmount: Number(order.totalAmount),
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      isShippingVerified: order.isShippingVerified,
      shippingCity: order.shippingCity,
      shippingCountryCode: order.shippingCountryCode,
      items: order.items.map((i) => ({
        productTitle: i.productTitle,
        variantSku: i.variantSku,
        quantity: i.quantity,
      })),
      shipments: order.shipments.map((s) => ({
        carrier: s.carrier,
        trackingNumber: s.trackingNumber,
        trackingUrl: s.carrier && s.trackingNumber ? this.trackingUrl(s.carrier, s.trackingNumber) : null,
        estimatedDelivery: s.estimatedDelivery,
        shippedAt: s.shippedAt,
        deliveredAt: s.deliveredAt,
        status: s.status,
      })),
      statusHistory: order.statusHistory.map((h) => ({
        status: h.status,
        note: h.note,
        createdAt: h.createdAt,
      })),
    };
  },

  /** Build the carrier deep-link URL from the carrier name + tracking number. */
  trackingUrl(carrier: string, trackingNumber: string): string | null {
    const c = carrier.trim().toLowerCase();
    const enc = encodeURIComponent(trackingNumber);
    if (c.includes('aramex')) return `https://www.aramex.com/track/results?ShipmentNumber=${enc}`;
    if (c.includes('dhl')) return `https://www.dhl.com/en/express/tracking.html?AWB=${enc}`;
    if (c.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${enc}`;
    if (c.includes('ups')) return `https://www.ups.com/track?tracknum=${enc}`;
    if (c.includes('dpd')) return `https://www.dpd.com/tracking/${enc}`;
    return null;
  },

  async listForUser(userId: number, skip: number, take: number) {
    const [items, totalCount] = await orderRepository.listForUser(userId, skip, take);
    return { items, totalCount };
  },

  /** Customer cancellation request — allowed only pre-shipment (PRD §8.4). */
  async requestCancellation(orderNumber: string, userId: number) {
    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order || order.userId !== userId) throw AppError.notFound('ORDER_NOT_FOUND', 'Order not found.');
    const cancellable = ['pending_payment', 'pending_verification', 'verified', 'paid'];
    if (!cancellable.includes(order.status)) {
      throw AppError.badRequest('CANNOT_CANCEL', 'This order can no longer be cancelled.');
    }
    const cancelled = await prisma.order.updateMany({ where: { id: order.id, status: { in: cancellable as never[] } }, data: { status: 'cancelled' } });
    if (cancelled.count !== 1) throw AppError.conflict('CANCELLATION_ALREADY_PROCESSED', 'This order can no longer be cancelled.');
    await orderRepository.addStatusHistory(order.id, 'cancelled', 'Cancellation requested by customer', userId);

    // Release reserved stock
    const items = await prisma.orderItem.findMany({ where: { orderId: order.id } });
    for (const it of items) {
      await inventoryService.releaseReservation(it.productVariantId, order.countryId, it.quantity).catch(() => undefined);
    }
    return order.orderNumber;
  },

  // ── Admin lifecycle operations ──
  async updateStatus(orderId: number, status: string, note: string | undefined, actorId: number) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw AppError.notFound('ORDER_NOT_FOUND', 'Order not found.');
    if (status === 'shipped' && !order.isShippingVerified) {
      throw AppError.badRequest('NOT_VERIFIED', 'Cannot ship — shipping address not yet verified by customer.');
    }
    await prisma.order.update({ where: { id: orderId }, data: { status: status as never } });
    await orderRepository.addStatusHistory(orderId, status, note, actorId);

    const email = order.guestEmail ?? (await this.userEmail(order.userId));
    if (email && (status === 'shipped' || status === 'delivered' || status === 'cancelled' || status === 'refunded')) {
      await notificationService.queueEmail({
        template: `order-${status}`,
        recipient: email,
        subject: `Order ${order.orderNumber} ${status}`,
        notificationType: `order_${status}`,
        userId: order.userId,
        referenceId: orderId,
        referenceType: 'order',
        data: { orderNumber: order.orderNumber },
      });
    }
    return order.orderNumber;
  },

  async addShipment(orderId: number, data: { carrier: string; trackingNumber: string; estimatedDelivery?: Date }, actorId: number) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw AppError.notFound('ORDER_NOT_FOUND', 'Order not found.');
    if (!order.isShippingVerified) throw AppError.badRequest('NOT_VERIFIED', 'Shipping not verified.');
    if (['shipped', 'delivered', 'cancelled', 'refunded'].includes(order.status)) {
      throw AppError.conflict('SHIPMENT_ALREADY_PROCESSED', 'A shipment cannot be created for this order in its current state.');
    }

    const updated = await prisma.order.updateMany({
      where: { id: orderId, status: { notIn: ['shipped', 'delivered', 'cancelled', 'refunded'] as never[] } },
      data: { status: 'shipped', fulfillmentStatus: 'fulfilled' },
    });
    if (updated.count !== 1) throw AppError.conflict('SHIPMENT_ALREADY_PROCESSED', 'This order shipment has already been processed.');
    const shipment = await prisma.shipment.create({
      data: {
        orderId,
        carrier: data.carrier,
        trackingNumber: data.trackingNumber,
        estimatedDelivery: data.estimatedDelivery,
        shippedAt: new Date(),
        status: 'in_transit',
      },
    });
    await orderRepository.addStatusHistory(orderId, 'shipped', `Shipped via ${data.carrier} (${data.trackingNumber})`, actorId);

    // Commit inventory (reserved → sold) + bump product totals
    const items = await prisma.orderItem.findMany({ where: { orderId } });
    for (const it of items) {
      await inventoryService.commitShipment(it.productVariantId, order.countryId, it.quantity).catch(() => undefined);
      await prisma.product.updateMany({
        where: { variants: { some: { id: it.productVariantId } } },
        data: { totalSold: { increment: it.quantity } },
      });
    }
    const documentSettings = await getOrderDocumentSettings();
    if (documentSettings.autoGenerateCourierReceiptOnShipment) {
      await pdfQueue.add(
        'courier_receipt',
        { type: 'courier_receipt', id: shipment.id },
        { jobId: `courier-receipt-${shipment.id}` },
      ).catch((e) => logger.warn('courier receipt queue failed', { shipmentId: shipment.id, error: e.message }));
    }
    return shipment;
  },

  async processRefund(orderId: number, amount: number, reason: string, actorId: number) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw AppError.notFound('ORDER_NOT_FOUND', 'Order not found.');
    if (amount <= 0 || amount > dec(order.totalAmount)) {
      throw AppError.badRequest('INVALID_AMOUNT', 'Refund amount is invalid.');
    }
    const gw = order.paymentGatewayRef ? await paymentService.refund(order.paymentGatewayRef, amount) : { ref: 'manual', status: 'completed' as const };
    const refund = await prisma.refund.create({
      data: { orderId, amount, reason, gatewayRef: gw.ref, status: gw.status, processedBy: actorId },
    });
    const fullyRefunded = amount >= dec(order.totalAmount);
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: fullyRefunded ? 'refunded' : 'partially_refunded', status: fullyRefunded ? 'refunded' : order.status },
    });
    await orderRepository.addStatusHistory(orderId, 'refunded', `Refund ${amount}: ${reason}`, actorId);
    return refund;
  },
};
