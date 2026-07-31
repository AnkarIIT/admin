import type { ActivityLog, Coupon, Order, Product, StaffUser, StoreSettings } from './types';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
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

  totpStatus: (email?: string) => request<{ enabled: boolean }>(`/auth/totp-status${email ? `?email=${encodeURIComponent(email)}` : ''}`),
  totpSetup: (email?: string) => request<{ secret: string; uri: string; qr: string }>('/auth/totp-setup', { method: 'POST', body: JSON.stringify({ email }) }),
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
    const res = await fetch('/api/auth/me', { headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

export function mapDbProduct(p: Record<string, any>): Product {
  const price = Number(p.base_price) || 0;
  const compare = p.discounted_price != null ? Number(p.discounted_price) : undefined;
  return {
    id: p.id,
    name: p.name,
    category: p.category || 'Uncategorized',
    tags: [],
    price,
    compareAtPrice: compare,
    costPrice: price,
    stock: 0,
    lowStockThreshold: 10,
    status: 'Active',
    images: [],
    description: p.description || '',
    variants: [],
    seo: {
      title: p.name,
      description: p.description || '',
      slug: p.slug,
      keywords: [],
    },
    createdAt: p.createdAt ? p.createdAt.substring(0, 10) : '',
    updatedAt: p.updatedAt ? p.updatedAt.substring(0, 10) : '',
    sku: p.slug || p.id,
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
      zip: a.pincode || a.pincode || '',
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
      segment: 'Repeat Buyer',
      status: 'Active',
      joinedDate: o.createdAt,
      lastOrderDate: o.createdAt,
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
