import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import { generateSecret, generateURI, verify as verifyTotpCode } from "otplib";
import qrcode from "qrcode";
import bcrypt from "bcryptjs";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  totpEnabled: boolean;
}

interface Session {
  userId: string;
  expiresAt: number;
}

const SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 30 * 60 * 1000;
const PENDING_TTL_MS = 5 * 60 * 1000;

const sessions = new Map<string, Session>();
const pendingLogins = new Map<string, { userId: string; expiresAt: number }>();
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const verifyAttempts = new Map<string, { count: number; resetAt: number }>();

const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const VERIFY_MAX_ATTEMPTS = 5;
const VERIFY_WINDOW_MS = 15 * 60 * 1000;

export const RECOVERY_CODE_COUNT = 10;
const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRecoveryCodes(count: number = RECOVERY_CODE_COUNT): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(12);
    let s = "";
    for (const b of raw) s += RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length];
    codes.push(`${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`);
  }
  return codes;
}

export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function hashRecoveryCodes(codes: string[]): Promise<string> {
  const hashes = await Promise.all(codes.map((c) => bcrypt.hash(normalizeRecoveryCode(c), 10)));
  return JSON.stringify(hashes);
}

export async function consumeRecoveryCode(
  code: string,
  hashJson: string | null | undefined
): Promise<{ ok: boolean; nextHashJson: string | null }> {
  if (!hashJson) return { ok: false, nextHashJson: null };
  let hashes: unknown[];
  try {
    hashes = JSON.parse(hashJson);
  } catch {
    return { ok: false, nextHashJson: null };
  }
  if (!Array.isArray(hashes) || hashes.length === 0) return { ok: false, nextHashJson: null };
  const normalized = normalizeRecoveryCode(code);
  for (let i = 0; i < hashes.length; i++) {
    if (typeof hashes[i] === "string" && (await bcrypt.compare(normalized, hashes[i] as string))) {
      hashes.splice(i, 1);
      return { ok: true, nextHashJson: JSON.stringify(hashes) };
    }
  }
  return { ok: false, nextHashJson: null };
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie || "";
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

export function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { userId, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

export function destroySession(token: string) {
  sessions.delete(token);
}

export function getSessionUser(token: string | undefined): Session | null {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return session;
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > LOGIN_MAX_ATTEMPTS;
}

function clearRateLimit(ip: string) {
  loginAttempts.delete(ip);
}

export function pendingLoginToken(userId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  pendingLogins.set(token, { userId, expiresAt: Date.now() + PENDING_TTL_MS });
  return token;
}

export function consumePendingLogin(token: string): string | null {
  const entry = pendingLogins.get(token);
  if (!entry) return null;
  pendingLogins.delete(token);
  if (entry.expiresAt < Date.now()) return null;
  return entry.userId;
}

export function peekPendingLogin(token: string): string | null {
  const entry = pendingLogins.get(token);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    pendingLogins.delete(token);
    return null;
  }
  return entry.userId;
}

export function currentSession(req: Request): Session | null {
  return getSessionUser(parseCookies(req)[SESSION_COOKIE]);
}

export function sessionToken(req: Request): string | undefined {
  return parseCookies(req)[SESSION_COOKIE];
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = sessionToken(req);
  const session = currentSession(req);
  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (token) setSessionCookie(res, token);
  (req as any).userId = session.userId;
  (req as any).clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  next();
}

export function checkRateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many attempts. Try again later." });
  }
  (req as any).clientIp = ip;
  next();
}

export function clearLoginRateLimit(req: Request) {
  clearRateLimit((req as any).clientIp || req.socket.remoteAddress || "unknown");
}

const verifyKey = (ip: string, token: string) => `${ip}|${token}`;

export function isVerify2faRateLimited(ip: string, token: string): boolean {
  const entry = verifyAttempts.get(verifyKey(ip, token));
  if (!entry || entry.resetAt < Date.now()) return false;
  return entry.count >= VERIFY_MAX_ATTEMPTS;
}

export function recordVerify2faAttempt(ip: string, token: string) {
  const key = verifyKey(ip, token);
  const now = Date.now();
  const entry = verifyAttempts.get(key);
  if (!entry || entry.resetAt < now) {
    verifyAttempts.set(key, { count: 1, resetAt: now + VERIFY_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

export function clearVerify2faRateLimit(ip: string, token: string) {
  verifyAttempts.delete(verifyKey(ip, token));
}

export function setSessionCookie(res: Response, token: string) {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );
}

export function clearSessionCookie(res: Response) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export function publicUser(admin: {
  id: string;
  email: string;
  role: string;
  totp_enabled: boolean;
}): AuthUser {
  return {
    id: admin.id,
    email: admin.email,
    name: admin.email.split("@")[0],
    role: admin.role,
    totpEnabled: admin.totp_enabled,
  };
}

export async function verifyTotp(token: string, secret: string): Promise<boolean> {
  try {
    const result = await verifyTotpCode({ token, secret, epochTolerance: 30 });
    return result.valid === true;
  } catch {
    return false;
  }
}

export function generateTotpSecret(): string {
  return generateSecret();
}

export function totpKeyUri(email: string, secret: string): string {
  return generateURI({ issuer: "3D By SD Admin", label: email, secret });
}

export async function totpQrDataUrl(uri: string): Promise<string> {
  return qrcode.toDataURL(uri);
}
