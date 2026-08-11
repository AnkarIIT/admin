import express from "express";
import path from "path";
import { pathToFileURL } from "url";
import crypto from "crypto";
import dotenv from "dotenv";
import helmet from "helmet";
import { z } from "zod";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import prisma from "./lib/prisma";
import {
  INTEGRATION_REGISTRY,
  buildPublicIntegration,
  readIntegrationsStore,
  writeIntegrationsStore,
} from "./lib/integrations";
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
  clearCsrfCookie,
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
  verifyPassword,
  hashPassword,
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

app.use(express.raw({ type: 'application/octet-stream', limit: "500mb" }));
app.use(express.json({ limit: "500mb" }));

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

// Normalize a stored role string ("Store Manager", "super_admin", "customer support") to a key.
const roleKey = (r: string) => r.trim().toLowerCase().replace(/[\s_-]+/g, "_");

// Restrict sensitive operations to the Super Admin role only.
async function requireSuperAdmin(req: express.Request, res: express.Response): Promise<boolean> {
  const userId = (req as any).userId;
  if (!userId) {
    res.status(403).json({ error: "RESTRICTED: Only super_admin can access these settings" });
    return false;
  }
  const admin = await prisma.admins.findUnique({ where: { id: userId } });
  if (!admin || roleKey(admin.role) !== "super_admin") {
    res.status(403).json({ error: "RESTRICTED: Only super_admin can access these settings" });
    return false;
  }
  return true;
}

