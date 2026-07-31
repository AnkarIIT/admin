import express from "express";
import path from "path";
import { pathToFileURL } from "url";
import dotenv from "dotenv";
import helmet from "helmet";
import { z } from "zod";
import prisma from "./lib/prisma";
import {
  checkRateLimit,
  clearLoginRateLimit,
  currentSession,
  sessionToken,
  requireAuth,
  createSession,
  destroySession,
  setSessionCookie,
  setCsrfCookie,
  clearSessionCookie,
  generateRecoveryCodes,
  hashRecoveryCodes,
  consumeRecoveryCode,
  publicUser,
  verifyTotp,
  generateTotpSecret,
  totpKeyUri,
  totpQrDataUrl,
  csrfProtection,
  validateApiKey,
} from "./lib/auth";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === "production";

app.set("trust proxy", true);
app.use(
  helmet({
    contentSecurityPolicy: isProd ? undefined : false,
    crossOriginResourcePolicy: { policy: "same-origin" },
  })
);

// Simple configurable CORS for cross-domain admin/storefront integration.
// Set ALLOWED_ORIGINS in the environment as a comma-separated list.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
app.use((req, res, next) => {
  const origin = (req.headers.origin || "") as string;
  if (origin && allowedOrigins.length && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: "1mb" }));

const handleError = (res: express.Response, e: any, context: string) => {
  console.error(`[${context}]`, e?.message || e);
  res.status(500).json({ error: "Internal server error" });
};

// API Routes
app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "error", db: "disconnected", timestamp: new Date().toISOString() });
  }
});

// ---- Auth Routes ----

const clientIp = (req: express.Request) =>
  (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";

async function primaryAdmin() {
  const superAdmin = await prisma.admins.findFirst({ where: { role: "super_admin" }, orderBy: { created_at: "asc" } });
  if (superAdmin) return superAdmin;
  return prisma.admins.findFirst({ orderBy: { created_at: "asc" } });
}

async function resolveAdmin(email?: unknown) {
  if (email && typeof email === "string" && email.trim()) {
    const admin = await prisma.admins.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (admin) return admin;
  }
  return primaryAdmin();
}

app.get("/api/auth/totp-status", async (req, res) => {
  try {
    const admin = await resolveAdmin((req.query as any).email);
    res.json({ enabled: !!(admin && admin.totp_enabled && admin.totp_secret) });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to read TOTP status" });
  }
});

app.post("/api/auth/totp-setup", async (req, res) => {
  try {
    const admin = await resolveAdmin((req.body || {}).email);
    if (!admin) return res.status(404).json({ error: "No admin account found" });
    if (admin.totp_enabled && admin.totp_secret) {
      return res.status(409).json({ error: "TOTP is already enabled" });
    }
    const secret = generateTotpSecret();
    await prisma.admins.update({ where: { id: admin.id }, data: { totp_secret: secret, recovery_codes_hash: null } });
    const uri = totpKeyUri(admin.email, secret);
    const qr = await totpQrDataUrl(uri);
    res.json({ secret, uri, qr });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to start TOTP setup" });
  }
});

app.post("/api/auth/totp-confirm", async (req, res) => {
  try {
    const { code, email } = req.body || {};
    if (!code || typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ error: "Authentication code is required" });
    }
    const admin = await resolveAdmin(email);
    if (!admin || !admin.totp_secret) return res.status(400).json({ error: "No pending TOTP setup" });
    if (admin.totp_enabled) return res.status(409).json({ error: "TOTP is already enabled" });
    if (!(await verifyTotp(String(code).trim(), admin.totp_secret))) {
      return res.status(401).json({ error: "Invalid authentication code" });
    }
    const recoveryCodes = generateRecoveryCodes();
    const recoveryHashes = await hashRecoveryCodes(recoveryCodes);
    await prisma.admins.update({
      where: { id: admin.id },
      data: { totp_enabled: true, recovery_codes_hash: recoveryHashes },
    });
    await prisma.audit_logs.create({
      data: { admin_id: admin.id, action: "enable_2fa", details: { module: "Security" }, ip_address: clientIp(req) },
    });
    const sess = await createSession(admin.id);
    setSessionCookie(res, sess.token);
    setCsrfCookie(res, sess.csrf);
    res.json({ success: true, user: publicUser({ ...admin, totp_enabled: true }), recoveryCodes });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to enable TOTP" });
  }
});

