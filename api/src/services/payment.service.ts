/**
 * Payment gateway abstraction (PRD §11.5). Stripe + PayTabs + bank transfer.
 * In dev (no keys) Stripe falls back to a mock client secret so checkout is testable.
 * PCI scope is fully delegated to the gateways — no raw card data ever touches this server.
 */
import Stripe from 'stripe';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { AppError } from '../utils/AppError';

const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;

export type PaymentGateway = 'stripe' | 'paytabs' | 'bank_transfer';

export interface PaymentInitResult {
  gateway: PaymentGateway;
  clientSecret?: string;
  redirectUrl?: string;
  requiresAction: boolean;
}

export const paymentService = {
  async initiate(
    gateway: PaymentGateway,
    params: { orderNumber: string; amount: number; currency: string; email: string },
  ): Promise<PaymentInitResult> {
    if (gateway === 'bank_transfer') {
      return { gateway, requiresAction: false }; // order stays unpaid until admin confirms
    }

    if (gateway === 'stripe') {
      if (!stripe) {
        logger.warn('Stripe key absent — returning mock client secret (dev only)');
        return { gateway, clientSecret: `mock_secret_${params.orderNumber}`, requiresAction: true };
      }
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(params.amount * 100),
        currency: params.currency.toLowerCase(),
        receipt_email: params.email,
        metadata: { orderNumber: params.orderNumber },
        automatic_payment_methods: { enabled: true },
      });
      return { gateway, clientSecret: intent.client_secret ?? undefined, requiresAction: true };
    }

    // Do not create orders against an unsigned/stubbed payment path.
    throw AppError.badRequest('PAYMENT_GATEWAY_UNAVAILABLE', 'PayTabs payment is not available yet. Please use card or bank transfer.');
  },

  /** Verify a Stripe webhook signature against the raw body (PRD §11.5). */
  verifyStripeWebhook(rawBody: Buffer, signature: string): Stripe.Event {
    if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('Stripe webhook not configured');
    }
    return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  },

  async refund(gatewayRef: string, amount: number): Promise<{ ref: string; status: 'completed' | 'pending' }> {
    if (!stripe) return { ref: `mock_refund_${gatewayRef}`, status: 'completed' };
    const refund = await stripe.refunds.create({ payment_intent: gatewayRef, amount: Math.round(amount * 100) });
    return { ref: refund.id, status: refund.status === 'succeeded' ? 'completed' : 'pending' };
  },
};
