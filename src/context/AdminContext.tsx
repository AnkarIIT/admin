import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Product,
  Category,
  Tag,
  Order,
  OrderStatus,
  Customer,
  Warehouse,
  InventoryItem,
  PaymentGateway,
  ShippingZone,
  CMSPage,
  Banner,
  BlogPost,
  Coupon,
  BundleRule,
  EmailCampaign,
  StaffRole,
  StaffUser,
  ActivityLog,
  StoreSettings,
  CustomerReview,
  StockAdjustmentLog,
  AbandonedCart,
  Integration,
} from '../types';
import {
  api,
  mapDbProduct,
  mapDbOrder,
  deriveCustomers,
  deriveCategories,
  checkAuth,
} from '../api';
import type { AuthUser } from '../api';

export type TabType =
  | 'dashboard'
  | 'products'
  | 'orders'
  | 'customers'
  | 'inventory'
  | 'payment-shipping'
  | 'cms'
  | 'marketing'
  | 'staff'
  | 'users-roles'
  | 'settings'
  | 'integrations';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: '3d by SD',
  logoUrl: '',
  contactEmail: '',
  supportPhone: '',
  address: '',
  currency: 'INR',
  currencySymbol: '₹',
  dateFormat: 'DD/MM/YYYY',
  timeZone: 'Asia/Kolkata',
  taxRate: 0,
  taxIncluded: false,
  require2FA: false,
  enableSSL: true,
  autoBackup: false,
  apiKeys: [],
};

const DEFAULT_REVIEWS: CustomerReview[] = [
  {
    id: 'rev-1',
    productId: 'p-1',
    productName: 'PLA Pro Filament',
    customerName: 'Aarav Mehta',
    rating: 5,
    comment: 'Amazing layer adhesion and no stringing at all! Extremely satisfied.',
    status: 'Approved',
    createdAt: '2025-05-14',
  },
  {
    id: 'rev-2',
    productId: 'p-2',
    productName: 'ABS Ultra Tough Filament',
    customerName: 'Priya Sharma',
    rating: 4,
    comment: 'Great strength, requires heated enclosure for best warping prevention.',
    status: 'Approved',
    createdAt: '2025-05-13',
  }
];

const DEFAULT_WAREHOUSES: Warehouse[] = [
  {
    id: 'wh-1',
    name: 'Mumbai Central Hub',
    location: 'Mumbai, MH',
    code: 'BOM-01',
    isPrimary: true,
    totalItems: 450,
  },
  {
    id: 'wh-2',
    name: 'Delhi NCR Facility',
    location: 'Gurugram, HR',
    code: 'DEL-02',
    isPrimary: false,
    totalItems: 180,
  }
];

const DEFAULT_INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: 'inv-1',
    productId: 'p-1',
    productName: 'PLA Pro Filament',
    sku: 'PLA-PRO-001',
    warehouseId: 'wh-1',
    warehouseName: 'Mumbai Central Hub',
    quantity: 120,
    reorderPoint: 30,
    status: 'In Stock',
    lastUpdated: '2025-05-10',
  },
  {
    id: 'inv-2',
    productId: 'p-2',
    productName: 'ABS Ultra Tough Filament',
    sku: 'ABS-TOUGH-002',
    warehouseId: 'wh-1',
    warehouseName: 'Mumbai Central Hub',
    quantity: 15,
    reorderPoint: 20,
    status: 'Low Stock',
    lastUpdated: '2025-05-11',
  }
];

const DEFAULT_STOCK_LOGS: StockAdjustmentLog[] = [
  {
    id: 'log-1',
    productId: 'p-1',
    productName: 'PLA Pro Filament',
    warehouseName: 'Mumbai Central Hub',
    changeAmount: 50,
    reason: 'Restock',
    adjustedBy: 'Store Manager',
    timestamp: '2025-05-10 14:30',
  }
];

const DEFAULT_PAYMENT_GATEWAYS: PaymentGateway[] = [
  {
    id: 'gw-1',
    name: 'Razorpay',
    provider: 'razorpay',
    enabled: true,
    testMode: true,
    feePercentage: 2.0,
  },
  {
    id: 'gw-2',
    name: 'Stripe India',
    provider: 'stripe',
    enabled: false,
    testMode: true,
    feePercentage: 3.0,
  },
  {
    id: 'gw-3',
    name: 'Cash on Delivery',
    provider: 'cod',
    enabled: true,
    testMode: false,
    feePercentage: 0.0,
  }
];

const DEFAULT_SHIPPING_ZONES: ShippingZone[] = [
  {
    id: 'sz-1',
    name: 'Domestic Shipping',
    countries: ['India'],
    methods: [
      { id: 'sm-1', name: 'Standard Delivery', type: 'Flat Rate', rate: 50 },
      { id: 'sm-2', name: 'Express BlueDart', type: 'Weight Based', rate: 150 }
    ],
  }
];

const DEFAULT_CMS_PAGES: CMSPage[] = [
  {
    id: 'page-about',
    title: 'About Our 3D Lab',
    slug: 'about-us',
    status: 'Published',
    sections: [
      { id: 'sec-1', type: 'text', content: { title: 'Our Story', body: 'Bringing your imagination to physical reality.' } }
    ],
    updatedAt: '2025-05-12',
  }
];

const DEFAULT_BANNERS: Banner[] = [
  {
    id: 'ban-1',
    title: 'Unleash Your Creativity: 3D Printing Sale',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&auto=format&fit=crop&q=80',
    ctaText: 'Shop Filament',
    ctaLink: '/products',
    position: 'Homepage Hero',
    active: true,
  }
];

