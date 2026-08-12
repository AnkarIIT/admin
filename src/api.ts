import type { ActivityLog, Coupon, Integration, Order, Product, ProductSpecifications, StaffUser, StoreSettings } from './types';

export const DEFAULT_SPECS: ProductSpecifications = {
  material: 'PLA',
  dimensions: 'Varies by design',
  printTime: 'Varies by size',
  infill: '20%',
  layerHeight: '0.2mm',
  supportRequired: true,
  productionTime: 'Ships within 3-5 days',
  durabilityRating: 'moderate-use',
  madeToOrder: true,
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  const csrfCookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrf_token='));
  if (csrfCookie) {
    const value = csrfCookie.split('=')[1];
    if (value) {
      headers['X-CSRF-Token'] = decodeURIComponent(value);
    }
  }

  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...headers,
      ...(options?.headers as Record<string, string> || {}),
    },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const text = await res.text();
      if (text) {
        const parsed = JSON.parse(text);
        if (typeof parsed === 'string') message = parsed;
        else if (parsed && typeof parsed.error === 'string') message = parsed.error;
        else message = text;
      }
    } catch {
      /* keep generic message */
    }
    throw new Error(message);
  }
  return res.json();
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  totpEnabled: boolean;
}

export interface LoginResponse {
  authenticated?: boolean;
  user?: AuthUser;
  recoveryCodes?: string[];
}

