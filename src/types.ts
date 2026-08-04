export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
export type PaymentStatus = 'Paid' | 'Pending' | 'Refunded' | 'Failed';
export type ProductStatus = 'Active' | 'Draft' | 'Archived' | 'Out of Stock';

export interface ProductVariant {
  id: string;
  sku: string;
  size?: string;
  color?: string;
  material?: string;
  price: number;
  stock: number;
}

export interface SEOData {
  title: string;
  description: string;
  slug: string;
  keywords: string[];
}

export interface ProductSpecifications {
  material?: string;
  dimensions?: string;
  printTime?: string;
  infill?: string;
  layerHeight?: string;
  supportRequired?: boolean;
  productionTime?: string;
  durabilityRating?: string;
  madeToOrder?: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  tags: string[];
  price: number;
  compareAtPrice?: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  status: ProductStatus;
  images: string[];
  videoUrl?: string;
  description: string;
  variants: ProductVariant[];
  seo: SEOData;
  specifications?: ProductSpecifications;
  createdAt: string;
  updatedAt: string;
  sku: string;
  salesCount: number;
  rating: number;
  reviewCount: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  description?: string;
  image?: string;
  productCount: number;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface OrderItem {
  productId: string;
  variantId?: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  items: { productId: string; name: string; qty: number; reason: string }[];
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Refunded';
  refundAmount: number;
  createdAt: string;
  notes?: string;
}

export interface OrderNote {
  id: string;
  author: string;
  content: string;
  isCustomerVisible: boolean;
  createdAt: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  billingAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shippingFee: number;
  discount: number;
  total: number;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  trackingNumber?: string;
  carrier?: string;
  notes: OrderNote[];
  returnRequest?: ReturnRequest;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerReview {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  customerAvatar?: string;
  rating: number;
  comment: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  reply?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  location: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  wishlistCount: number;
  segment: 'VIP' | 'Repeat Buyer' | 'New Signup' | 'Inactive';
  status: 'Active' | 'Blocked';
  joinedDate: string;
  lastOrderDate?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  code: string;
  isPrimary: boolean;
  totalItems: number;
}

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  reorderPoint: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  lastUpdated: string;
}

export interface StockAdjustmentLog {
  id: string;
  productId: string;
  productName: string;
  warehouseName: string;
  changeAmount: number;
  reason: 'Restock' | 'Damaged' | 'Physical Audit' | 'Return' | 'Correction';
  adjustedBy: string;
  timestamp: string;
}

export interface PaymentGateway {
  id: string;
  name: string;
  provider: 'stripe' | 'paypal' | 'razorpay' | 'cod' | 'applepay';
  enabled: boolean;
  testMode: boolean;
  apiKey?: string;
  secretKey?: string;
  feePercentage: number;
}

export type IntegrationStatus = 'connected' | 'disconnected';

export interface Integration {
  id: string;
  type: string;
  name: string;
  description: string;
  developerNote: string;
  enabled: boolean;
  status: IntegrationStatus;
  updatedAt: string | null;
}

export interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  methods: {
    id: string;
    name: string;
    type: 'Flat Rate' | 'Weight Based' | 'Free Shipping';
    rate: number;
    minOrderValue?: number;
  }[];
}

export interface CMSPage {
  id: string;
  title: string;
  slug: string;
  status: 'Published' | 'Draft';
  sections: {
    id: string;
    type: 'hero' | 'features' | 'testimonials' | 'faq' | 'text';
    content: Record<string, any>;
  }[];
  updatedAt: string;
}

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  ctaText: string;
  ctaLink: string;
  position: 'Homepage Hero' | 'Top Announcement Bar' | 'Promo Popup';
  active: boolean;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  coverImage: string;
  excerpt: string;
  content: string;
  author: string;
  status: 'Published' | 'Draft';
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  label?: string;
  type: 'Percentage' | 'Fixed Amount';
  value: number;
  minOrderValue: number;
  maxDiscount?: number;
  usageLimit: number;
  timesUsed: number;
  expiryDate: string;
  status: 'Active' | 'Inactive';
}

export interface BundleRule {
  id: string;
  name: string;
  buyQuantity: number;
  getQuantity: number;
  discountPercentage: number;
  status: 'Active' | 'Inactive';
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  targetSegment: string;
  sentCount: number;
  openRate: number;
  clickRate: number;
  status: 'Sent' | 'Scheduled' | 'Draft';
  sentAt?: string;
}

export interface AbandonedCart {
  id: string;
  customerName: string;
  customerEmail: string;
  cartValue: number;
  itemsCount: number;
  lastActiveTime: string;
  recovered: boolean;
}

export interface StaffRole {
  id: string;
  name: string;
  description: string;
  permissions: {
    manageProducts: boolean;
    manageOrders: boolean;
    manageCustomers: boolean;
    manageInventory: boolean;
    manageMarketing: boolean;
    manageSettings: boolean;
    viewAnalytics: boolean;
  };
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  avatar?: string;
  status: 'Active' | 'Inactive';
  lastLogin: string;
}

export interface ActivityLog {
  id: string;
  user: string;
  userEmail: string;
  action: string;
  module: string;
  ipAddress: string;
  timestamp: string;
}

export interface StoreSettings {
  storeName: string;
  logoUrl: string;
  contactEmail: string;
  supportPhone: string;
  address: string;
  currency: string;
  currencySymbol: string;
  dateFormat: string;
  timeZone: string;
  taxRate: number;
  taxIncluded: boolean;
  require2FA: boolean;
  enableSSL: boolean;
  autoBackup: boolean;
  notifications?: Record<string, boolean>;
  apiKeys: { id: string; name: string; key: string; created: string }[];
}