const DEFAULT_BLOG_POSTS: BlogPost[] = [
  {
    id: 'blog-1',
    title: 'The Ultimate Guide to 3D Printer Calibration',
    slug: 'ultimate-3d-printer-calibration-guide',
    category: 'Guides',
    coverImage: 'https://images.unsplash.com/photo-1615840287214-7fe58a8b668f?w=600',
    excerpt: 'Learn the core calibration processes to get crisp 3D prints every single time.',
    content: 'Calibration is the key to perfect prints...',
    author: 'Lead Print Engineer',
    status: 'Published',
    createdAt: '2025-05-15',
  }
];

const DEFAULT_BUNDLE_RULES: BundleRule[] = [
  {
    id: 'bun-1',
    name: 'Buy 3 Get 1 Free PLA',
    buyQuantity: 3,
    getQuantity: 1,
    discountPercentage: 100,
    status: 'Active',
  }
];

const DEFAULT_EMAIL_CAMPAIGNS: EmailCampaign[] = [
  {
    id: 'camp-1',
    name: 'Summer Filament Fest',
    subject: 'Unbeatable deals on premium PLAs and PETGs!',
    targetSegment: 'All',
    sentCount: 1500,
    openRate: 24.5,
    clickRate: 8.2,
    status: 'Sent',
    sentAt: '2025-05-10',
  }
];

const DEFAULT_ABANDONED_CARTS: AbandonedCart[] = [
  {
    id: 'cart-1',
    customerName: 'Kabir Dev',
    customerEmail: 'kabir@example.com',
    cartValue: 2400,
    itemsCount: 2,
    lastActiveTime: '2 hours ago',
    recovered: false,
  }
];

const DEFAULT_STAFF_ROLES: StaffRole[] = [
  {
    id: 'role-super',
    name: 'Super Admin',
    description: 'Full system access',
    permissions: {
      manageProducts: true,
      manageOrders: true,
      manageCustomers: true,
      manageInventory: true,
      manageMarketing: true,
      manageSettings: true,
      viewAnalytics: true,
    },
  },
  {
    id: 'role-support',
    name: 'Customer Support',
    description: 'Manage orders and reviews',
    permissions: {
      manageProducts: false,
      manageOrders: true,
      manageCustomers: true,
      manageInventory: false,
      manageMarketing: false,
      manageSettings: false,
      viewAnalytics: false,
    },
  }
];

function getSavedState<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

interface AdminContextType {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  toggleDarkMode: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  loading: boolean;
  reloadData: () => Promise<void>;

  // Auth
  user: AuthUser | null;
  authChecked: boolean;
  updateAuthUser: (user: AuthUser) => void;
  loginWithTotp: (code: string, email?: string) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  completeSetup: (code: string, email?: string) => Promise<{ user: AuthUser; recoveryCodes: string[] }>;
  enterAdmin: (user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;

  // Print Invoice Modal State
  printingOrder: Order | null;
  setPrintingOrder: (order: Order | null) => void;

  // Data
  products: Product[];
  categories: Category[];
  tags: Tag[];
  orders: Order[];
  customers: Customer[];
  reviews: CustomerReview[];
  warehouses: Warehouse[];
  inventoryItems: InventoryItem[];
  stockLogs: StockAdjustmentLog[];
  paymentGateways: PaymentGateway[];
  shippingZones: ShippingZone[];
  cmsPages: CMSPage[];
  banners: Banner[];
  blogPosts: BlogPost[];
  coupons: Coupon[];
  bundleRules: BundleRule[];
  emailCampaigns: EmailCampaign[];
  staffRoles: StaffRole[];
  staffUsers: StaffUser[];
  activityLogs: ActivityLog[];
  settings: StoreSettings;

  // Actions
  // Product actions
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'salesCount' | 'rating' | 'reviewCount'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  duplicateProduct: (id: string) => Promise<void>;
  addCategory: (cat: Omit<Category, 'id' | 'productCount'>) => void;

  // Order actions
  updateOrderStatus: (orderId: string, status: OrderStatus, trackingNumber?: string, carrier?: string) => Promise<void>;
  processRefund: (orderId: string, amount: number, reason: string) => void;
  addOrderNote: (orderId: string, content: string, isCustomerVisible: boolean) => void;

  // Customer actions
  updateCustomerSegment: (customerId: string, segment: Customer['segment']) => void;
  moderateReview: (reviewId: string, status: 'Approved' | 'Rejected', reply?: string) => void;
  sendCustomerBroadcast: (segment: string, subject: string, body: string) => void;

  // Inventory actions
  adjustStock: (productId: string, warehouseId: string, changeAmount: number, reason: StockAdjustmentLog['reason']) => void;
  transferStock: (productId: string, fromWarehouseId: string, toWarehouseId: string, quantity: number) => void;

  // Payment/Shipping actions
  togglePaymentGateway: (gatewayId: string) => void;
  updateShippingZone: (zoneId: string, updates: Partial<ShippingZone>) => void;

  // CMS/Marketing actions
  updateCMSPage: (pageId: string, sections: CMSPage['sections']) => void;
  addCMSPage: (page: Omit<CMSPage, 'id' | 'updatedAt'>) => void;
  toggleBanner: (bannerId: string) => void;
  addBanner: (banner: Omit<Banner, 'id'>) => void;
  addBlogPost: (post: Omit<BlogPost, 'id'>) => void;
  addCoupon: (coupon: Omit<Coupon, 'id' | 'timesUsed'>) => Promise<void>;
  updateCoupon: (code: string, updates: Partial<Coupon>) => Promise<void>;
  deleteCoupon: (code: string) => Promise<void>;
  createEmailCampaign: (campaign: Omit<EmailCampaign, 'id' | 'openRate' | 'clickRate'>) => void;
  abandonedCarts: AbandonedCart[];
  sendCartRecoveryEmail: (cartId: string) => void;

  // Roles / Settings
  updateStaffUserRole: (userId: string, roleId: string) => void;
  addStaffUser: (
    user: Omit<StaffUser, 'id'> & { password?: string }
  ) => Promise<{ email: string; password: string } | undefined>;
  updateStaffRole: (userId: string, roleName: string) => void;
  updateStaffUser: (
    userId: string,
    data: { name?: string; email?: string; role?: string; password?: string; is_active?: boolean; reset_totp?: boolean }
  ) => Promise<boolean>;
  deleteStaffUser: (userId: string) => Promise<boolean>;
  updateStoreSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
  updateSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
  logActivity: (action: string, module: string) => void;

  // Integrations
  integrations: Integration[];
  updateIntegration: (id: string, enabled: boolean) => Promise<boolean>;

  // State Reset & Export
  resetToDefaults: () => Promise<void>;
  exportBackupJSON: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('OMNI_DARK_MODE');
      if (!saved) return false;
      const parsed = JSON.parse(saved);
      return typeof parsed === 'boolean' ? parsed : false;
    } catch {
      return false;
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Print Invoice Order
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);

