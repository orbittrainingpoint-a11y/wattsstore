/** Puppeteer invoice PDF generation → upload to MinIO (PRD §7.4, §13.6). Invoked by pdf.worker. */
import puppeteer from 'puppeteer';
import { prisma } from '../config/database';
import { renderTemplate } from './template.service';
import { putObject, presignedDownload } from '../config/minio';
import { notificationService } from './notification.service';
import { env } from '../config/env';
import { getOrderDocumentSettings } from './orderDocumentSettings.service';

const COMPANY = { name: env.COMPANY_NAME, address: env.COMPANY_ADDRESS, trn: env.COMPANY_TRN };

async function htmlToPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    return Buffer.from(await page.pdf({ format: 'A4', printBackground: true }));
  } finally {
    await browser.close();
  }
}

export const pdfService = {
  /** Generate a B2B quote invoice, store in MinIO, set invoice_url, email the customer. */
  async generateQuoteInvoice(quoteId: number): Promise<string> {
    const quote = await prisma.bulkQuote.findUnique({ where: { id: quoteId }, include: { items: true } });
    if (!quote) throw new Error('Quote not found');

    const html = renderTemplate('invoice', {
      docTitle: 'QUOTATION',
      reference: quote.quoteRefNumber,
      issuedAt: new Date(),
      validUntil: quote.expiresAt,
      company: COMPANY,
      customer: { name: quote.contactName, company: quote.companyName, location: quote.deliveryLocation, trn: quote.trnTaxId },
      items: quote.items.map((it) => ({
        title: it.productTitle,
        sku: it.variantSku,
        quantity: it.targetQuantity,
        unitPrice: Number(it.offeredUnitPrice ?? 0),
        subtotal: Number(it.offeredSubtotal ?? 0),
      })),
      currency: quote.currencyCode,
      total: Number(quote.totalOfferedValue ?? 0),
      paymentTerms: '50% advance, 50% on delivery',
    });

    try {
      const buffer = await htmlToPdf(html);
      const objectKey = `invoices/${quote.quoteRefNumber}.pdf`;
      await putObject(objectKey, buffer, 'application/pdf');
      await prisma.bulkQuote.update({ where: { id: quoteId }, data: { invoiceUrl: objectKey } });

      const downloadUrl = await presignedDownload(objectKey);
      await notificationService.queueEmail({
        template: 'rfq-invoice-ready',
        recipient: quote.contactEmail,
        subject: `Your WattsStore quote ${quote.quoteRefNumber}`,
        notificationType: 'rfq_invoice_ready',
        userId: quote.userId,
        referenceId: quote.id,
        referenceType: 'bulk_quote',
        data: {
          contactName: quote.contactName,
          refNumber: quote.quoteRefNumber,
          total: Number(quote.totalOfferedValue ?? 0),
          currency: quote.currencyCode,
          invoiceUrl: downloadUrl,
        },
      }, { throwOnQueueFailure: true });
      return objectKey;
    } catch (error) {
      await prisma.bulkQuote.update({ where: { id: quoteId }, data: { quoteStatus: 'delivery_failed' } }).catch(() => undefined);
      await prisma.bulkQuoteStatusHistory.create({
        data: { bulkQuoteId: quoteId, status: 'delivery_failed', note: 'Quotation PDF or email queue delivery failed.' },
      }).catch(() => undefined);
      throw error;
    }
  },

  /** Generate a B2C order invoice PDF, store + set invoice_url. */
  async generateOrderInvoice(orderId: number): Promise<string> {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new Error('Order not found');

    const html = renderTemplate('invoice', {
      docTitle: 'INVOICE',
      reference: order.orderNumber,
      issuedAt: order.createdAt,
      company: COMPANY,
      customer: { name: `${order.shippingFirstName} ${order.shippingLastName}`, company: order.shippingCompany, location: `${order.shippingAddress1}, ${order.shippingCity}` },
      items: order.items.map((it) => ({ title: it.productTitle, sku: it.variantSku, quantity: it.quantity, unitPrice: Number(it.unitPrice), subtotal: Number(it.subtotal) })),
      currency: order.currencyCode,
      total: Number(order.totalAmount),
      paymentTerms: 'Paid online',
    });

    const buffer = await htmlToPdf(html);
    const objectKey = `invoices/${order.orderNumber}.pdf`;
    await putObject(objectKey, buffer, 'application/pdf');
    await prisma.order.update({ where: { id: orderId }, data: { invoiceUrl: objectKey } });
    return objectKey;
  },

  /** Generate a courier handover receipt for a shipment, store + set label_url. */
  async generateCourierReceipt(shipmentId: number): Promise<string> {
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { order: { include: { items: true } } },
    });
    if (!shipment) throw new Error('Shipment not found');

    const settings = await getOrderDocumentSettings();
    const order = shipment.order;
    const html = renderTemplate('courier-receipt', {
      issuedAt: new Date(),
      company: COMPANY,
      order,
      shipment: {
        carrier: shipment.carrier ?? settings.defaultCourier,
        trackingNumber: shipment.trackingNumber ?? order.orderNumber,
        estimatedDelivery: shipment.estimatedDelivery,
      },
      customer: {
        name: `${order.shippingFirstName} ${order.shippingLastName}`,
        company: order.shippingCompany,
        address1: order.shippingAddress1,
        address2: order.shippingAddress2,
        city: order.shippingCity,
        countryCode: order.shippingCountryCode,
        phone: order.shippingPhone,
      },
      items: order.items.map((it) => ({
        title: it.productTitle,
        sku: it.variantSku,
        quantity: it.quantity,
        subtotal: Number(it.subtotal),
      })),
      showPrices: settings.showPricesOnCourierReceipt,
      receiptFooter: settings.receiptFooter,
    });

    const buffer = await htmlToPdf(html);
    const safeTracking = (shipment.trackingNumber ?? `shipment-${shipment.id}`).replace(/[^a-z0-9_-]/gi, '-');
    const objectKey = `shipments/${order.orderNumber}-${safeTracking}.pdf`;
    await putObject(objectKey, buffer, 'application/pdf');
    await prisma.shipment.update({ where: { id: shipmentId }, data: { labelUrl: objectKey } });
    return objectKey;
  },
};