async function resolveAdmin(email?: unknown) {
  if (email && typeof email === "string" && email.trim()) {
    return prisma.admins.findUnique({ where: { email: email.trim().toLowerCase() } });
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
    const force = !!(req.body || {}).force;
    if (admin.totp_enabled && !force) {
      return res.status(409).json({ error: "TOTP is already enabled" });
    }
    // Always generate a new secret for TOTP setup (whether force is true or not)
    const secret = generateTotpSecret();
    await prisma.admins.update({
      where: { id: admin.id },
      data: { totp_secret: secret, totp_enabled: false, recovery_codes_hash: null },
    });
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

app.post("/api/auth/password-login", checkRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ error: "Email address is required" });
    }
    if (!password || typeof password !== "string" || !password.trim()) {
      return res.status(400).json({ error: "Password is required" });
    }

    const emailClean = email.trim().toLowerCase();

    // Convenience dev seed (never auto-create in production).
    // In production the super admin must be provisioned explicitly.
    let admin = await prisma.admins.findUnique({ where: { email: emailClean } });
    if (!admin && emailClean === "admin@example.com" && process.env.NODE_ENV !== "production") {
      try {
        admin = await prisma.admins.create({
          data: {
            email: "admin@example.com",
            password_hash: hashPassword("admin123"),
            role: "super_admin",
            totp_enabled: false,
          },
        });
      } catch {
        admin = await prisma.admins.findUnique({ where: { email: emailClean } });
      }
    }

    if (!admin || !(await verifyPassword(password, admin.password_hash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    clearLoginRateLimit(req);
    await prisma.audit_logs.create({
      data: {
        admin_id: admin.id,
        action: "login_password_success",
        details: { module: "Auth" },
        ip_address: clientIp(req),
      },
    });

    const sess = await createSession(admin.id);
    setSessionCookie(res, sess.token);
    setCsrfCookie(res, sess.csrf);
    res.json({ authenticated: true, user: publicUser(admin) });
  } catch (e: any) {
    handleError(res, e, "POST /api/auth/password-login");
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
    handleError(res, e, "POST /api/auth/password-login");
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
    const csrf = crypto.randomBytes(16).toString("hex");
    setCsrfCookie(res, csrf);
    res.json({ authenticated: true, user: publicUser(admin) });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to load session" });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  await destroySession(sessionToken(req));
  clearSessionCookie(res);
  clearCsrfCookie(res);
  res.json({ success: true });
});

// ---- Database API Routes ----
// Apply CSRF protection before auth; API key bearer tokens are accepted and bypass CSRF checks.
app.use("/api", csrfProtection, requireAuth);

const num = (v: any) => (v == null ? null : Number(v));

const MAX_MEDIA_BYTES = 30 * 1024 * 1024;

// Media storage status + direct-to-storage upload (bypasses Vercel's 4.5MB function body limit).
// Requires BLOB_READ_WRITE_TOKEN from a Vercel Blob store; falls back to base64 data URLs in dev.
app.get("/api/media/status", async (req, res) => {
  res.json({ enabled: !!process.env.BLOB_READ_WRITE_TOKEN });
});

app.post("/api/media/upload", async (req, res) => {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(503).json({ error: "Media storage (BLOB_READ_WRITE_TOKEN) is not configured" });
    }
    const body = req.body as HandleUploadBody;
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const isImage = /\.(jpe?g|png|webp|gif|avif)$/i.test(pathname);
        const isVideo = /\.(mp4|webm|mov|m4v|ogv)$/i.test(pathname);
        if (!isImage && !isVideo) {
          throw new Error("Only images and videos are allowed");
        }
        return {
          allowedContentTypes: ["image/*", "video/*"],
          maximumSizeInBytes: MAX_MEDIA_BYTES,
          addRandomSuffix: true,
          allowOverwrite: false,
        };
      },
    });
    res.status(200).json(jsonResponse);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "Media upload failed" });
  }
});

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
  subcategory: z.string().trim().max(200).nullable().optional(),
  sku: z.string().trim().max(100).nullable().optional(),
  costPrice: priceSchema.nullable().optional(),
  stock: z.number().int().min(0).max(10_000_000).optional(),
  lowStockThreshold: z.number().int().min(0).max(10_000_000).optional(),
  status: z.enum(["Active", "Draft", "Archived", "Out of Stock"]).optional(),
  videoUrl: z.string().trim().max(1000).nullable().optional(),
  images: z.array(z.string()).max(20).optional(),
  tags: z.array(z.string().trim().max(50)).max(50).optional(),
  variants: z.array(z.any()).max(200).optional(),
  seo: z.record(z.string(), z.any()).optional(),
  specifications: z.any().optional(),
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
        cost_price: num(p.cost_price),
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
        discounted_price: null,
        is_on_sale: false,
        is_new: !!parsed.isNew,
        is_bestseller: !!parsed.isBestseller,
        subcategory: parsed.subcategory || null,
        sku: parsed.sku || null,
        cost_price: parsed.costPrice ?? null,
        stock: parsed.stock ?? 0,
        low_stock_threshold: parsed.lowStockThreshold ?? 0,
        status: parsed.status || "Active",
        video_url: parsed.videoUrl || null,
        images: parsed.images ?? [],
        tags: parsed.tags ?? [],
        variants: parsed.variants ?? [],
        seo: parsed.seo ?? {},
        specifications: parsed.specifications ?? {},
      },
    });
    res.status(201).json({ ...product, base_price: num(product.base_price), discounted_price: num(product.discounted_price), cost_price: num(product.cost_price) });
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
      data.is_on_sale = parsed.compareAtPrice != null;
    }
    if (parsed.isNew != null) data.is_new = parsed.isNew;
    if (parsed.isBestseller != null) data.is_bestseller = parsed.isBestseller;
    if (parsed.subcategory !== undefined) data.subcategory = parsed.subcategory;
    if (parsed.sku !== undefined) data.sku = parsed.sku;
    if (parsed.costPrice !== undefined) data.cost_price = parsed.costPrice;
    if (parsed.stock != null) data.stock = parsed.stock;
    if (parsed.lowStockThreshold != null) data.low_stock_threshold = parsed.lowStockThreshold;
    if (parsed.status != null) data.status = parsed.status;
    if (parsed.videoUrl !== undefined) data.video_url = parsed.videoUrl;
    if (parsed.images !== undefined) data.images = parsed.images;
    if (parsed.tags !== undefined) data.tags = parsed.tags;
    if (parsed.variants !== undefined) data.variants = parsed.variants;
    if (parsed.seo !== undefined) data.seo = parsed.seo;
    if (parsed.specifications !== undefined) data.specifications = parsed.specifications;
    const product = await prisma.product.update({ where: { id: req.params.id }, data });
    res.json({ ...product, base_price: num(product.base_price), discounted_price: num(product.discounted_price), cost_price: num(product.cost_price) });
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
            paymentId: payment?.id ?? existingDelivery!.paymentId,
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
    res.json({
      ...order,
      subtotal: num(order.subtotal),
      tax: num(order.tax),
      shipping: num(order.shipping),
      discount: num(order.discount),
      total: num(order.total),
    });
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
        name: a.name || a.email.split("@")[0],
        email: a.email,
        roleId: a.role,
        roleName: a.role,
        status: a.is_active === false ? "Inactive" : "Active",
        lastLogin: a.updated_at ? a.updated_at.toISOString() : "",
      }))
    );
  } catch (e: any) {
    handleError(res, e, "GET /api/staff");
  }
});