export const api = {
  getProducts: () => request<Record<string, any>[]>('/products'),
  createProduct: (data: Record<string, any>) =>
    request<Record<string, any>>('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: Record<string, any>) =>
    request<Record<string, any>>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteProduct: (id: string) => request<{ success: boolean }>(`/products/${id}`, { method: 'DELETE' }),

  getOrders: () => request<Record<string, any>[]>('/orders'),
  updateOrder: (id: string, data: Record<string, any>) =>
    request<Record<string, any>>(`/orders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  getStaff: () => request<StaffUser[]>('/staff'),
  createStaff: (data: { name: string; email: string; role: string; password?: string }) =>
    request<{ user: StaffUser; credentials: { email: string; password: string } }>('/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateStaff: (id: string, data: Record<string, any>) =>
    request<StaffUser>(`/staff/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteStaff: (id: string) => request<{ success: boolean }>(`/staff/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getActivityLogs: () => request<ActivityLog[]>('/activity-logs'),
  logActivity: (data: { action: string; module: string }) =>
    request<{ success: boolean }>('/activity-logs', { method: 'POST', body: JSON.stringify(data) }),
  getSettings: () => request<Partial<StoreSettings>>('/settings'),
  updateSettings: (data: Partial<StoreSettings>) =>
    request<Partial<StoreSettings>>('/settings', { method: 'PATCH', body: JSON.stringify(data) }),

  getCoupons: () => request<Coupon[]>('/coupons'),
  createCoupon: (data: Record<string, any>) =>
    request<Coupon>('/coupons', { method: 'POST', body: JSON.stringify(data) }),
  updateCoupon: (code: string, data: Record<string, any>) =>
    request<Coupon>(`/coupons/${encodeURIComponent(code)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCoupon: (code: string) =>
    request<{ success: boolean }>(`/coupons/${encodeURIComponent(code)}`, { method: 'DELETE' }),

  getIntegrations: () => request<Integration[]>('/integrations'),
  updateIntegration: (id: string, enabled: boolean) =>
    request<Integration>(`/integrations/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ enabled }) }),

  totpStatus: (email?: string) => request<{ enabled: boolean }>(`/auth/totp-status${email ? `?email=${encodeURIComponent(email)}` : ''}`),
  totpSetup: (email?: string, force?: boolean) =>
    request<{ secret: string; uri: string; qr: string }>('/auth/totp-setup', { method: 'POST', body: JSON.stringify({ email, force }) }),
  totpConfirm: (code: string, email?: string) =>
    request<{ success: boolean; user: AuthUser; recoveryCodes: string[] }>('/auth/totp-confirm', {
      method: 'POST',
      body: JSON.stringify({ code, email }),
    }),
  totpLogin: (code: string, email?: string) =>
    request<LoginResponse>('/auth/totp-login', { method: 'POST', body: JSON.stringify({ code, email }) }),
  passwordLogin: (email: string, password: string) =>
    request<LoginResponse>('/auth/password-login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
};

export async function checkAuth(): Promise<AuthUser | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const csrfCookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrf_token='));
    if (csrfCookie) {
      const value = csrfCookie.split('=')[1];
      if (value) {
        headers['X-CSRF-Token'] = decodeURIComponent(value);
      }
    }
    const res = await fetch('/api/auth/me', {
      credentials: 'include',
      headers,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

export function mapDbProduct(p: Record<string, any>): Product {
  const price = Number(p.base_price) || 0;
  const seoRaw = p.seo && typeof p.seo === 'object' ? p.seo : {};
  const specsRaw = p.specifications && typeof p.specifications === 'object' ? p.specifications : {};
  const specifications: ProductSpecifications = {
    ...DEFAULT_SPECS,
    ...specsRaw,
  };
  return {
    id: p.id,
    name: p.name,
    category: p.category || 'Uncategorized',
    subcategory: p.subcategory || '',
    tags: Array.isArray(p.tags) ? p.tags : [],
    price,
    compareAtPrice: p.discounted_price != null ? Number(p.discounted_price) : undefined,
    costPrice: p.cost_price != null ? Number(p.cost_price) : price,
    stock: typeof p.stock === 'number' ? p.stock : 0,
    lowStockThreshold: typeof p.low_stock_threshold === 'number' ? p.low_stock_threshold : 0,
    status: p.status || 'Active',
    images: Array.isArray(p.images) ? p.images : [],
    videoUrl: p.video_url || '',
    description: p.description || '',
    variants: Array.isArray(p.variants) ? p.variants : [],
    seo: {
      title: seoRaw.title || p.name,
      description: seoRaw.description || p.description || '',
      slug: seoRaw.slug || p.slug,
      keywords: Array.isArray(seoRaw.keywords) ? seoRaw.keywords : [],
    },
    specifications,
    createdAt: p.createdAt ? p.createdAt.substring(0, 10) : '',
    updatedAt: p.updatedAt ? p.updatedAt.substring(0, 10) : '',
    sku: p.sku || p.slug || p.id,
    salesCount: 0,
    rating: 5,
    reviewCount: 0,
  };
}

const DB_ORDER_STATUS: Record<string, Order['orderStatus']> = {
  pending: 'Pending',
  pending_payment: 'Processing',
  paid: 'Processing',
  confirmed: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const DB_PAYMENT_STATUS: Record<string, Order['paymentStatus']> = {
  paid: 'Paid',
  success: 'Paid',
  confirmed: 'Paid',
  shipped: 'Paid',
  delivered: 'Paid',
  pending: 'Pending',
  pending_payment: 'Pending',
  refunded: 'Refunded',
  failed: 'Failed',
};

function parseShipping(addr: string | null | undefined, customerName: string, customerPhone: string) {
  try {
    const a = addr ? JSON.parse(addr) : {};
    return {
      street: a.street || a.fullName || '',
      city: a.city || '',
      state: a.state || '',
      zip: a.zip || a.pincode || '',
      country: a.country || '',
    };
  } catch {
    return { street: addr || '', city: '', state: '', zip: '', country: '' };
  }
}

export function mapDbOrder(o: Record<string, any>): Order {
  const itemsRaw = typeof o.items === 'string' ? JSON.parse(o.items || '[]') : o.items || [];
  const items = itemsRaw.map((i: any, idx: number) => ({
    productId: String(i.id ?? i.productId ?? idx),
    name: i.name || 'Item',
    sku: i.slug || '',
    price: Number(i.price) || 0,
    quantity: Number(i.quantity) || 1,
    image: i.image,
  }));

  const status = DB_ORDER_STATUS[o.status] || 'Pending';
  const paymentStatus = DB_PAYMENT_STATUS[o.status] || DB_PAYMENT_STATUS[o.paymentStatus] || 'Pending';
  const addr = parseShipping(o.shippingAddress, o.customerName, o.customerPhone);

  return {
    id: o.orderId || o.id,
    customerName: o.customerName || 'Unknown',
    customerEmail: o.customerEmail || '',
    customerPhone: o.customerPhone || '',
    shippingAddress: addr,
    billingAddress: addr,
    items,
    subtotal: Number(o.subtotal) || 0,
    tax: Number(o.tax) || 0,
    shippingFee: Number(o.shipping) || 0,
    discount: Number(o.discount) || 0,
    total: Number(o.total) || 0,
    orderStatus: status,
    paymentStatus,
    paymentMethod: o.paymentMethod || '',
    trackingNumber: o.trackingNumber,
    carrier: o.carrier,
    notes: [],
    createdAt: o.createdAt ? o.createdAt.substring(0, 10) : '',
    updatedAt: o.updatedAt ? o.updatedAt.substring(0, 10) : '',
  };
}

export function deriveCustomers(orders: Order[]) {
  const map = new Map<string, any>();
  for (const o of orders) {
    if (!o.customerEmail) continue;
    const existing = map.get(o.customerEmail);
    const spent = existing ? existing.totalSpent + o.total : o.total;
    const count = existing ? existing.totalOrders + 1 : 1;
    const joined = existing && existing.joinedDate < o.createdAt ? existing.joinedDate : o.createdAt;
    const last = existing && existing.lastOrderDate > o.createdAt ? existing.lastOrderDate : o.createdAt;
    map.set(o.customerEmail, {
      id: o.customerEmail,
      name: o.customerName,
      email: o.customerEmail,
      phone: o.customerPhone,
      location: o.shippingAddress ? `${o.shippingAddress.city}, ${o.shippingAddress.country}` : '',
      totalOrders: count,
      totalSpent: spent,
      averageOrderValue: spent / count,
      wishlistCount: 0,
      segment: count > 5 ? 'VIP' : count > 1 ? 'Repeat Buyer' : 'New Signup',
      status: 'Active',
      joinedDate: joined,
      lastOrderDate: last,
    });
  }
  return Array.from(map.values());
}

export function deriveCategories(products: Product[]) {
  const map = new Map<string, any>();
  for (const p of products) {
    const cat = p.category;
    if (!cat) continue;
    map.set(cat, {
      id: cat.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: cat,
      slug: cat.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      productCount: (map.get(cat)?.productCount || 0) + 1,
    });
  }
  return Array.from(map.values());
}
