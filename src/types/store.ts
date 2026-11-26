/**
 * Types definition for Tolipe Natural Care (توليب للعناية الطبيعية)
 */

export type OfferType = 'percentage' | 'fixed' | 'bundle' | 'buy_get';

export interface StoreOffer {
  id: string;
  title: string;
  description: string;
  image: string;
  type: OfferType;
  productIds: string[];
  value: number;
  bundlePrice?: number | null;
  buyQuantity?: number;
  getQuantity?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  name: string; // e.g., "حجم كبير", "حجم وسط", "حجم صغير", "النوع الأول"
  price: number | null; // null if owner hasn't set price yet -> shows "تواصل لمعرفة السعر"
  originalPrice?: number | null; // For discounts
  stock: number;
  sku?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName?: string;
  description: string;
  features: string[]; // e.g. ["طبيعي 100%", "خالٍ من المواد الكيميائية الضارة", "مناسب لجميع أنواع البشرة"]
  usageInstructions?: string; // طريقة الاستخدام
  images: string[];
  variants: ProductVariant[];
  isFeatured: boolean;
  isBestSeller: boolean;
  isActive: boolean;
  inStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
  createdAt: string;
}

export interface OrderDraftItem {
  id: string; // unique item key: `${productId}_${variantId}`
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  price: number | null;
  quantity: number;
  image: string;
  categoryName?: string;
}

export interface CustomerDetails {
  fullName: string;
  phone: string;
  city: string;
  area?: string;
  detailedAddress: string;
  nearestLandmark?: string;
  notes?: string;
  preferredContactTime?: string;
  googleMapsUrl?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  quantity: number;
  unitPrice: number | null; // price at time of order creation
  totalPrice: number | null;
  image?: string;
}

export type OrderStatus =
  | 'new'
  | 'awaiting_whatsapp_confirmation'
  | 'confirmed'
  | 'processing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  orderNumber: string; // e.g. "TLP-2026-1042"
  customerDetails: CustomerDetails;
  items: OrderItem[];
  itemsTotal: number | null;
  deliveryFee: number | null;
  deliveryFeeNote?: string;
  finalTotal: number | null;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  whatsappMessage: string;
}

export interface CityDeliveryOption {
  city: string;
  fee: number | null; // null means "تحدد عبر واتساب"
  estimatedDays: string;
}

export interface StoreSettings {
  storeName: string;
  storeTagline: string;
  storeDescription: string;
  logoUrl: string;
  whatsappPhone: string;
  whatsappOfficialLink: string;
  facebookUrl: string;
  instagramUrl: string;
  heroHeadline: string;
  heroSubtext: string;
  heroImage: string;
  deliveryFeeGeneralNote: string;
  cities: CityDeliveryOption[];
  deliveryPolicy: string;
  returnPolicy: string;
  privacyPolicy: string;
  aboutUsText: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin';
  createdAt: string;
}

export interface AdminStats {
  totalProducts: number;
  totalCategories: number;
  totalOrders: number;
  newOrders: number;
  outOfStockProducts: number;
  confirmedRevenue: number;
  bestSellingProducts: {
    id: string;
    name: string;
    salesCount: number;
    image: string;
  }[];
  recentOrders: Order[];
}