// Create a new staff member (admin account) with generated login credentials
app.post("/api/staff", async (req, res) => {
  try {
    if (!(await requireSuperAdmin(req, res))) return;
    const parsed = z
      .object({
        name: z.string().trim().min(1).max(100),
        email: z.string().trim().email().max(255),
        role: z.string().trim().min(1).max(50).optional(),
        password: z.string().min(6).max(128).optional(),
      })
      .parse(req.body);

    const email = parsed.email.toLowerCase();
    const role = parsed.role || "editor";
    const password = parsed.password || crypto.randomBytes(12).toString("base64url");

    const existing = await prisma.admins.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "A staff member with this email already exists." });
    }

    const admin = await prisma.admins.create({
      data: {
        email,
        password_hash: hashPassword(password),
        role,
        totp_enabled: false,
      },
    });

    await prisma.audit_logs.create({
      data: {
        admin_id: (req as any).userId ?? null,
        action: "staff_created",
        details: { module: "Staff", email, role },
        ip_address: clientIp(req),
      },
    });

    res.status(201).json({
      user: {
        id: admin.id,
        name: email.split("@")[0],
        email: admin.email,
        roleId: admin.role,
        roleName: admin.role,
        status: "Active",
        lastLogin: admin.updated_at ? admin.updated_at.toISOString() : "",
      },
      credentials: { email, password },
    });
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues[0]?.message || "Invalid input" });
    if (e.code === "P2002") return res.status(409).json({ error: "A staff member with this email already exists." });
    handleError(res, e, "POST /api/staff");
  }
});

// Update a staff member (name, email, role, password, active status, TOTP reset)
app.patch("/api/staff/:id", async (req, res) => {
  try {
    if (!(await requireSuperAdmin(req, res))) return;
    const parsed = z
      .object({
        name: z.string().trim().max(100).optional(),
        email: z.string().trim().email().max(255).optional(),
        role: z.string().trim().min(1).max(50).optional(),
        password: z.string().min(6).max(128).optional(),
        is_active: z.boolean().optional(),
        reset_totp: z.boolean().optional(),
      })
      .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" })
      .parse(req.body);

    const target = await prisma.admins.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: "Staff member not found" });

    if (parsed.role != null) {
      const self = (req as any).userId === target.id;
      const demotingSuper = roleKey(target.role) === "super_admin" && roleKey(parsed.role) !== "super_admin";
      if (self && demotingSuper) {
        return res.status(400).json({ error: "You cannot change your own super admin role." });
      }
      if (demotingSuper) {
        const superAdmins = await prisma.admins.count({ where: { role: { contains: "super_admin" } } });
        if (superAdmins <= 1) return res.status(400).json({ error: "At least one super admin is required." });
      }
    }

    const data: any = {};
    if (parsed.name != null) data.name = parsed.name;
    if (parsed.email != null) {
      const email = parsed.email.toLowerCase();
      const dup = await prisma.admins.findUnique({ where: { email } });
      if (dup && dup.id !== target.id) {
        return res.status(409).json({ error: "A staff member with this email already exists." });
      }
      data.email = email;
    }
    if (parsed.role != null) data.role = parsed.role;
    if (parsed.password != null) data.password_hash = hashPassword(parsed.password);
    if (parsed.is_active != null) data.is_active = parsed.is_active;
    if (parsed.reset_totp) {
      data.totp_secret = null;
      data.totp_enabled = false;
      data.recovery_codes_hash = null;
    }
    data.updated_at = new Date();

    const admin = await prisma.admins.update({ where: { id: target.id }, data });

    await prisma.audit_logs.create({
      data: { admin_id: (req as any).userId ?? null, action: "staff_updated", details: { module: "Staff", email: admin.email }, ip_address: clientIp(req) },
    });

    res.json({
      id: admin.id,
      name: admin.name || admin.email.split("@")[0],
      email: admin.email,
      roleId: admin.role,
      roleName: admin.role,
      status: admin.is_active === false ? "Inactive" : "Active",
      lastLogin: admin.updated_at ? admin.updated_at.toISOString() : "",
    });
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues[0]?.message || "Invalid input" });
    if (e.code === "P2025") return res.status(404).json({ error: "Staff member not found" });
    handleError(res, e, "PATCH /api/staff/:id");
  }
});

