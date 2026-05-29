/** Inventory: stock reservation (interactive txn), release, decrement, schema validation (PRD §7.4, §10.2, §17). */
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';

export interface SchemaField {
  field: string;
  label: string;
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  options?: string[];
  filterEnabled?: boolean;
}

export const inventoryService = {
  /** Validate variant attributes against the parent category's variant_specification_schema. */
  validateVariantAttributes(attributes: Record<string, unknown>, schema: SchemaField[] | null): void {
    if (!schema) return;
    for (const field of schema) {
      const value = attributes[field.field];
      if (field.required && (value === undefined || value === null || value === '')) {
        throw AppError.badRequest('MISSING_REQUIRED_FIELD', `Missing required attribute: ${field.field}`, field.field);
      }
      if (value !== undefined && value !== null && value !== '') {
        if (field.type === 'number' && typeof value !== 'number') {
          throw AppError.badRequest('INVALID_ATTRIBUTE_TYPE', `${field.label} must be a number.`, field.field);
        }
        if (field.type === 'boolean' && typeof value !== 'boolean') {
          throw AppError.badRequest('INVALID_ATTRIBUTE_TYPE', `${field.label} must be yes/no.`, field.field);
        }
      }
      if (value !== undefined && Array.isArray(field.options) && field.options.length && !field.options.includes(String(value))) {
        throw AppError.badRequest(
          'INVALID_OPTION',
          `${field.label} must be one of: ${field.options.join(', ')}`,
          field.field,
        );
      }
    }
  },

  /** Reserve stock atomically. Throws INSUFFICIENT_STOCK if not enough available. */
  async reserveStock(
    tx: Prisma.TransactionClient,
    variantId: number,
    countryId: number,
    quantity: number,
  ): Promise<void> {
    const changed = await tx.$executeRaw`
      UPDATE "regional_inventory_pricing"
      SET "stock_reserved" = "stock_reserved" + ${quantity}, "updated_at" = NOW()
      WHERE "product_variant_id" = ${variantId}
        AND "country_id" = ${countryId}
        AND "is_available" = TRUE
        AND ("stock_on_hand" - "stock_reserved") >= ${quantity}
    `;
    if (changed === 1) return;

    const row = await tx.regionalInventoryPricing.findUnique({
      where: { productVariantId_countryId: { productVariantId: variantId, countryId } },
    });
    if (!row || !row.isAvailable) {
      throw AppError.badRequest('UNAVAILABLE', 'This item is not available in your region.', 'variantId');
    }
    const available = Math.max(0, row.stockOnHand - row.stockReserved);
    throw AppError.badRequest(
      'INSUFFICIENT_STOCK',
      `Only ${available} unit(s) available for this variant.`,
      'quantity',
    );
  },

  /** Release reservation (cancellation / refund). */
  async releaseReservation(variantId: number, countryId: number, quantity: number): Promise<void> {
    await prisma.$executeRaw`
      UPDATE "regional_inventory_pricing"
      SET "stock_reserved" = GREATEST(0, "stock_reserved" - ${quantity}), "updated_at" = NOW()
      WHERE "product_variant_id" = ${variantId} AND "country_id" = ${countryId}
    `;
  },

  /** On shipment: convert reservation to a sale (decrement both reserved and on-hand). */
  async commitShipment(variantId: number, countryId: number, quantity: number): Promise<void> {
    const row = await prisma.regionalInventoryPricing.findUnique({
      where: { productVariantId_countryId: { productVariantId: variantId, countryId } },
    });
    if (!row) return;
    await prisma.$transaction([
      prisma.regionalInventoryPricing.update({
        where: { productVariantId_countryId: { productVariantId: variantId, countryId } },
        data: { stockReserved: { decrement: quantity }, stockOnHand: { decrement: quantity } },
      }),
      prisma.inventoryAdjustment.create({
        data: {
          productVariantId: variantId,
          countryId,
          adjustmentType: 'sold',
          quantityDelta: -quantity,
          quantityBefore: row.stockOnHand,
          quantityAfter: row.stockOnHand - quantity,
          referenceType: 'order',
          note: 'Auto-decrement on shipment',
        },
      }),
    ]);
  },

  /** Manual admin adjustment with audit log. */
  async adjustStock(params: {
    variantId: number;
    countryId: number;
    type: 'received' | 'returned' | 'damaged' | 'correction' | 'transfer';
    quantityDelta: number;
    note?: string;
    adjustedBy?: number;
  }) {
    return prisma.$transaction(async (tx) => {
      const row = await tx.regionalInventoryPricing.findUnique({
        where: { productVariantId_countryId: { productVariantId: params.variantId, countryId: params.countryId } },
      });
      if (!row) throw AppError.notFound('PRICING_NOT_FOUND', 'No inventory record for this variant/region.');
      const after = row.stockOnHand + params.quantityDelta;
      if (after < 0) throw AppError.badRequest('NEGATIVE_STOCK', 'Adjustment would make stock negative.');

      await tx.regionalInventoryPricing.update({
        where: { productVariantId_countryId: { productVariantId: params.variantId, countryId: params.countryId } },
        data: { stockOnHand: after },
      });
      return tx.inventoryAdjustment.create({
        data: {
          productVariantId: params.variantId,
          countryId: params.countryId,
          adjustmentType: params.type,
          quantityDelta: params.quantityDelta,
          quantityBefore: row.stockOnHand,
          quantityAfter: after,
          note: params.note,
          adjustedBy: params.adjustedBy,
        },
      });
    });
  },
};
