CREATE TABLE "product_documents" (
  "id" SERIAL PRIMARY KEY,
  "product_id" INTEGER NOT NULL,
  "title" VARCHAR(150) NOT NULL,
  "file_url" VARCHAR(700) NOT NULL,
  "file_type" VARCHAR(40) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "product_documents_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "product_documents_product_id_idx" ON "product_documents"("product_id");

CREATE TABLE "product_faqs" (
  "id" SERIAL PRIMARY KEY,
  "product_id" INTEGER NOT NULL,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "product_faqs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "product_faqs_product_id_is_active_sort_order_idx" ON "product_faqs"("product_id", "is_active", "sort_order");
