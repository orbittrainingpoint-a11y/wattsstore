ALTER TABLE "products"
  ADD COLUMN "key_features" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
