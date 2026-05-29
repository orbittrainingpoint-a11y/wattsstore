CREATE TABLE "bulk_quote_messages" (
  "id" SERIAL PRIMARY KEY,
  "bulk_quote_id" INTEGER NOT NULL,
  "sender_id" INTEGER,
  "sender_role" VARCHAR(30) NOT NULL,
  "message" TEXT NOT NULL,
  "is_internal" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bulk_quote_messages_bulk_quote_id_fkey" FOREIGN KEY ("bulk_quote_id") REFERENCES "bulk_quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "bulk_quote_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "bulk_quote_messages_bulk_quote_id_created_at_idx" ON "bulk_quote_messages"("bulk_quote_id", "created_at");
