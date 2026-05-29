ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'quotation_generating';
ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'delivery_failed';

ALTER TABLE "orders" ADD COLUMN "source_bulk_quote_id" INTEGER;

CREATE UNIQUE INDEX "orders_source_bulk_quote_id_key" ON "orders"("source_bulk_quote_id");

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_source_bulk_quote_id_fkey"
  FOREIGN KEY ("source_bulk_quote_id") REFERENCES "bulk_quotes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