  // Manual categories to persist across reloads
  const [manualCategories, setManualCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem('OMNI_MANUAL_CATEGORIES');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Data States (populated from database via API)
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reviews, setReviews] = useState<CustomerReview[]>(() => getSavedState('OMNI_REVIEWS', DEFAULT_REVIEWS));
  const [warehouses, setWarehouses] = useState<Warehouse[]>(() => getSavedState('OMNI_WAREHOUSES', DEFAULT_WAREHOUSES));
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(() => getSavedState('OMNI_INVENTORY_ITEMS', DEFAULT_INVENTORY_ITEMS));
  const [stockLogs, setStockLogs] = useState<StockAdjustmentLog[]>(() => getSavedState('OMNI_STOCK_LOGS', DEFAULT_STOCK_LOGS));
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>(() => getSavedState('OMNI_PAYMENT_GATEWAYS', DEFAULT_PAYMENT_GATEWAYS));
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>(() => getSavedState('OMNI_SHIPPING_ZONES', DEFAULT_SHIPPING_ZONES));
  const [cmsPages, setCmsPages] = useState<CMSPage[]>(() => getSavedState('OMNI_CMS_PAGES', DEFAULT_CMS_PAGES));
  const [banners, setBanners] = useState<Banner[]>(() => getSavedState('OMNI_BANNERS', DEFAULT_BANNERS));
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(() => getSavedState('OMNI_BLOG_POSTS', DEFAULT_BLOG_POSTS));
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [bundleRules, setBundleRules] = useState<BundleRule[]>(() => getSavedState('OMNI_BUNDLE_RULES', DEFAULT_BUNDLE_RULES));
  const [emailCampaigns, setEmailCampaigns] = useState<EmailCampaign[]>(() => getSavedState('OMNI_EMAIL_CAMPAIGNS', DEFAULT_EMAIL_CAMPAIGNS));
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCart[]>(() => getSavedState('OMNI_ABANDONED_CARTS', DEFAULT_ABANDONED_CARTS));
  const [staffRoles, setStaffRoles] = useState<StaffRole[]>(() => getSavedState('OMNI_STAFF_ROLES', DEFAULT_STAFF_ROLES));
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  // Sync Dark Mode class on <html>
  useEffect(() => {
    try {
      localStorage.setItem('OMNI_DARK_MODE', JSON.stringify(darkMode));
    } catch {}
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Sync client-only states to localStorage
  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem('OMNI_REVIEWS', JSON.stringify(reviews));
    } catch {}
  }, [reviews, user]);

  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem('OMNI_WAREHOUSES', JSON.stringify(warehouses));
    } catch {}
  }, [warehouses, user]);

  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem('OMNI_INVENTORY_ITEMS', JSON.stringify(inventoryItems));
    } catch {}
  }, [inventoryItems, user]);

  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem('OMNI_STOCK_LOGS', JSON.stringify(stockLogs));
    } catch {}
  }, [stockLogs, user]);

  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem('OMNI_PAYMENT_GATEWAYS', JSON.stringify(paymentGateways));
    } catch {}
  }, [paymentGateways, user]);

  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem('OMNI_SHIPPING_ZONES', JSON.stringify(shippingZones));
    } catch {}
  }, [shippingZones, user]);

  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem('OMNI_CMS_PAGES', JSON.stringify(cmsPages));
    } catch {}
  }, [cmsPages, user]);

  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem('OMNI_BANNERS', JSON.stringify(banners));
    } catch {}
  }, [banners, user]);

  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem('OMNI_BLOG_POSTS', JSON.stringify(blogPosts));
    } catch {}
  }, [blogPosts, user]);

  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem('OMNI_BUNDLE_RULES', JSON.stringify(bundleRules));
    } catch {}
  }, [bundleRules, user]);

  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem('OMNI_EMAIL_CAMPAIGNS', JSON.stringify(emailCampaigns));
    } catch {}
  }, [emailCampaigns, user]);

  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem('OMNI_ABANDONED_CARTS', JSON.stringify(abandonedCarts));
    } catch {}
  }, [abandonedCarts, user]);

  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem('OMNI_STAFF_ROLES', JSON.stringify(staffRoles));
    } catch {}
  }, [staffRoles, user]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const logActivity = (action: string, module: string) => {
    const actorEmail = user?.email || 'admin@example.com';
    const actorName = user?.name || actorEmail.split('@')[0];
    const newLog: ActivityLog = {
      id: 'act-' + Date.now(),
      user: actorName,
      userEmail: actorEmail,
      action,
      module,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
    setActivityLogs((prev) => [newLog, ...prev]);
    api.logActivity({ action, module }).catch((e: any) => {
      console.error('Failed to persist activity log:', e?.message || e);
    });
  };

  const loadAllData = useCallback(async () => {
    try {
      const [productsRes, ordersRes, staffRes, logsRes, settingsRes, couponsRes, integrationsRes] = await Promise.all([
        api.getProducts(),
        api.getOrders(),
        api.getStaff(),
        api.getActivityLogs(),
        api.getSettings(),
        api.getCoupons(),
        api.getIntegrations().catch(() => []),
      ]);
      const mappedProducts = (productsRes || []).map(mapDbProduct);
      const mappedOrders = (ordersRes || []).map(mapDbOrder);
      setProducts(mappedProducts);

      // Merge derived categories with persistent manual categories
      const derived = deriveCategories(mappedProducts);
      const manual = (() => {
        try {
          const saved = localStorage.getItem('OMNI_MANUAL_CATEGORIES');
          return saved ? JSON.parse(saved) : [];
        } catch {
          return [];
        }
      })();
      const merged = [...derived];
      manual.forEach((m: Category) => {
        if (!merged.some((c) => c.name.toLowerCase() === m.name.toLowerCase())) {
          merged.push(m);
        }
      });
      setCategories(merged);

      setOrders(mappedOrders);
      setCustomers(deriveCustomers(mappedOrders));
      setStaffUsers(staffRes || []);
      setActivityLogs(logsRes || []);
      setSettings((prev) => ({ ...prev, ...(settingsRes || {}) }));
      setCoupons(couponsRes || []);
      setIntegrations(integrationsRes || []);
    } catch (e: any) {
      addToast({ type: 'error', title: 'Failed to load data', message: e.message || 'Database unreachable' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const currentUser = await checkAuth();
      if (cancelled) return;
      if (currentUser) {
        setUser(currentUser);
        await loadAllData();
      } else {
        setLoading(false);
      }
      setAuthChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAllData]);

  const updateAuthUser = (nextUser: AuthUser) => {
    setUser(nextUser);
  };

  const applyUser = async (nextUser: AuthUser) => {
    setUser(nextUser);
    await loadAllData();
  };

  const loginWithTotp = async (code: string, email?: string) => {
    const res = await api.totpLogin(code, email);
    if (res.authenticated && res.user) {
      await applyUser(res.user);
      return;
    }
    throw new Error(res.authenticated ? 'Login succeeded but no user was returned.' : 'Invalid authentication code');
  };

  const loginWithPassword = async (email: string, password: string) => {
    const res = await api.passwordLogin(email, password);
    if (res.authenticated && res.user) {
      await applyUser(res.user);
      return;
    }
    throw new Error(res.authenticated ? 'Login succeeded but no user was returned.' : 'Invalid email or password');
  };

  const completeSetup = async (code: string, email?: string) => {
    const res = await api.totpConfirm(code, email);
    return { user: res.user!, recoveryCodes: res.recoveryCodes || [] };
  };

  const enterAdmin = async (nextUser: AuthUser) => {
    await applyUser(nextUser);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {}
    setUser(null);
    setProducts([]);
    setCategories([]);
    setOrders([]);
    setCustomers([]);
    setReviews([]);
    setWarehouses([]);
    setInventoryItems([]);
    setStockLogs([]);
    setPaymentGateways([]);
    setShippingZones([]);
    setCmsPages([]);
    setBanners([]);
    setBlogPosts([]);
    setCoupons([]);
    setEmailCampaigns([]);
    setAbandonedCarts([]);
    setStaffRoles([]);
    setStaffUsers([]);
    setActivityLogs([]);
    setSettings(DEFAULT_SETTINGS);
    setIntegrations([]);
    setCurrentTab('dashboard');
    setSearchQuery('');
    setPrintingOrder(null);
  };

  // Product CRUD (persisted to database)
  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'salesCount' | 'rating' | 'reviewCount'>) => {
    try {
      const created = await api.createProduct({
        name: productData.name,
        category: productData.category,
        description: productData.description,
        price: productData.price,
        compareAtPrice: productData.compareAtPrice ?? null,
        slug: productData.seo?.slug || productData.sku,
        subcategory: productData.subcategory || null,
        sku: productData.sku || null,
        costPrice: productData.costPrice ?? null,
        stock: productData.stock ?? 0,
        lowStockThreshold: productData.lowStockThreshold ?? 0,
        status: productData.status || 'Active',
        videoUrl: productData.videoUrl || null,
        images: productData.images || [],
        tags: productData.tags || [],
        variants: productData.variants || [],
        seo: productData.seo || {},
        specifications: productData.specifications || {},
      });
      const newProduct: Product = {
        ...mapDbProduct(created),
        // Preserve client-side-only fields that the DB does not store yet.
        images: productData.images ?? [],
        variants: productData.variants ?? [],
        tags: productData.tags ?? [],
        stock: productData.stock ?? 0,
        lowStockThreshold: productData.lowStockThreshold ?? 0,
        status: productData.status,
        costPrice: productData.costPrice ?? 0,
        subcategory: productData.subcategory ?? '',
        sku: productData.sku ?? '',
        videoUrl: productData.videoUrl ?? '',
        seo: productData.seo,
      };
      setProducts((prev) => [newProduct, ...prev]);

      const derived = deriveCategories([newProduct, ...products]);
      const manual = (() => {
        try {
          const saved = localStorage.getItem('OMNI_MANUAL_CATEGORIES');
          return saved ? JSON.parse(saved) : [];
        } catch {
          return [];
        }
      })();
      const merged = [...derived];
      manual.forEach((m: Category) => {
        if (!merged.some((c) => c.name.toLowerCase() === m.name.toLowerCase())) {
          merged.push(m);
        }
      });
      setCategories(merged);

      logActivity(`Added product "${newProduct.name}"`, 'Products');
      addToast({ type: 'success', title: 'Product Created', message: `${newProduct.name} is now live.` });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Create Failed', message: e.message });
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const payload: Record<string, any> = {
        name: updates.name,
        category: updates.category,
        description: updates.description,
        price: updates.price,
      };
      if (updates.compareAtPrice !== undefined) payload.compareAtPrice = updates.compareAtPrice ?? null;
      if (updates.subcategory !== undefined) payload.subcategory = updates.subcategory || null;
      if (updates.sku !== undefined) payload.sku = updates.sku || null;
      if (updates.costPrice !== undefined) payload.costPrice = updates.costPrice ?? null;
      if (updates.stock !== undefined) payload.stock = updates.stock;
      if (updates.lowStockThreshold !== undefined) payload.lowStockThreshold = updates.lowStockThreshold;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.videoUrl !== undefined) payload.videoUrl = updates.videoUrl || null;
      if (updates.images !== undefined) payload.images = updates.images;
      if (updates.tags !== undefined) payload.tags = updates.tags;
      if (updates.variants !== undefined) payload.variants = updates.variants;
      if (updates.seo !== undefined) {
        payload.seo = updates.seo;
        if (updates.seo.slug) {
          payload.slug = updates.seo.slug;
        }
      }
      if (updates.specifications !== undefined) payload.specifications = updates.specifications;
      const updated = await api.updateProduct(id, payload);
      const mapped = mapDbProduct(updated);
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          // Preserve client-side-only fields that the DB does not store yet.
          return {
            ...mapped,
            images: updates.images ?? p.images,
            variants: updates.variants ?? p.variants,
            tags: updates.tags ?? p.tags,
            stock: updates.stock ?? p.stock,
            lowStockThreshold: updates.lowStockThreshold ?? p.lowStockThreshold,
            status: updates.status ?? p.status,
            costPrice: updates.costPrice ?? p.costPrice,
            subcategory: updates.subcategory ?? p.subcategory,
            sku: updates.sku ?? p.sku,
            videoUrl: updates.videoUrl ?? p.videoUrl,
            seo: updates.seo ?? p.seo,
          };
        })
      );
      logActivity(`Updated product ID ${id}`, 'Products');
      addToast({ type: 'info', title: 'Product Updated', message: 'Changes saved successfully.' });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Update Failed', message: e.message });
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await api.deleteProduct(id);
      const target = products.find((p) => p.id === id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      logActivity(`Deleted product "${target?.name || id}"`, 'Products');
      addToast({ type: 'warning', title: 'Product Removed', message: 'Product deleted from database.' });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Delete Failed', message: e.message });
    }
  };

  const duplicateProduct = async (id: string) => {
    const target = products.find((p) => p.id === id);
    if (!target) return;
    await addProduct({
      name: `${target.name} (Copy)`,
      category: target.category,
      description: target.description,
      price: target.price,
      compareAtPrice: target.compareAtPrice,
      stock: target.stock,
      lowStockThreshold: target.lowStockThreshold,
      status: 'Draft',
      images: target.images,
      videoUrl: target.videoUrl,
      variants: target.variants,
      seo: { ...target.seo, slug: `${target.seo.slug}-copy` },
      tags: target.tags,
      costPrice: target.costPrice,
      subcategory: target.subcategory,
      sku: `${target.sku}-COPY`,
      specifications: target.specifications,
    });
    addToast({ type: 'success', title: 'Product Duplicated', message: `Created copy "${target.name}".` });
  };

  const addCategory = (catData: Omit<Category, 'id' | 'productCount'>) => {
    const newCat: Category = {
      ...catData,
      id: 'cat-' + Date.now(),
      productCount: 0,
    };
    setCategories((prev) => {
      if (prev.some((c) => c.name.toLowerCase() === newCat.name.toLowerCase())) {
        return prev;
      }
      return [...prev, newCat];
    });
    setManualCategories((prev) => {
      const next = prev.some((c) => c.name.toLowerCase() === newCat.name.toLowerCase())
        ? prev
        : [...prev, newCat];
      try {
        localStorage.setItem('OMNI_MANUAL_CATEGORIES', JSON.stringify(next));
      } catch {}
      return next;
    });
    logActivity(`Added category "${newCat.name}"`, 'Products');
    addToast({ type: 'success', title: 'Category Created', message: `Category ${newCat.name} added.` });
  };

  // Order Actions (persisted to database)
  const updateOrderStatus = async (orderId: string, status: OrderStatus, trackingNumber?: string, carrier?: string) => {
    const DB_STATUS: Record<string, string> = {
      Pending: 'pending',
      Processing: 'confirmed',
      Shipped: 'shipped',
      Delivered: 'delivered',
      Cancelled: 'cancelled',
    };
    try {
      await api.updateOrder(orderId, {
        status: DB_STATUS[status] || 'pending',
        trackingNumber,
      });
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === orderId) {
            const updated = { ...o, orderStatus: status, updatedAt: new Date().toISOString() };
            if (trackingNumber) updated.trackingNumber = trackingNumber;
            if (carrier) updated.carrier = carrier;
            return updated;
          }
          return o;
        })
      );
      logActivity(`Updated Order ${orderId} status to "${status}"`, 'Orders');
      addToast({ type: 'success', title: 'Order Status Updated', message: `Order ${orderId} marked as ${status}.` });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Update Failed', message: e.message });
    }
  };

  const processRefund = (orderId: string, amount: number, reason: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            paymentStatus: 'Refunded',
            orderStatus: 'Cancelled',
            returnRequest: {
              id: 'RET-' + Date.now(),
              orderId,
              customerName: o.customerName,
              customerEmail: o.customerEmail,
              items: o.items.map((i) => ({ productId: i.productId, name: i.name, qty: i.quantity, reason })),
              reason,
              status: 'Refunded',
              refundAmount: amount,
              createdAt: new Date().toISOString().substring(0, 10),
            },
          };
        }
        return o;
      })
    );
    logActivity(`Processed refund of ₹${amount.toFixed(2)} for Order ${orderId}`, 'Orders');
    addToast({ type: 'info', title: 'Refund Issued', message: `₹${amount.toFixed(2)} refunded to customer account.` });
  };

  const addOrderNote = (orderId: string, content: string, isCustomerVisible: boolean) => {
    const note = {
      id: 'note-' + Date.now(),
      author: 'Admin Staff',
      content,
      isCustomerVisible,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, notes: [note, ...o.notes] } : o))
    );
    addToast({ type: 'success', title: 'Note Added', message: 'Order note saved.' });
  };

  // Customer Actions
  const updateCustomerSegment = (customerId: string, segment: Customer['segment']) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, segment } : c))
    );
    logActivity(`Updated customer segment to "${segment}"`, 'Customers');
    addToast({ type: 'info', title: 'Segment Updated', message: `Customer moved to ${segment}.` });
  };

  const moderateReview = (reviewId: string, status: 'Approved' | 'Rejected', reply?: string) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, status, reply: reply || r.reply } : r))
    );
    logActivity(`Moderated review ID ${reviewId} to ${status}`, 'Customers');
    addToast({ type: 'success', title: 'Review Updated', message: `Review status changed to ${status}.` });
  };

  const sendCustomerBroadcast = (segment: string, subject: string, body: string) => {
    const count = customers.filter((c) => segment === 'All' || c.segment === segment).length;
    logActivity(`Sent broadcast email "${subject}" to ${count} customers in segment "${segment}"`, 'Customers');
    addToast({ type: 'success', title: 'Email Broadcast Sent', message: `Delivered to ${count} recipient(s).` });
  };

  // Inventory Actions
  const adjustStock = (productId: string, warehouseId: string, changeAmount: number, reason: StockAdjustmentLog['reason']) => {
    const targetInv = inventoryItems.find((inv) => inv.productId === productId && inv.warehouseId === warehouseId);
    if (!targetInv) return;

    const newQty = Math.max(0, targetInv.quantity + changeAmount);
    const newStatus = newQty > targetInv.reorderPoint ? 'In Stock' : newQty > 0 ? 'Low Stock' : 'Out of Stock';

    setInventoryItems((prev) =>
      prev.map((inv) =>
        inv.id === targetInv.id
          ? { ...inv, quantity: newQty, status: newStatus, lastUpdated: new Date().toISOString().substring(0, 10) }
          : inv
      )
    );

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const totalStock = Math.max(0, p.stock + changeAmount);
          return {
            ...p,
            stock: totalStock,
            status: totalStock > p.lowStockThreshold ? 'Active' : totalStock > 0 ? 'Active' : 'Out of Stock',
          };
        }
        return p;
      })
    );

    const logEntry: StockAdjustmentLog = {
      id: 'log-' + Date.now(),
      productId,
      productName: targetInv.productName,
      warehouseName: targetInv.warehouseName,
      changeAmount,
      reason,
      adjustedBy: 'Store Manager',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
    setStockLogs((prev) => [logEntry, ...prev]);
    logActivity(`Adjusted stock for ${targetInv.productName} by ${changeAmount > 0 ? '+' : ''}${changeAmount} (${reason})`, 'Inventory');
    addToast({ type: 'success', title: 'Stock Adjusted', message: `New balance: ${newQty} unit(s).` });
  };

  const transferStock = (productId: string, fromWarehouseId: string, toWarehouseId: string, quantity: number) => {
    adjustStock(productId, fromWarehouseId, -quantity, 'Correction');
    adjustStock(productId, toWarehouseId, quantity, 'Restock');
    logActivity(`Transferred ${quantity} unit(s) of product ID ${productId}`, 'Inventory');
    addToast({ type: 'info', title: 'Warehouse Transfer', message: `Moved ${quantity} items between warehouses.` });
  };

  // Payment & Shipping
  const togglePaymentGateway = (gatewayId: string) => {
    setPaymentGateways((prev) =>
      prev.map((g) => (g.id === gatewayId ? { ...g, enabled: !g.enabled } : g))
    );
    const target = paymentGateways.find((g) => g.id === gatewayId);
    logActivity(`Toggled payment gateway "${target?.name}"`, 'Settings');
    addToast({ type: 'info', title: 'Gateway Configuration', message: `${target?.name} status updated.` });
  };

  const updateShippingZone = (zoneId: string, updates: Partial<ShippingZone>) => {
    setShippingZones((prev) =>
      prev.map((z) => (z.id === zoneId ? { ...z, ...updates } : z))
    );
    addToast({ type: 'success', title: 'Shipping Zone Saved', message: 'Zone settings updated.' });
  };

  // CMS & Marketing
  const updateCMSPage = (pageId: string, sections: CMSPage['sections']) => {
    setCmsPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, sections, updatedAt: new Date().toISOString().substring(0, 10) } : p))
    );
    addToast({ type: 'success', title: 'CMS Page Published', message: 'Page section updates are live.' });
  };

  const addCMSPage = (page: Omit<CMSPage, 'id' | 'updatedAt'>) => {
    const newPage: CMSPage = {
      ...page,
      id: 'page-' + Date.now(),
      updatedAt: new Date().toISOString().substring(0, 10),
    };
    setCmsPages((prev) => [newPage, ...prev]);
    addToast({ type: 'success', title: 'CMS Page Created', message: `Page "${newPage.title}" is live.` });
  };

  const toggleBanner = (bannerId: string) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === bannerId ? { ...b, active: !b.active } : b))
    );
    addToast({ type: 'info', title: 'Banner Toggle', message: 'Promo banner status toggled.' });
  };

  const addBanner = (banner: Omit<Banner, 'id'>) => {
    const newBanner: Banner = {
      ...banner,
      id: 'banner-' + Date.now(),
    };
    setBanners((prev) => [newBanner, ...prev]);
    addToast({ type: 'success', title: 'Banner Added', message: `Hero banner "${newBanner.title}" created.` });
  };

  const addBlogPost = (post: Omit<BlogPost, 'id'>) => {
    const newPost: BlogPost = {
      ...post,
      id: 'blog-' + Date.now(),
    };
    setBlogPosts((prev) => [newPost, ...prev]);
    addToast({ type: 'success', title: 'Article Published', message: `Blog post "${newPost.title}" is live.` });
  };

  const addCoupon = async (couponData: Omit<Coupon, 'id' | 'timesUsed'>) => {
    try {
      const newCoupon = await api.createCoupon(couponData);
      setCoupons((prev) => [newCoupon, ...prev]);
      logActivity(`Created promo coupon code "${newCoupon.code}"`, 'Marketing');
      addToast({ type: 'success', title: 'Coupon Created', message: `Code ${newCoupon.code} active on the store.` });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Coupon Not Created', message: e?.message || 'Could not create coupon' });
    }
  };

  const updateCoupon = async (code: string, updates: Partial<Coupon>) => {
    try {
      const updated = await api.updateCoupon(code, updates);
      setCoupons((prev) => prev.map((c) => (c.code === code ? updated : c)));
      addToast({ type: 'success', title: 'Coupon Updated', message: `${updated.code} is now ${updated.status}.` });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Update Failed', message: e?.message || 'Could not update coupon' });
    }
  };

  const deleteCoupon = async (code: string) => {
    try {
      await api.deleteCoupon(code);
      setCoupons((prev) => prev.filter((c) => c.code !== code));
      addToast({ type: 'warning', title: 'Coupon Removed', message: 'Discount code deleted from the store.' });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Delete Failed', message: e?.message || 'Could not delete coupon' });
    }
  };

  const createEmailCampaign = (campData: Omit<EmailCampaign, 'id' | 'openRate' | 'clickRate'>) => {
    const newCamp: EmailCampaign = {
      ...campData,
      id: 'camp-' + Date.now(),
      openRate: 0,
      clickRate: 0,
      sentAt: new Date().toISOString().substring(0, 10),
    };
    setEmailCampaigns((prev) => [newCamp, ...prev]);
    addToast({ type: 'success', title: 'Campaign Scheduled', message: `Email campaign "${newCamp.name}" created.` });
  };

  const sendCartRecoveryEmail = (cartId: string) => {
    const cart = abandonedCarts.find((c) => c.id === cartId);
    setAbandonedCarts((prev) =>
      prev.map((c) => (c.id === cartId ? { ...c, recovered: true } : c))
    );
    logActivity(`Sent recovery email for cart ${cartId}`, 'Marketing');
    addToast({ type: 'success', title: 'Recovery Email Sent', message: `Recovery email sent to ${cart?.customerEmail || cartId}.` });
  };

  // Roles & Settings
  const updateStaffUserRole = (userId: string, roleId: string) => {
    const role = staffRoles.find((r) => r.id === roleId);
    setStaffUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, roleId, roleName: role?.name || u.roleName } : u))
    );
    addToast({ type: 'info', title: 'User Role Changed', message: `Permissions updated.` });
  };

  const addStaffUser = async (user: Omit<StaffUser, 'id'> & { password?: string }) => {
    try {
      const { user: created, credentials } = await api.createStaff({
        name: user.name,
        email: user.email,
        role: user.roleName,
        password: user.password,
      });
      const newUser: StaffUser = {
        id: created.id,
        name: user.name,
        email: user.email,
        roleId: created.roleId,
        roleName: created.roleName,
        avatar: user.avatar,
        status: user.status,
        lastLogin: user.lastLogin,
      };
      setStaffUsers((prev) => [...prev, newUser]);
      logActivity(`Added staff member "${newUser.name}" (${newUser.email})`, 'Staff');
      addToast({ type: 'success', title: 'Staff Added', message: `Account created for ${newUser.email}.` });
      return credentials;
    } catch (e: any) {
      addToast({ type: 'error', title: 'Add Failed', message: e.message });
      return undefined;
    }
  };

  const updateStaffRole = async (userId: string, roleName: string) => {
    try {
      const updated = await api.updateStaff(userId, { role: roleName });
      setStaffUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, roleId: updated.roleId, roleName: updated.roleName, status: updated.status as StaffUser['status'] }
            : u
        )
      );
      logActivity(`Updated role of "${updated.email}" to ${roleName}`, 'Staff');
      addToast({ type: 'info', title: 'User Role Changed', message: 'Permissions updated.' });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Update Failed', message: e.message });
    }
  };

  const updateStaffUser = async (
    userId: string,
    data: { name?: string; email?: string; role?: string; password?: string; is_active?: boolean; reset_totp?: boolean }
  ) => {
    try {
      const updated = await api.updateStaff(userId, data);
      setStaffUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                name: updated.name,
                email: updated.email,
                roleId: updated.roleId,
                roleName: updated.roleName,
                status: updated.status as StaffUser['status'],
              }
            : u
        )
      );
      logActivity(`Updated staff member "${updated.email}"`, 'Staff');
      addToast({ type: 'success', title: 'Staff Updated', message: `Saved changes for ${updated.email}.` });
      return true;
    } catch (e: any) {
      addToast({ type: 'error', title: 'Update Failed', message: e.message });
      return false;
    }
  };

  const deleteStaffUser = async (userId: string) => {
    try {
      await api.deleteStaff(userId);
      setStaffUsers((prev) => prev.filter((u) => u.id !== userId));
      logActivity(`Removed staff member "${userId}"`, 'Staff');
      addToast({ type: 'success', title: 'Staff Removed', message: 'Staff member deleted.' });
      return true;
    } catch (e: any) {
      addToast({ type: 'error', title: 'Delete Failed', message: e.message });
      return false;
    }
  };

  const updateStoreSettings = async (newSettings: Partial<StoreSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    try {
      await api.updateSettings(newSettings);
      addToast({ type: 'success', title: 'Settings Saved', message: 'Store configuration saved.' });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Save Failed', message: e.message });
    }
  };

  const updateSettings = updateStoreSettings;

  const updateIntegration = async (id: string, enabled: boolean) => {
    try {
      const updated = await api.updateIntegration(id, enabled);
      setIntegrations((prev) => prev.map((i) => (i.id === id ? updated : i)));
      addToast({ type: 'success', title: enabled ? 'Service enabled' : 'Service disabled', message: `${updated.name} is now ${enabled ? 'ON' : 'OFF'}.` });
      return true;
    } catch (e: any) {
      addToast({ type: 'error', title: 'Save Failed', message: e.message });
      return false;
    }
  };

  const resetToDefaults = async () => {
    try {
      localStorage.removeItem('OMNI_REVIEWS');
      localStorage.removeItem('OMNI_WAREHOUSES');
      localStorage.removeItem('OMNI_INVENTORY_ITEMS');
      localStorage.removeItem('OMNI_STOCK_LOGS');
      localStorage.removeItem('OMNI_PAYMENT_GATEWAYS');
      localStorage.removeItem('OMNI_SHIPPING_ZONES');
      localStorage.removeItem('OMNI_CMS_PAGES');
      localStorage.removeItem('OMNI_BANNERS');
      localStorage.removeItem('OMNI_BLOG_POSTS');
      localStorage.removeItem('OMNI_BUNDLE_RULES');
      localStorage.removeItem('OMNI_EMAIL_CAMPAIGNS');
      localStorage.removeItem('OMNI_ABANDONED_CARTS');
      localStorage.removeItem('OMNI_STAFF_ROLES');
      localStorage.removeItem('OMNI_MANUAL_CATEGORIES');
    } catch {}
    setReviews(DEFAULT_REVIEWS);
    setWarehouses(DEFAULT_WAREHOUSES);
    setInventoryItems(DEFAULT_INVENTORY_ITEMS);
    setStockLogs(DEFAULT_STOCK_LOGS);
    setPaymentGateways(DEFAULT_PAYMENT_GATEWAYS);
    setShippingZones(DEFAULT_SHIPPING_ZONES);
    setCmsPages(DEFAULT_CMS_PAGES);
    setBanners(DEFAULT_BANNERS);
    setBlogPosts(DEFAULT_BLOG_POSTS);
    setBundleRules(DEFAULT_BUNDLE_RULES);
    setEmailCampaigns(DEFAULT_EMAIL_CAMPAIGNS);
    setAbandonedCarts(DEFAULT_ABANDONED_CARTS);
    setStaffRoles(DEFAULT_STAFF_ROLES);
    await loadAllData();
    addToast({ type: 'info', title: 'Data Reloaded', message: 'Fetched latest data and reset local storage caches.' });
  };

  const exportBackupJSON = () => {
    const backupData = {
      products,
      categories,
      orders,
      customers,
      settings,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `store-backup-${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    addToast({ type: 'success', title: 'Backup Downloaded', message: 'Store data exported to JSON file.' });
  };

  return (
    <AdminContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        darkMode,
        setDarkMode,
        toggleDarkMode,
        searchQuery,
        setSearchQuery,
        toasts,
        addToast,
        removeToast,
        loading,
        reloadData: loadAllData,

        user,
        authChecked,
        updateAuthUser,
        loginWithTotp,
        loginWithPassword,
        completeSetup,
        enterAdmin,
        logout,

        printingOrder,
        setPrintingOrder,

        products,
        categories,
        tags,
        orders,
        customers,
        reviews,
        warehouses,
        inventoryItems,
        stockLogs,
        paymentGateways,
        shippingZones,
        cmsPages,
        banners,
        blogPosts,
        coupons,
        bundleRules,
        emailCampaigns,
        abandonedCarts,
        staffRoles,
        staffUsers,
        activityLogs,
        settings,
        integrations,

        addProduct,
        updateProduct,
        deleteProduct,
        duplicateProduct,
        addCategory,

        updateOrderStatus,
        processRefund,
        addOrderNote,

        updateCustomerSegment,
        moderateReview,
        sendCustomerBroadcast,

        adjustStock,
        transferStock,

        togglePaymentGateway,
        updateShippingZone,

        updateCMSPage,
        addCMSPage,
        toggleBanner,
        addBanner,
        addBlogPost,
        addCoupon,
        updateCoupon,
        deleteCoupon,
        createEmailCampaign,
        sendCartRecoveryEmail,

        updateStaffUserRole,
        addStaffUser,
        updateStaffRole,
        updateStaffUser,
        deleteStaffUser,
        updateStoreSettings,
        updateSettings,
        logActivity,

        updateIntegration,

        resetToDefaults,
        exportBackupJSON,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
