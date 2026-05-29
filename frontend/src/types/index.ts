/** Shared frontend types mirroring API payloads. */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { page: number; limit: number; totalCount: number; totalPages: number };
  error?: { code: string; message: string; field?: string };
}

export interface ProductCard {
  id: number;
  title: string;
  slug: string;
  skuBase: string;
  brand: { id: number; name: string; slug: string; logoUrl?: string | null } | null;
  brandOrigin: string | null;
  image: string | null;
  averageRating: number | null;
  reviewCount: number;
  isPriceVisible: boolean;
  price: number | null;
  compareAtPrice: number | null;
  inStock: boolean;
  variantCount: number;
}

export interface VariantDetail {
  id: number;
  variantSku: string;
  attributes: Record<string, string>;
  weightKg: number | null;
  price: number | null;
  compareAtPrice: number | null;
  stockAvailable: number;
  stockLowThreshold: number;
  isAvailable: boolean;
}

export interface ProductDetail {
  id: number;
  title: string;
  slug: string;
  skuBase: string;
  shortDescription: string | null;
  fullDescription: string | null;
  keyFeatures: string[];
  brandOrigin: string | null;
  isPriceVisible: boolean;
  datasheetUrl: string | null;
  iesFileUrl: string | null;
  documents?: { id: number; title: string; fileUrl: string; fileType: string }[];
  faqs?: { id: number; question: string; answer: string }[];
  metaTitle: string | null;
  metaDescription: string | null;
  averageRating: number | null;
  reviewCount: number;
  brand: { id: number; name: string; slug: string } | null;
  category: { id: number; name: string; slug: string };
  variantSchema: { field: string; label: string; options?: string[] }[] | null;
  images: { url: string; alt: string | null; isPrimary: boolean }[];
  variants: VariantDetail[];
  crossSells: ProductCard[];
}

export interface CartView {
  cartId: number;
  currencyCode: string;
  currencySymbol: string;
  couponCode: string | null;
  items: CartItem[];
  totals: { subtotal: number; discountAmount: number; shippingAmount: number; taxAmount: number; totalAmount: number };
}

export interface CartItem {
  variantId: number;
  productId: number;
  title: string;
  slug: string;
  variantSku: string;
  attributes: Record<string, string>;
  unitPrice: number;
  currentPrice: number;
  priceChanged: boolean;
  quantity: number;
  lineSubtotal: number;
  stockAvailable: number;
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'sales_agent' | 'admin' | 'super_admin';
  isEmailVerified: boolean;
}