app.post("/api/auth/totp-login", checkRateLimit, async (req, res) => {
  try {
    const { code, email } = req.body || {};
    if (!code || typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ error: "Authentication code is required" });
    }
    const admin = await resolveAdmin(email);
    if (!admin || !admin.totp_enabled || !admin.totp_secret) {
      await verifyTotp(String(code).trim(), "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP");
      return res.status(401).json({ error: "Invalid authentication code" });
    }
    const codeStr = String(code).trim();
    let verified = await verifyTotp(codeStr, admin.totp_secret);
    let usedRecovery = false;

    if (!verified && admin.recovery_codes_hash) {
      const recovery = await consumeRecoveryCode(codeStr, admin.recovery_codes_hash);
      if (recovery.ok) {
        await prisma.admins.update({
          where: { id: admin.id },
          data: { recovery_codes_hash: recovery.nextHashJson },
        });
        usedRecovery = true;
        verified = true;
      }
    }

    if (!verified) {
      return res.status(401).json({ error: "Invalid authentication code" });
    }

    clearLoginRateLimit(req);
    await prisma.audit_logs.create({
      data: {
        admin_id: admin.id,
        action: usedRecovery ? "login_recovery_code" : "login_success",
        details: { module: "Auth" },
        ip_address: clientIp(req),
      },
    });
    const sess = await createSession(admin.id);
    setSessionCookie(res, sess.token);
    setCsrfCookie(res, sess.csrf);
    res.json({ authenticated: true, user: publicUser(admin) });
  } catch (e: any) {
    handleError(res, e, "POST /api/auth/totp-login");
  }
});

app.get("/api/auth/me", async (req, res) => {
  try {
    const auth = (req.headers.authorization || "").toString();
    if (auth.startsWith("Bearer ")) {
      const token = auth.slice(7).trim();
      if (validateApiKey(token)) return res.json({ authenticated: true, user: null });
    }

    const token = sessionToken(req);
    const session = await currentSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const admin = await prisma.admins.findUnique({ where: { id: session.userId } });
    if (!admin) return res.status(401).json({ error: "Not authenticated" });
    if (token) setSessionCookie(res, token);
    res.json({ authenticated: true, user: publicUser(admin) });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to load session" });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  await destroySession(sessionToken(req));
  clearSessionCookie(res);
  res.json({ success: true });
});

// ---- Database API Routes ----
// Apply CSRF protection before auth; API key bearer tokens are accepted and bypass CSRF checks.
app.use("/api", csrfProtection, requireAuth);

const num = (v: any) => (v == null ? null : Number(v));

const priceSchema = z
  .union([z.number(), z.string()])
  .transform((v) => Number(v))
  .refine((n) => Number.isFinite(n) && n >= 0 && n <= 100_000_000, { message: "Invalid price" });

const productSchema = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().max(100).optional(),
  description: z.string().trim().max(5000).optional(),
  price: priceSchema,
  compareAtPrice: priceSchema.nullable().optional(),
  slug: z.string().trim().max(200).optional(),
  isNew: z.boolean().optional(),
  isBestseller: z.boolean().optional(),
});

const orderUpdateSchema = z.object({
  status: z.enum(["pending", "pending_payment", "paid", "confirmed", "shipped", "delivered", "cancelled"]).optional(),
  trackingNumber: z.string().trim().max(200).nullable().optional(),
});

const settingsSchema = z.record(z.string(), z.unknown());

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 200) || "product";

// Products
app.get("/api/products", async (req, res) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
    res.json(
      products.map((p) => ({
        ...p,
        base_price: num(p.base_price),
        discounted_price: num(p.discounted_price),
      }))
    );
  } catch (e: any) {
    handleError(res, e, "GET /api/products");
  }
});

app.post("/api/products", async (req, res) => {
  try {
    const parsed = productSchema.parse(req.body);
    const product = await prisma.product.create({
      data: {
        name: parsed.name,
        slug: parsed.slug || slugify(parsed.name),
        category: parsed.category || "UNCATEGORIZED",
        description: parsed.description || "",
        base_price: parsed.price,
        discounted_price: parsed.compareAtPrice != null ? parsed.compareAtPrice : null,
        is_on_sale: parsed.compareAtPrice != null && parsed.compareAtPrice > parsed.price,
        is_new: !!parsed.isNew,
        is_bestseller: !!parsed.isBestseller,
      },
    });
    res.status(201).json({ ...product, base_price: num(product.base_price), discounted_price: num(product.discounted_price) });
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues[0]?.message || "Invalid input" });
    handleError(res, e, "POST /api/products");
  }
});