// Delete a staff member (admin account)
app.delete("/api/staff/:id", async (req, res) => {
  try {
    if (!(await requireSuperAdmin(req, res))) return;
    const target = await prisma.admins.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: "Staff member not found" });
    if ((req as any).userId === target.id) {
      return res.status(400).json({ error: "You cannot delete your own account." });
    }
    if (roleKey(target.role) === "super_admin") {
      const superAdmins = await prisma.admins.count({ where: { role: { contains: "super_admin" } } });
      if (superAdmins <= 1) return res.status(400).json({ error: "Cannot delete the last super admin." });
    }

    await prisma.$transaction(async (tx) => {
      await tx.audit_logs.deleteMany({ where: { admin_id: target.id } });
      await tx.adminSession.deleteMany({ where: { adminId: target.id } });
      await tx.pendingLogin.deleteMany({ where: { adminId: target.id } });
      await tx.admins.delete({ where: { id: target.id } });
    });

    res.json({ success: true });
  } catch (e: any) {
    if (e.code === "P2025") return res.status(404).json({ error: "Staff member not found" });
    handleError(res, e, "DELETE /api/staff/:id");
  }
});

// Activity logs (from audit_logs table)
app.get("/api/activity-logs", async (req, res) => {
  try {
    const [logs, admins] = await Promise.all([
      prisma.audit_logs.findMany({ orderBy: { created_at: "desc" }, take: 100 }),
      prisma.admins.findMany(),
    ]);
    const adminMap = new Map(admins.map((a) => [a.id, a.email]));
    res.json(
      logs.map((l) => ({
        id: l.id,
        user: l.admin_id ? (adminMap.get(l.admin_id) || l.admin_id) : "system",
        userEmail: l.admin_id ? (adminMap.get(l.admin_id) || l.admin_id) : "system",
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
    if (!(await requireSuperAdmin(req, res))) return;
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
  usageLimit: z.number().int().min(0).default(0),
  status: z.enum(["Active", "Inactive"]).default("Active"),
});

const couponPatchSchema = z
  .object({
    label: z.string().trim().max(100).optional(),
    type: z.enum(["Percentage", "Fixed Amount"]).optional(),
    value: z.number().positive().max(1_000_000).optional(),
    minOrderValue: z.number().min(0).max(100_000_000).optional(),
    expiryDate: z.string().trim().max(10).nullable().optional(),
    usageLimit: z.number().int().min(0).nullable().optional(),
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

// ---- Integrations (API services & gateways; super admin only) ----
// Admin can only enable/disable a service. Gateway wiring (API keys, webhooks)
// is owned by the developer via env vars / storefront code.
const integrationPatchSchema = z
  .object({
    enabled: z.boolean(),
  })
  .strict();

app.get("/api/integrations", async (req, res) => {
  try {
    if (!(await requireSuperAdmin(req, res))) return;
    const store = await readIntegrationsStore();
    res.json(INTEGRATION_REGISTRY.map((def) => buildPublicIntegration(def, store[def.id])));
  } catch (e: any) {
    handleError(res, e, "GET /api/integrations");
  }
});

app.patch("/api/integrations/:id", async (req, res) => {
  try {
    if (!(await requireSuperAdmin(req, res))) return;
    const def = INTEGRATION_REGISTRY.find((d) => d.id === req.params.id);
    if (!def) return res.status(404).json({ error: "Unknown integration" });
    const parsed = integrationPatchSchema.parse(req.body);

    const store = await readIntegrationsStore();
    const next = { enabled: parsed.enabled, updatedAt: new Date().toISOString() };
    store[def.id] = next;
    await writeIntegrationsStore(store);

    await prisma.audit_logs.create({
      data: {
        admin_id: (req as any).userId ?? null,
        action: "integration_toggled",
        details: { module: "Integrations", id: def.id, enabled: next.enabled },
        ip_address: clientIp(req),
      },
    });

    res.json(buildPublicIntegration(def, next));
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.issues[0]?.message || "Invalid input" });
    handleError(res, e, "PATCH /api/integrations/:id");
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
