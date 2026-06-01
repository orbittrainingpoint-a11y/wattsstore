/** Admin PIM: category/product/variant/pricing/image CRUD with cache invalidation (PRD §8.11, §14.2-14.3). */
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { cacheDel, cacheDelPattern } from '../../config/redis';
import { inventoryService, SchemaField } from '../inventory.service';
import { buildObjectKey, presignedUpload, deleteObject } from '../../config/minio';
import { AppError } from '../../utils/AppError';
import { slugify } from '../../utils/slugify';

async function invalidateCatalogCache() {
  await cacheDel('catalog:category-tree');
  await cacheDelPattern('catalog:product:*');
  await cacheDelPattern('catalog:featured:*');
}

interface CategoryInput {
  name: string;
  slug?: string;
  parentId?: number | null;
  description?: string | null;
  variantSpecificationSchema?: Prisma.InputJsonValue;
  showInMenu?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  iconUrl?: string | null;
  imageUrl?: string | null;
  bannerImageUrl?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

function skuPrefixFromCategory(slug: string, name: string): string {
  const source = slug || name;
  const parts = source.split(/[^a-z0-9]+/i).filter(Boolean);
  const prefix = (parts.length > 1 ? parts.map((part) => part[0]).join('') : source.replace(/[^a-z0-9]/gi, '').slice(0, 4)).toUpperCase();
  return (prefix || 'WS').slice(0, 6);
}

async function validateCategoryParent(categoryId: number | null, parentId?: number | null) {
  if (!parentId) return;
  const visited = new Set<number>();
  let currentId: number | null = parentId;
  let depth = 1;
  while (currentId) {
    if (currentId === categoryId || visited.has(currentId)) {
      throw AppError.badRequest('INVALID_CATEGORY_PARENT', 'A category cannot be nested below itself.');
    }
    visited.add(currentId);
    const parent: { id: number; parentId: number | null } | null = await prisma.category.findUnique({
      where: { id: currentId },
      select: { id: true, parentId: true },
    });
    if (!parent) throw AppError.notFound('PARENT_CATEGORY_NOT_FOUND', 'Parent category not found.');
    currentId = parent.parentId;
    depth += 1;
  }
  if (depth > 4) {
    throw AppError.badRequest('CATEGORY_DEPTH_LIMIT', 'Categories can be nested to a maximum of 4 levels.');
  }
}

export const adminCatalogService = {
  // ── Categories ──
  async listCategories() {
    const rows = await prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const getDepth = (row: typeof rows[number]) => {
      let depth = 1;
      let parentId = row.parentId;
      const visited = new Set<number>([row.id]);
      while (parentId && byId.has(parentId) && !visited.has(parentId)) {
        visited.add(parentId);
        depth += 1;
        parentId = byId.get(parentId)!.parentId;
      }
      return depth;
    };
    return rows.map((row) => ({ ...row, depth: getDepth(row) }));
  },
  async createCategory(data: CategoryInput) {
    await validateCategoryParent(null, data.parentId);
    const created = await prisma.category.create({
      data: { ...data, slug: data.slug || slugify(data.name), parentId: data.parentId ?? null } as Prisma.CategoryUncheckedCreateInput,
    });
    await invalidateCatalogCache();
    return created;
  },
  async updateCategory(id: number, data: Partial<CategoryInput>) {
    if (data.parentId !== undefined) await validateCategoryParent(id, data.parentId);
    const updated = await prisma.category.update({ where: { id }, data: data as Prisma.CategoryUncheckedUpdateInput });
    await invalidateCatalogCache();
    return updated;
  },
  async deleteCategory(id: number) {
    const childCount = await prisma.category.count({ where: { parentId: id, isActive: true } });
    if (childCount > 0) {
      throw AppError.badRequest('CATEGORY_HAS_CHILDREN', 'Archive child categories before archiving their parent.');
    }
    await prisma.category.update({ where: { id }, data: { isActive: false } });
    await invalidateCatalogCache();
  },
  async restoreCategory(id: number) {
    const updated = await prisma.category.update({ where: { id }, data: { isActive: true } });
    await invalidateCatalogCache();
    return updated;
  },
  async archiveCategoryWithAction(id: number, action: 'archive_only' | 'archive_products' | 'move_products', targetCategoryId?: number) {
    if (action === 'move_products') {
      if (!targetCategoryId || targetCategoryId === id) {
        throw AppError.badRequest('INVALID_TARGET_CATEGORY', 'Choose another category to move products into.');
      }
      const target = await prisma.category.findUnique({ where: { id: targetCategoryId } });
      if (!target || !target.isActive) throw AppError.badRequest('INVALID_TARGET_CATEGORY', 'Target category must be active.');
      await prisma.product.updateMany({ where: { categoryId: id }, data: { categoryId: targetCategoryId } });
    }
    if (action === 'archive_products') {
      await prisma.product.updateMany({ where: { categoryId: id }, data: { isActive: false } });
    }
    await this.deleteCategory(id);
    return { archived: true, action };
  },
  listCountries() {
    return prisma.country.findMany({
      where: { isActive: true },
      orderBy: { countryName: 'asc' },
      select: { id: true, countryName: true, currencyCode: true, currencySymbol: true },
    });
  },

  // ── Products ──
  listProducts(filters: { categoryId?: number; brandId?: number; status?: string; search?: string }, skip: number, take: number) {
    const where: Prisma.ProductWhereInput = {};
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.brandId) where.brandId = filters.brandId;
    if (filters.status === 'active') where.isActive = true;
    if (filters.status === 'archived') where.isActive = false;
    if (filters.search) where.OR = [{ title: { contains: filters.search, mode: 'insensitive' } }, { skuBase: { contains: filters.search, mode: 'insensitive' } }];
    return Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { brand: { select: { name: true } }, category: { select: { name: true } }, _count: { select: { variants: true } } },
      }),
      prisma.product.count({ where }),
    ]);
  },
  async getProduct(id: number) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, variantSpecificationSchema: true } },
        images: { orderBy: { sortOrder: 'asc' } },
        documents: { orderBy: { sortOrder: 'asc' } },
        faqs: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
        variants: {
          orderBy: { createdAt: 'asc' },
          include: {
            pricing: {
              include: {
                country: { select: { id: true, countryName: true, currencyCode: true, currencySymbol: true } },
              },
            },
          },
        },
      },
    });
    if (!product) throw AppError.notFound('PRODUCT_NOT_FOUND', 'Product not found.');
    return product;
  },
  async createProduct(data: Prisma.ProductUncheckedCreateInput) {
    const created = await prisma.product.create({ data: { ...data, skuBase: data.skuBase || await this.generateSkuBase(Number(data.categoryId)), slug: data.slug ?? slugify(data.title) } });
    await invalidateCatalogCache();
    return created;
  },
  async updateProduct(id: number, data: Prisma.ProductUncheckedUpdateInput) {
    const updated = await prisma.product.update({ where: { id }, data });
    await invalidateCatalogCache();
    return updated;
  },
  async deleteProduct(id: number) {
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    await invalidateCatalogCache();
  },
  async restoreProduct(id: number) {
    const updated = await prisma.product.update({ where: { id }, data: { isActive: true } });
    await invalidateCatalogCache();
    return updated;
  },
  async generateSkuBase(categoryId: number) {
    const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { name: true, slug: true } });
    if (!category) throw AppError.notFound('CATEGORY_NOT_FOUND', 'Category not found.');
    const prefix = skuPrefixFromCategory(category.slug, category.name);
    const year = new Date().getFullYear().toString().slice(-2);
    const startsWith = `${prefix}-${year}-`;
    const last = await prisma.product.findFirst({
      where: { skuBase: { startsWith } },
      orderBy: { skuBase: 'desc' },
      select: { skuBase: true },
    });
    const seq = last ? Number(last.skuBase.slice(startsWith.length)) + 1 : 1;
    return `${startsWith}${String(seq).padStart(4, '0')}`;
  },
  async generateVariantSku(productId: number) {
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { skuBase: true } });
    if (!product) throw AppError.notFound('PRODUCT_NOT_FOUND', 'Product not found.');
    const last = await prisma.productVariant.findFirst({
      where: { variantSku: { startsWith: `${product.skuBase}-` } },
      orderBy: { variantSku: 'desc' },
      select: { variantSku: true },
    });
    const seq = last ? Number(last.variantSku.slice(product.skuBase.length + 1)) + 1 : 1;
    return `${product.skuBase}-${String(seq).padStart(3, '0')}`;
  },

  // ── Variants (validated against category schema) ──
  async addVariant(productId: number, input: { variantSku: string; attributes: Record<string, unknown>; weightKg?: number; dimensions?: object; barcode?: string }) {
    const product = await prisma.product.findUnique({ where: { id: productId }, include: { category: true } });
    if (!product) throw AppError.notFound('PRODUCT_NOT_FOUND', 'Product not found.');
    inventoryService.validateVariantAttributes(input.attributes, product.category.variantSpecificationSchema as SchemaField[] | null);
    const created = await prisma.productVariant.create({
      data: {
        productId,
        variantSku: input.variantSku,
        attributes: input.attributes as object,
        weightKg: input.weightKg ?? 0,
        dimensions: input.dimensions,
        barcode: input.barcode,
      },
    });
    // Auto-create a zero-stock pricing record for every active country so the new variant
    // appears in the inventory matrix immediately — admins can then edit price/stock there.
    // isAvailable: true so it shows up as "Out of stock" until the admin enters real stock,
    // which is more discoverable than a silently-hidden variant.
    const countries = await prisma.country.findMany({ where: { isActive: true }, select: { id: true } });
    if (countries.length) {
      await prisma.regionalInventoryPricing.createMany({
        data: countries.map((country) => ({
          productVariantId: created.id,
          countryId: country.id,
          costPrice: 0,
          stockOnHand: 0,
          isAvailable: true,
        })),
        skipDuplicates: true,
      });
    }
    await invalidateCatalogCache();
    return created;
  },
  async deleteVariant(variantId: number) {
    await prisma.productVariant.delete({ where: { id: variantId } });
    await invalidateCatalogCache();
  },
  async updateVariant(variantId: number, input: { attributes?: Record<string, unknown>; weightKg?: number; barcode?: string; isActive?: boolean }) {
    if (input.attributes) {
      const variant = await prisma.productVariant.findUnique({ where: { id: variantId }, include: { product: { include: { category: true } } } });
      if (!variant) throw AppError.notFound('VARIANT_NOT_FOUND', 'Variant not found.');
      inventoryService.validateVariantAttributes(input.attributes, variant.product.category.variantSpecificationSchema as SchemaField[] | null);
    }
    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: { attributes: input.attributes as object | undefined, weightKg: input.weightKg, barcode: input.barcode, isActive: input.isActive },
    });
    await invalidateCatalogCache();
    return updated;
  },

  // ── Regional pricing ──
  async setPricing(variantId: number, countryId: number, data: Partial<Prisma.RegionalInventoryPricingUncheckedCreateInput>) {
    const applyToAllCountries = Boolean((data as { applyToAllCountries?: boolean }).applyToAllCountries);
    delete (data as { applyToAllCountries?: boolean }).applyToAllCountries;
    if (applyToAllCountries) {
      const countries = await prisma.country.findMany({ where: { isActive: true }, select: { id: true } });
      const rows = await Promise.all(countries.map((country) => prisma.regionalInventoryPricing.upsert({
        where: { productVariantId_countryId: { productVariantId: variantId, countryId: country.id } },
        create: { productVariantId: variantId, countryId: country.id, costPrice: data.costPrice ?? 0, ...data },
        update: data,
      })));
      await invalidateCatalogCache();
      return rows.find((row) => row.countryId === countryId) ?? rows[0];
    }
    const result = await prisma.regionalInventoryPricing.upsert({
      where: { productVariantId_countryId: { productVariantId: variantId, countryId } },
      create: { productVariantId: variantId, countryId, costPrice: data.costPrice ?? 0, ...data },
      update: data,
    });
    await invalidateCatalogCache();
    return result;
  },

  async addDocument(productId: number, data: { title: string; fileUrl: string; fileType: string; sortOrder?: number }) {
    const created = await prisma.productDocument.create({ data: { productId, ...data } });
    await invalidateCatalogCache();
    return created;
  },
  async updateDocument(id: number, data: { title?: string; fileUrl?: string; fileType?: string; sortOrder?: number }) {
    const updated = await prisma.productDocument.update({ where: { id }, data });
    await invalidateCatalogCache();
    return updated;
  },
  async deleteDocument(id: number) {
    const deleted = await prisma.productDocument.delete({ where: { id } });
    await invalidateCatalogCache();
    return deleted;
  },
  async addFaq(productId: number, data: { question: string; answer: string; sortOrder?: number; isActive?: boolean }) {
    const created = await prisma.productFaq.create({ data: { productId, ...data } });
    await invalidateCatalogCache();
    return created;
  },
  async updateFaq(id: number, data: { question?: string; answer?: string; sortOrder?: number; isActive?: boolean }) {
    const updated = await prisma.productFaq.update({ where: { id }, data });
    await invalidateCatalogCache();
    return updated;
  },
  async deleteFaq(id: number) {
    const deleted = await prisma.productFaq.delete({ where: { id } });
    await invalidateCatalogCache();
    return deleted;
  },

  // ── Images (presigned MinIO direct upload) ──
  async presignImage(productId: number, mime: string) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
      throw AppError.badRequest('INVALID_MIME', 'Only JPEG, PNG and WebP images are allowed.');
    }
    const imagePath = buildObjectKey(`products/${productId}`, mime);
    const uploadUrl = await presignedUpload(imagePath);
    return { uploadUrl, imagePath };
  },
  async registerImage(productId: number, imagePath: string, altText?: string, isPrimary = false) {
    if (isPrimary) await prisma.productImage.updateMany({ where: { productId }, data: { isPrimary: false } });
    const count = await prisma.productImage.count({ where: { productId } });
    const created = await prisma.productImage.create({
      data: { productId, imageUrl: imagePath, altText, isPrimary: isPrimary || count === 0, sortOrder: count },
    });
    await invalidateCatalogCache();
    return created;
  },
  async deleteImage(productId: number, imageId: number) {
    const img = await prisma.productImage.findUnique({ where: { id: imageId } });
    if (!img || img.productId !== productId) throw AppError.notFound('IMAGE_NOT_FOUND', 'Image not found.');
    await prisma.productImage.delete({ where: { id: imageId } });
    await deleteObject(img.imageUrl).catch(() => undefined);
    await invalidateCatalogCache();
  },
};