app.patch("/api/products/:id", async (req, res) => {
  try {
    const parsed = productSchema.partial().refine((v) => Object.keys(v).length > 0, { message: "No fields to update" }).parse(req.body);
    const data: any = {};
    if (parsed.name != null) data.name = parsed.name;
    if (parsed.category != null) data.category = parsed.category;
    if (parsed.description != null) data.description = parsed.description;
    if (parsed.price != null) data.base_price = parsed.price;
    if (parsed.compareAtPrice !== undefined) {
      data.discounted_price = parsed.compareAtPrice;
      data.is_on_sale = parsed.compareAtPrice != null && parsed.compareAtPrice > (parsed.price ?? Number(req.body.base_price ?? 0));
    }
    if (parsed.isNew != null) data.is_new = parsed.isNew;
    if (parsed.isBestseller != null) data.is_bestseller = parsed.isBestseller;
    const product = await prisma.product.update({ where: { id: req.params.id }, data });
    res.json({ ...product, base_price: num(product.base_price), discounted_price: num(product.discounted_price) });
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues[0]?.message || "Invalid input" });
    if (e.code === "P2025") return res.status(404).json({ error: "Product not found" });
    handleError(res, e, "PATCH /api/products/:id");
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    if (e.code === "P2025") return res.status(404).json({ error: "Product not found" });
    handleError(res, e, "DELETE /api/products/:id");
  }
});

// Orders
app.get("/api/orders", async (req, res) => {
  try {
    const orders = await prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    res.json(
      orders.map((o) => ({
        ...o,
        subtotal: num(o.subtotal),
        tax: num(o.tax),
        shipping: num(o.shipping),
        discount: num(o.discount),
        total: num(o.total),
      }))
    );
  } catch (e: any) {
    handleError(res, e, "GET /api/orders");
  }
});

app.patch("/api/orders/:id", async (req, res) => {
  try {
    const parsed = orderUpdateSchema.partial().refine((v) => Object.keys(v).length > 0, { message: "No fields to update" }).parse(req.body);
    const { status, trackingNumber } = parsed;
    const existing = await prisma.order.findFirst({
      where: { OR: [{ id: req.params.id }, { orderId: req.params.id }] },
    });
    if (!existing) return res.status(404).json({ error: "Order not found" });
    const data: any = {};
    if (status != null) data.status = status;
    const order = await prisma.order.update({ where: { id: existing.id }, data });
    if (trackingNumber != null || status != null) {
      let addr: any = {};
      try {
        addr = JSON.parse(existing.shippingAddress || "{}");
      } catch {}
      const deliveryStatus =
        status === "shipped" ? "shipped"
        : status === "delivered" ? "delivered"
        : status === "cancelled" ? "cancelled"
        : undefined;
      const payment = await prisma.payment.findUnique({ where: { orderId: existing.orderId } });
      const existingDelivery = await prisma.delivery.findUnique({ where: { orderId: existing.orderId } });
      if (payment || existingDelivery) {
        await prisma.delivery.upsert({
          where: { orderId: existing.orderId },
          create: {
            id: `del_${existing.orderId}`,
            orderId: existing.orderId,
            paymentId: payment!.id,
            customerName: existing.customerName,
            customerPhone: existing.customerPhone,
            street: addr.street || addr.fullName || "",
            city: addr.city || "",
            state: addr.state || "",
            pincode: addr.pincode || "",
            ...(trackingNumber != null ? { trackingNumber } : {}),
            ...(deliveryStatus ? { status: deliveryStatus as any } : {}),
            ...(status === "shipped" ? { shippedAt: new Date() } : {}),
            ...(status === "delivered" ? { deliveredAt: new Date() } : {}),
            updatedAt: new Date(),
          },
          update: {
            ...(trackingNumber != null ? { trackingNumber } : {}),
            ...(deliveryStatus ? { status: deliveryStatus as any } : {}),
            ...(status === "shipped" ? { shippedAt: new Date() } : {}),
            ...(status === "delivered" ? { deliveredAt: new Date() } : {}),
            updatedAt: new Date(),
          },
        });
      }
    }
    res.json(order);
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues[0]?.message || "Invalid input" });
    if (e.code === "P2025") return res.status(404).json({ error: "Order not found" });
    handleError(res, e, "PATCH /api/orders/:id");
  }
});

