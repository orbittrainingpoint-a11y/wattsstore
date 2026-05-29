-- CMS expansion: reusable media, testimonials, legal/informational pages and richer banners.
ALTER TABLE "banners"
ADD COLUMN "placement" VARCHAR(40) NOT NULL DEFAULT 'home_hero',
ADD COLUMN "eyebrow" VARCHAR(80),
ADD COLUMN "cta_label" VARCHAR(60),
ADD COLUMN "tone" VARCHAR(20);

UPDATE "banners" SET "country_ids" = ARRAY[]::INTEGER[] WHERE "country_ids" IS NULL;
ALTER TABLE "banners" ALTER COLUMN "country_ids" SET NOT NULL;

CREATE INDEX "banners_placement_is_active_sort_order_idx"
ON "banners"("placement", "is_active", "sort_order");

CREATE TABLE "media_assets" (
    "id" SERIAL NOT NULL,
    "url" VARCHAR(700) NOT NULL,
    "storage_key" VARCHAR(500),
    "filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(80) NOT NULL,
    "size_bytes" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,
    "alt_text" VARCHAR(255),
    "folder" VARCHAR(60) NOT NULL DEFAULT 'misc',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "uploaded_by" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "media_assets_folder_created_at_idx" ON "media_assets"("folder", "created_at");
ALTER TABLE "media_assets"
ADD CONSTRAINT "media_assets_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "testimonials" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "role" VARCHAR(150),
    "company" VARCHAR(150),
    "avatar_url" VARCHAR(500),
    "quote" TEXT NOT NULL,
    "rating" DECIMAL(3,1) NOT NULL DEFAULT 5,
    "country_ids" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "testimonials_is_active_sort_order_idx" ON "testimonials"("is_active", "sort_order");

CREATE TABLE "legal_pages" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "intro" TEXT,
    "hero_image_url" VARCHAR(500),
    "sections" JSONB NOT NULL,
    "updated_label" VARCHAR(40),
    "meta_title" VARCHAR(255),
    "meta_description" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "legal_pages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "legal_pages_slug_key" ON "legal_pages"("slug");
