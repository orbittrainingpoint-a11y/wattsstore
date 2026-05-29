-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('customer', 'sales_agent', 'admin', 'super_admin');

-- CreateEnum
CREATE TYPE "AuthTokenType" AS ENUM ('email_verification', 'password_reset');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending_payment', 'paid', 'pending_verification', 'verified', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('unpaid', 'paid', 'partially_refunded', 'refunded');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('unfulfilled', 'partially_fulfilled', 'fulfilled');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('pending', 'in_transit', 'out_for_delivery', 'delivered', 'failed');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('submitted', 'under_review', 'offered', 'invoice_sent', 'accepted', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percentage', 'fixed_amount', 'free_shipping');

-- CreateEnum
CREATE TYPE "PromoAppliesTo" AS ENUM ('all', 'specific_categories', 'specific_products');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "ThreadStatus" AS ENUM ('pending', 'published', 'closed', 'removed');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('received', 'sold', 'returned', 'damaged', 'correction', 'transfer');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('pending', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "SolarJobStatus" AS ENUM ('queued', 'processing', 'completed', 'failed');

-- CreateTable
CREATE TABLE "countries" (
    "id" SERIAL NOT NULL,
    "country_code" VARCHAR(2) NOT NULL,
    "country_name" VARCHAR(100) NOT NULL,
    "currency_code" VARCHAR(3) NOT NULL,
    "currency_symbol" VARCHAR(5) NOT NULL,
    "subdomain_slug" VARCHAR(20) NOT NULL,
    "locale_code" VARCHAR(10) NOT NULL,
    "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rules" (
    "id" SERIAL NOT NULL,
    "country_id" INTEGER NOT NULL,
    "tax_class" VARCHAR(50) NOT NULL DEFAULT 'standard',
    "tax_rate" DECIMAL(5,2) NOT NULL,
    "tax_label" VARCHAR(50) NOT NULL,
    "is_inclusive" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(30),
    "role" "UserRole" NOT NULL DEFAULT 'customer',
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "newsletter_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMPTZ,
    "last_login_ip" INET,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "token_type" "AuthTokenType" NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "device_info" TEXT,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "ip_address" INET NOT NULL,
    "successful" BOOLEAN NOT NULL DEFAULT false,
    "attempted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "address_label" VARCHAR(50),
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "company_name" VARCHAR(150),
    "address_line_1" VARCHAR(255) NOT NULL,
    "address_line_2" VARCHAR(255),
    "city" VARCHAR(100) NOT NULL,
    "state_province" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "country_code" VARCHAR(2) NOT NULL,
    "phone" VARCHAR(30),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "logo_url" VARCHAR(500),
    "banner_image_url" VARCHAR(500),
    "origin_country" VARCHAR(100),
    "description" TEXT,
    "website_url" VARCHAR(500),
    "meta_title" VARCHAR(255),
    "meta_description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "parent_id" INTEGER,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "image_url" VARCHAR(500),
    "banner_image_url" VARCHAR(500),
    "icon_url" VARCHAR(500),
    "meta_title" VARCHAR(255),
    "meta_description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "variant_specification_schema" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "show_in_menu" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "brand_id" INTEGER,
    "sku_base" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(270) NOT NULL,
    "short_description" TEXT,
    "full_description" TEXT,
    "brand_origin" VARCHAR(50),
    "tax_class" VARCHAR(50) NOT NULL DEFAULT 'standard',
    "is_price_visible" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_new_arrival" BOOLEAN NOT NULL DEFAULT false,
    "is_best_seller" BOOLEAN NOT NULL DEFAULT false,
    "datasheet_url" VARCHAR(500),
    "ies_file_url" VARCHAR(500),
    "meta_title" VARCHAR(255),
    "meta_description" TEXT,
    "average_rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "total_sold" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,
    "alt_text" VARCHAR(255),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "variant_sku" VARCHAR(150) NOT NULL,
    "attributes" JSONB NOT NULL,
    "weight_kg" DECIMAL(8,3) NOT NULL DEFAULT 0,
    "dimensions" JSONB,
    "barcode" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regional_inventory_pricing" (
    "id" SERIAL NOT NULL,
    "product_variant_id" INTEGER NOT NULL,
    "country_id" INTEGER NOT NULL,
    "retail_price" DECIMAL(12,2),
    "compare_at_price" DECIMAL(12,2),
    "cost_price" DECIMAL(12,2) NOT NULL,
    "stock_on_hand" INTEGER NOT NULL DEFAULT 0,
    "stock_reserved" INTEGER NOT NULL DEFAULT 0,
    "stock_low_threshold" INTEGER NOT NULL DEFAULT 5,
    "base_shipping_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "per_kg_adder" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "regional_inventory_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cross_sell_bundles" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "related_product_id" INTEGER NOT NULL,
    "bundle_discount_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cross_sell_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "session_id" VARCHAR(128) NOT NULL,
    "coupon_id" INTEGER,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "country_id" INTEGER,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" SERIAL NOT NULL,
    "cart_id" INTEGER NOT NULL,
    "product_variant_id" INTEGER NOT NULL,
    "quantity" SMALLINT NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "order_number" VARCHAR(30) NOT NULL,
    "user_id" INTEGER,
    "guest_email" VARCHAR(255),
    "country_id" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending_payment',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'unpaid',
    "fulfillment_status" "FulfillmentStatus" NOT NULL DEFAULT 'unfulfilled',
    "currency_code" VARCHAR(3) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "coupon_code" VARCHAR(50),
    "shipping_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "shipping_first_name" VARCHAR(100) NOT NULL,
    "shipping_last_name" VARCHAR(100) NOT NULL,
    "shipping_company" VARCHAR(150),
    "shipping_address_1" VARCHAR(255) NOT NULL,
    "shipping_address_2" VARCHAR(255),
    "shipping_city" VARCHAR(100) NOT NULL,
    "shipping_state" VARCHAR(100),
    "shipping_postal_code" VARCHAR(20),
    "shipping_country_code" VARCHAR(2) NOT NULL,
    "shipping_phone" VARCHAR(30),
    "billing_first_name" VARCHAR(100),
    "billing_last_name" VARCHAR(100),
    "billing_address_1" VARCHAR(255),
    "billing_address_2" VARCHAR(255),
    "billing_city" VARCHAR(100),
    "billing_country_code" VARCHAR(2),
    "is_shipping_verified" BOOLEAN NOT NULL DEFAULT false,
    "shipping_verification_token" VARCHAR(255),
    "verification_expires_at" TIMESTAMPTZ,
    "payment_gateway" VARCHAR(50),
    "payment_gateway_ref" VARCHAR(255),
    "payment_gateway_response" JSONB,
    "paid_at" TIMESTAMPTZ,
    "customer_notes" TEXT,
    "admin_notes" TEXT,
    "invoice_url" VARCHAR(500),
    "ip_address" INET,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "product_variant_id" INTEGER NOT NULL,
    "product_title" VARCHAR(255) NOT NULL,
    "variant_sku" VARCHAR(150) NOT NULL,
    "variant_attributes" JSONB NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "weight_kg" DECIMAL(8,3) NOT NULL,
    "image_url" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "note" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "tracking_number" VARCHAR(100),
    "carrier" VARCHAR(100),
    "shipped_at" TIMESTAMPTZ,
    "estimated_delivery" TIMESTAMPTZ,
    "delivered_at" TIMESTAMPTZ,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'pending',
    "label_url" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "gateway_ref" VARCHAR(255),
    "status" "RefundStatus" NOT NULL DEFAULT 'pending',
    "processed_by" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_quotes" (
    "id" SERIAL NOT NULL,
    "quote_ref_number" VARCHAR(30) NOT NULL,
    "user_id" INTEGER,
    "country_id" INTEGER NOT NULL,
    "company_name" VARCHAR(150) NOT NULL,
    "contact_name" VARCHAR(150) NOT NULL,
    "contact_email" VARCHAR(255) NOT NULL,
    "contact_phone" VARCHAR(30),
    "trn_tax_id" VARCHAR(50),
    "delivery_location" TEXT NOT NULL,
    "urgency_level" VARCHAR(20) NOT NULL,
    "additional_notes" TEXT,
    "quote_status" "QuoteStatus" NOT NULL DEFAULT 'submitted',
    "assigned_sales_agent_id" INTEGER,
    "total_offered_value" DECIMAL(12,2),
    "currency_code" VARCHAR(3) NOT NULL,
    "invoice_url" VARCHAR(500),
    "invoice_sent_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "bulk_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_quote_items" (
    "id" SERIAL NOT NULL,
    "bulk_quote_id" INTEGER NOT NULL,
    "product_variant_id" INTEGER NOT NULL,
    "product_title" VARCHAR(255) NOT NULL,
    "variant_sku" VARCHAR(150) NOT NULL,
    "variant_attributes" JSONB NOT NULL,
    "target_quantity" INTEGER NOT NULL,
    "customer_remarks" TEXT,
    "offered_unit_price" DECIMAL(12,2),
    "offered_subtotal" DECIMAL(12,2),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "bulk_quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_quote_status_history" (
    "id" SERIAL NOT NULL,
    "bulk_quote_id" INTEGER NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "note" TEXT,
    "changed_by" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulk_quote_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "discount_type" "DiscountType" NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "min_order_value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "applies_to" "PromoAppliesTo" NOT NULL DEFAULT 'all',
    "applicable_ids" INTEGER[],
    "country_ids" INTEGER[],
    "is_exclusive" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "discount_type" "DiscountType" NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "min_order_value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "max_discount_cap" DECIMAL(10,2),
    "usage_limit_total" INTEGER,
    "usage_limit_per_user" INTEGER NOT NULL DEFAULT 1,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "applies_to" VARCHAR(30) NOT NULL DEFAULT 'all',
    "applicable_ids" INTEGER[],
    "country_ids" INTEGER[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_usages" (
    "id" SERIAL NOT NULL,
    "coupon_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "order_id" INTEGER NOT NULL,
    "discount_applied" DECIMAL(10,2) NOT NULL,
    "used_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlists" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "variant_id" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_reviews" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "order_item_id" INTEGER,
    "rating" INTEGER NOT NULL,
    "title" VARCHAR(150),
    "body" TEXT,
    "is_verified_purchase" BOOLEAN NOT NULL DEFAULT false,
    "status" "ReviewStatus" NOT NULL DEFAULT 'pending',
    "admin_note" TEXT,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_helpful_votes" (
    "id" SERIAL NOT NULL,
    "review_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_helpful_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_threads" (
    "id" SERIAL NOT NULL,
    "author_id" INTEGER,
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(270) NOT NULL,
    "body" TEXT NOT NULL,
    "category" VARCHAR(100),
    "status" "ThreadStatus" NOT NULL DEFAULT 'pending',
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "reply_count" INTEGER NOT NULL DEFAULT 0,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "forum_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_replies" (
    "id" SERIAL NOT NULL,
    "thread_id" INTEGER NOT NULL,
    "author_id" INTEGER,
    "body" TEXT NOT NULL,
    "status" "ThreadStatus" NOT NULL DEFAULT 'pending',
    "is_accepted_answer" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "forum_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" SERIAL NOT NULL,
    "author_id" INTEGER,
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(270) NOT NULL,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "cover_image_url" VARCHAR(500),
    "category" VARCHAR(100),
    "tags" TEXT[],
    "meta_title" VARCHAR(255),
    "meta_description" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq_entries" (
    "id" SERIAL NOT NULL,
    "category_name" VARCHAR(100),
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faq_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(150),
    "subtitle" VARCHAR(255),
    "image_url" VARCHAR(500) NOT NULL,
    "mobile_image_url" VARCHAR(500),
    "link_url" VARCHAR(500),
    "country_ids" INTEGER[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMPTZ,
    "ends_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "channel" VARCHAR(20) NOT NULL,
    "notification_type" VARCHAR(60) NOT NULL,
    "subject" VARCHAR(255),
    "body_preview" TEXT,
    "reference_id" INTEGER,
    "reference_type" VARCHAR(30),
    "status" "NotificationStatus" NOT NULL DEFAULT 'pending',
    "sent_at" TIMESTAMPTZ,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_adjustments" (
    "id" SERIAL NOT NULL,
    "product_variant_id" INTEGER NOT NULL,
    "country_id" INTEGER NOT NULL,
    "adjustment_type" "AdjustmentType" NOT NULL,
    "quantity_delta" INTEGER NOT NULL,
    "quantity_before" INTEGER NOT NULL,
    "quantity_after" INTEGER NOT NULL,
    "reference_id" INTEGER,
    "reference_type" VARCHAR(30),
    "note" TEXT,
    "adjusted_by" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "actor_id" INTEGER,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" INTEGER,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" INET,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solar_planner_jobs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "session_id" VARCHAR(255),
    "country_id" INTEGER,
    "job_id" VARCHAR(100) NOT NULL,
    "floor_plan_url" VARCHAR(500) NOT NULL,
    "status" "SolarJobStatus" NOT NULL DEFAULT 'queued',
    "result_data" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "solar_planner_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solar_roi_results" (
    "id" SERIAL NOT NULL,
    "job_id" INTEGER,
    "user_id" INTEGER,
    "usable_area_m2" DECIMAL(10,2),
    "regional_irradiance" DECIMAL(8,2),
    "local_electricity_rate" DECIMAL(8,4),
    "year1_yield_kwh" DECIMAL(12,2),
    "year5_cumulative_savings" DECIMAL(12,2),
    "payback_years" DECIMAL(5,2),
    "roi_percentage" DECIMAL(8,2),
    "annual_degradation_pct" DECIMAL(4,2) NOT NULL DEFAULT 0.50,
    "forecast_data" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solar_roi_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_country_code_key" ON "countries"("country_code");

-- CreateIndex
CREATE UNIQUE INDEX "countries_subdomain_slug_key" ON "countries"("subdomain_slug");

-- CreateIndex
CREATE UNIQUE INDEX "tax_rules_country_id_tax_class_key" ON "tax_rules"("country_id", "tax_class");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "auth_tokens_token_key" ON "auth_tokens"("token");

-- CreateIndex
CREATE INDEX "auth_tokens_token_idx" ON "auth_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "login_attempts_email_ip_address_attempted_at_idx" ON "login_attempts"("email", "ip_address", "attempted_at");

-- CreateIndex
CREATE INDEX "addresses_user_id_idx" ON "addresses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE INDEX "brands_is_active_idx" ON "brands"("is_active");

-- CreateIndex
CREATE INDEX "brands_is_featured_idx" ON "brands"("is_featured");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "categories_is_active_idx" ON "categories"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_base_key" ON "products"("sku_base");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_brand_id_idx" ON "products"("brand_id");

-- CreateIndex
CREATE INDEX "products_is_active_idx" ON "products"("is_active");

-- CreateIndex
CREATE INDEX "products_is_featured_idx" ON "products"("is_featured");

-- CreateIndex
CREATE INDEX "product_images_product_id_idx" ON "product_images"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_variant_sku_key" ON "product_variants"("variant_sku");

-- CreateIndex
CREATE INDEX "product_variants_product_id_idx" ON "product_variants"("product_id");

-- CreateIndex
CREATE INDEX "regional_inventory_pricing_country_id_idx" ON "regional_inventory_pricing"("country_id");

-- CreateIndex
CREATE UNIQUE INDEX "regional_inventory_pricing_product_variant_id_country_id_key" ON "regional_inventory_pricing"("product_variant_id", "country_id");

-- CreateIndex
CREATE UNIQUE INDEX "cross_sell_bundles_product_id_related_product_id_key" ON "cross_sell_bundles"("product_id", "related_product_id");

-- CreateIndex
CREATE INDEX "carts_user_id_idx" ON "carts"("user_id");

-- CreateIndex
CREATE INDEX "carts_session_id_idx" ON "carts"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cart_id_product_variant_id_key" ON "cart_items"("cart_id", "product_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "orders_shipping_verification_token_key" ON "orders"("shipping_verification_token");

-- CreateIndex
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_country_id_idx" ON "orders"("country_id");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_status_history_order_id_idx" ON "order_status_history"("order_id");

-- CreateIndex
CREATE INDEX "shipments_order_id_idx" ON "shipments"("order_id");

-- CreateIndex
CREATE INDEX "refunds_order_id_idx" ON "refunds"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "bulk_quotes_quote_ref_number_key" ON "bulk_quotes"("quote_ref_number");

-- CreateIndex
CREATE INDEX "bulk_quotes_user_id_idx" ON "bulk_quotes"("user_id");

-- CreateIndex
CREATE INDEX "bulk_quotes_quote_status_idx" ON "bulk_quotes"("quote_status");

-- CreateIndex
CREATE INDEX "bulk_quote_items_bulk_quote_id_idx" ON "bulk_quote_items"("bulk_quote_id");

-- CreateIndex
CREATE INDEX "promotions_is_active_idx" ON "promotions"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_is_active_idx" ON "coupons"("is_active");

-- CreateIndex
CREATE INDEX "coupons_expires_at_idx" ON "coupons"("expires_at");

-- CreateIndex
CREATE INDEX "coupon_usages_coupon_id_idx" ON "coupon_usages"("coupon_id");

-- CreateIndex
CREATE INDEX "coupon_usages_user_id_idx" ON "coupon_usages"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "wishlists_user_id_product_id_key" ON "wishlists"("user_id", "product_id");

-- CreateIndex
CREATE INDEX "product_reviews_product_id_idx" ON "product_reviews"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_reviews_user_id_product_id_key" ON "product_reviews"("user_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_helpful_votes_review_id_user_id_key" ON "review_helpful_votes"("review_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "forum_threads_slug_key" ON "forum_threads"("slug");

-- CreateIndex
CREATE INDEX "forum_threads_status_idx" ON "forum_threads"("status");

-- CreateIndex
CREATE INDEX "forum_replies_thread_id_idx" ON "forum_replies"("thread_id");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_status_idx" ON "blog_posts"("status");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "inventory_adjustments_product_variant_id_country_id_idx" ON "inventory_adjustments"("product_variant_id", "country_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "solar_planner_jobs_job_id_key" ON "solar_planner_jobs"("job_id");

-- AddForeignKey
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regional_inventory_pricing" ADD CONSTRAINT "regional_inventory_pricing_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regional_inventory_pricing" ADD CONSTRAINT "regional_inventory_pricing_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cross_sell_bundles" ADD CONSTRAINT "cross_sell_bundles_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cross_sell_bundles" ADD CONSTRAINT "cross_sell_bundles_related_product_id_fkey" FOREIGN KEY ("related_product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_quotes" ADD CONSTRAINT "bulk_quotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_quotes" ADD CONSTRAINT "bulk_quotes_assigned_sales_agent_id_fkey" FOREIGN KEY ("assigned_sales_agent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_quotes" ADD CONSTRAINT "bulk_quotes_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_quote_items" ADD CONSTRAINT "bulk_quote_items_bulk_quote_id_fkey" FOREIGN KEY ("bulk_quote_id") REFERENCES "bulk_quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_quote_items" ADD CONSTRAINT "bulk_quote_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_quote_status_history" ADD CONSTRAINT "bulk_quote_status_history_bulk_quote_id_fkey" FOREIGN KEY ("bulk_quote_id") REFERENCES "bulk_quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_helpful_votes" ADD CONSTRAINT "review_helpful_votes_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "product_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_helpful_votes" ADD CONSTRAINT "review_helpful_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_threads" ADD CONSTRAINT "forum_threads_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_replies" ADD CONSTRAINT "forum_replies_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "forum_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_replies" ADD CONSTRAINT "forum_replies_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_adjusted_by_fkey" FOREIGN KEY ("adjusted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solar_planner_jobs" ADD CONSTRAINT "solar_planner_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solar_roi_results" ADD CONSTRAINT "solar_roi_results_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "solar_planner_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