// Staff (from admins table)
app.get("/api/staff", async (req, res) => {
  try {
    const admins = await prisma.admins.findMany({ orderBy: { created_at: "asc" } });
    res.json(
      admins.map((a) => ({
        id: a.id,
        name: a.email.split("@")[0],
        email: a.email,
        roleId: a.role,
        roleName: a.role,
        status: "Active",
        lastLogin: a.updated_at ? a.updated_at.toISOString() : "",
      }))
    );
  } catch (e: any) {
    handleError(res, e, "GET /api/staff");
  }
});

// Activity logs (from audit_logs table)
app.get("/api/activity-logs", async (req, res) => {
  try {
    const logs = await prisma.audit_logs.findMany({ orderBy: { created_at: "desc" }, take: 100 });
    res.json(
      logs.map((l) => ({
        id: l.id,
        user: l.admin_id || "system",
        userEmail: l.admin_id || "system",
        action: l.action,
        module: (l.details as any)?.module || "System",
        ipAddress: l.ip_address || "unknown",
        timestamp: l.created_at ? l.created_at.toISOString() : "",
      }))
    );
  } catch (e: any) {
    handleError(res, e, "GET /api/activity-logs");
  }
});

// Persist activity log (used by AdminContext.logActivity)
app.post("/api/activity-logs", async (req, res) => {
  try {
    const parsed = z
      .object({
        action: z.string().trim().min(1).max(300),
        module: z.string().trim().max(100).optional(),
        entity: z.string().trim().max(200).nullable().optional(),
        details: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(req.body);
    await prisma.audit_logs.create({
      data: {
        admin_id: (req as any).userId ?? null,
        action: parsed.action,
        details: {
          ...(parsed.details || {}),
          module: parsed.module || "System",
          entity: parsed.entity || null,
        },
        ip_address: clientIp(req),
      },
    });
    res.json({ success: true });
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues[0]?.message || "Invalid input" });
    handleError(res, e, "POST /api/activity-logs");
  }
});

// Settings (from SiteConfig "store_settings" row)
app.get("/api/settings", async (req, res) => {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { id: "store_settings" } });
    res.json(row ? JSON.parse(row.data) : {});
  } catch (e: any) {
    handleError(res, e, "GET /api/settings");
  }
});

app.patch("/api/settings", async (req, res) => {
  try {
    const data = JSON.stringify(settingsSchema.parse(req.body));
    const row = await prisma.siteConfig.upsert({
      where: { id: "store_settings" },
      create: { id: "store_settings", data, updatedAt: new Date() },
      update: { data, updatedAt: new Date() },
    });
    res.json(JSON.parse(row.data));
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues[0]?.message || "Invalid input" });
    handleError(res, e, "PATCH /api/settings");
  }
});

// Coupons (from SiteConfig "global" row so the storefront sees them)
const LEGACY_COUPONS: Record<string, any> = {
  SD_FIRST_10: { id: "c_sd_first_10", code: "SD_FIRST_10", label: "First order discount", type: "Percentage", value: 10, percent: 10, minOrderValue: 0, expiryDate: "", usageLimit: 0, timesUsed: 0, status: "Active" },
  SD_LAB15: { id: "c_sd_lab15", code: "SD_LAB15", label: "Lab community discount", type: "Percentage", value: 15, percent: 15, minOrderValue: 0, expiryDate: "", usageLimit: 0, timesUsed: 0, status: "Active" },
  NEWSLETTER15: { id: "c_sd_newsletter15", code: "NEWSLETTER15", label: "Newsletter signup discount", type: "Percentage", value: 15, percent: 15, minOrderValue: 0, expiryDate: "", usageLimit: 0, timesUsed: 0, status: "Active" },
};

const couponSchema = z.object({
  code: z.string().trim().min(1).max(40),
  label: z.string().trim().max(100).optional(),
  type: z.enum(["Percentage", "Fixed Amount"]),
  value: z.number().positive().max(1_000_000),
  minOrderValue: z.number().min(0).max(100_000_000).default(0),
  expiryDate: z.string().trim().max(10).optional(),
  usageLimit: z.number().int().positive().default(100),
  status: z.enum(["Active", "Inactive"]).default("Active"),
});

