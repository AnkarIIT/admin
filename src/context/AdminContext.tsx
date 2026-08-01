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
  | 'settings';

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
  updateStoreSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
  updateSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
  logActivity: (action: string, module: string) => void;

  // State Reset & Export
  resetToDefaults: () => Promise<void>;
  exportBackupJSON: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('OMNI_DARK_MODE');
    return saved ? JSON.parse(saved) : false;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Print Invoice Order
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);

  // Data States (populated from database via API)
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [stockLogs, setStockLogs] = useState<StockAdjustmentLog[]>([]);
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>([]);
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [cmsPages, setCmsPages] = useState<CMSPage[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [bundleRules, setBundleRules] = useState<BundleRule[]>([]);
  const [emailCampaigns, setEmailCampaigns] = useState<EmailCampaign[]>([]);
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCart[]>([]);
  const [staffRoles, setStaffRoles] = useState<StaffRole[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);

  // Sync Dark Mode class on <html>
  useEffect(() => {
    localStorage.setItem('OMNI_DARK_MODE', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

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
      const [productsRes, ordersRes, staffRes, logsRes, settingsRes, couponsRes] = await Promise.all([
        api.getProducts(),
        api.getOrders(),
        api.getStaff(),
        api.getActivityLogs(),
        api.getSettings(),
        api.getCoupons(),
      ]);
      const mappedProducts = (productsRes || []).map(mapDbProduct);
      const mappedOrders = (ordersRes || []).map(mapDbOrder);
      setProducts(mappedProducts);
      setCategories(deriveCategories(mappedProducts));
      setOrders(mappedOrders);
      setCustomers(deriveCustomers(mappedOrders));
      setStaffUsers(staffRes || []);
      setActivityLogs(logsRes || []);
      setSettings((prev) => ({ ...prev, ...(settingsRes || {}) }));
      setCoupons(couponsRes || []);
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
      setCategories(deriveCategories([newProduct, ...products]));
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
      if (updates.seo !== undefined) payload.seo = updates.seo;
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
    });
    addToast({ type: 'success', title: 'Product Duplicated', message: `Created copy "${target.name}".` });
  };

  const addCategory = (catData: Omit<Category, 'id' | 'productCount'>) => {
    const newCat: Category = {
      ...catData,
      id: 'cat-' + Date.now(),
      productCount: 0,
    };
    setCategories((prev) => [...prev, newCat]);
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

  const updateStaffRole = (userId: string, roleName: string) => {
    setStaffUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, roleName } : u))
    );
    addToast({ type: 'info', title: 'User Role Changed', message: `Permissions updated.` });
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

  const resetToDefaults = async () => {
    await loadAllData();
    addToast({ type: 'info', title: 'Data Reloaded', message: 'Fetched latest data from database.' });
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
        updateStoreSettings,
        updateSettings,
        logActivity,

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