const couponPatchSchema = z
  .object({
    label: z.string().trim().max(100).optional(),
    type: z.enum(["Percentage", "Fixed Amount"]).optional(),
    value: z.number().positive().max(1_000_000).optional(),
    minOrderValue: z.number().min(0).max(100_000_000).optional(),
    expiryDate: z.string().trim().max(10).nullable().optional(),
    usageLimit: z.number().int().positive().nullable().optional(),
    status: z.enum(["Active", "Inactive"]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" });

const readGlobalConfig = async (): Promise<Record<string, any>> => {
  const row = await prisma.siteConfig.findUnique({ where: { id: "global" } });
  if (!row) return {};
  try {
    return JSON.parse(row.data);
  } catch {
    return {};
  }
};

const writeGlobalConfig = async (data: Record<string, any>) => {
  await prisma.siteConfig.upsert({
    where: { id: "global" },
    create: { id: "global", data: JSON.stringify(data), updatedAt: new Date() },
    update: { data: JSON.stringify(data), updatedAt: new Date() },
  });
};

const loadCoupons = async (): Promise<Record<string, any>> => {
  const data = await readGlobalConfig();
  if (!data.coupons) {
    const coupons = { ...LEGACY_COUPONS };
    data.coupons = coupons;
    await writeGlobalConfig(data);
    return coupons;
  }
  return data.coupons;
};

app.get("/api/coupons", async (req, res) => {
  try {
    const coupons = await loadCoupons();
    res.json(Object.values(coupons));
  } catch (e: any) {
    handleError(res, e, "GET /api/coupons");
  }
});

app.post("/api/coupons", async (req, res) => {
  try {
    const parsed = couponSchema.parse(req.body);
    const code = parsed.code.toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(code)) {
      return res.status(400).json({ error: "Code must be 2-40 characters (A-Z, 0-9, -, _)" });
    }
    const coupons = await loadCoupons();
    if (coupons[code]) return res.status(409).json({ error: `Coupon code ${code} already exists` });
    const coupon = {
      id: "c_" + Date.now().toString(36),
      code,
      label: parsed.label || (parsed.type === "Percentage" ? `${parsed.value}% off` : `₹${parsed.value} off`),
      type: parsed.type,
      value: parsed.value,
      percent: parsed.type === "Percentage" ? parsed.value : 0,
      minOrderValue: parsed.minOrderValue ?? 0,
      expiryDate: parsed.expiryDate || "",
      usageLimit: parsed.usageLimit ?? 0,
      timesUsed: 0,
      status: parsed.status ?? "Active",
    };
    coupons[code] = coupon;
    const data = await readGlobalConfig();
    data.coupons = coupons;
    await writeGlobalConfig(data);
    await prisma.audit_logs.create({
      data: { admin_id: (req as any).userId ?? null, action: "create_coupon", details: { module: "Marketing", code }, ip_address: clientIp(req) },
    });
    res.status(201).json(coupon);
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues[0]?.message || "Invalid input" });
    handleError(res, e, "POST /api/coupons");
  }
});

app.patch("/api/coupons/:code", async (req, res) => {
  try {
    const code = String(req.params.code || "").toUpperCase();
    const parsed = couponPatchSchema.parse(req.body);
    const coupons = await loadCoupons();
    const existing = coupons[code];
    if (!existing) return res.status(404).json({ error: "Coupon not found" });
    if (parsed.type != null) existing.type = parsed.type;
    if (parsed.value != null) existing.value = parsed.value;
    existing.percent = existing.type === "Percentage" ? Number(existing.value) || 0 : 0;
    if (parsed.label != null) existing.label = parsed.label;
    if (parsed.minOrderValue != null) existing.minOrderValue = parsed.minOrderValue;
    if (parsed.expiryDate !== undefined) existing.expiryDate = parsed.expiryDate || "";
    if (parsed.usageLimit !== undefined) existing.usageLimit = parsed.usageLimit ?? 0;
    if (parsed.status != null) existing.status = parsed.status;
    const data = await readGlobalConfig();
    data.coupons = coupons;
    await writeGlobalConfig(data);
    res.json(existing);
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues[0]?.message || "Invalid input" });
    handleError(res, e, "PATCH /api/coupons/:code");
  }
});

app.delete("/api/coupons/:code", async (req, res) => {
  try {
    const code = String(req.params.code || "").toUpperCase();
    const coupons = await loadCoupons();
    if (!coupons[code]) return res.status(404).json({ error: "Coupon not found" });
    delete coupons[code];
    const data = await readGlobalConfig();
    data.coupons = coupons;
    await writeGlobalConfig(data);
    res.json({ success: true });
  } catch (e: any) {
    handleError(res, e, "DELETE /api/coupons/:code");
  }
});

if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const isMain = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain && !process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;
