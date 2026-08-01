import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../server";
import prisma from "../lib/prisma";
import {
  TOTP_TEST_EMAIL,
  TOTP_TEST_SECRET,
  totpCode,
  ensureTestAdmin,
  loginCookie,
} from "./testHelpers";

describe("auth", () => {
  it("rejects login with a wrong code", async () => {
    await ensureTestAdmin();
    const res = await request(app)
      .post("/api/auth/totp-login")
      .send({ email: TOTP_TEST_EMAIL, code: "000000" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid authentication code");
  });

  it("rejects login with a missing code", async () => {
    const res = await request(app).post("/api/auth/totp-login").send({ email: TOTP_TEST_EMAIL });
    expect(res.status).toBe(400);
  });

  it("rejects login when TOTP is not enabled", async () => {
    const disabledEmail = "totp-disabled-test@example.com";
    await prisma.admins.upsert({
      where: { email: disabledEmail },
      update: { totp_enabled: false },
      create: {
        email: disabledEmail,
        password_hash: "unused",
        role: "admin",
        totp_enabled: false,
      }
    });
    const res = await request(app).post("/api/auth/totp-login").send({ email: disabledEmail, code: totpCode() });
    expect(res.status).toBe(401);
  });

  it("logs in with a valid TOTP code and sets a session cookie", async () => {
    const cookie = await loginCookie();
    expect(cookie).toMatch(/^admin_session=/);
  });

  it("blocks data routes without a session", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Not authenticated");
  });

  it("returns the current user via /api/auth/me", async () => {
    const cookie = await loginCookie();
    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
    expect(res.body.user.email).toBe(TOTP_TEST_EMAIL);
  });

  it("invalidates the session on logout", async () => {
    const cookie = await loginCookie();
    const logout = await request(app).post("/api/auth/logout").set("Cookie", cookie);
    expect(logout.status).toBe(200);
    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(401);
  });

  it("rejects password login with missing email or password", async () => {
    const res1 = await request(app).post("/api/auth/password-login").send({ password: "somepassword" });
    expect(res1.status).toBe(400);

    const res2 = await request(app).post("/api/auth/password-login").send({ email: "admin@example.com" });
    expect(res2.status).toBe(400);
  });

  it("rejects password login with incorrect password", async () => {
    const res = await request(app).post("/api/auth/password-login").send({ email: "admin@example.com", password: "wrongpassword" });
    expect(res.status).toBe(401);
  });

  it("dynamically seeds and logs in with admin@example.com and password admin123", async () => {
    // Delete admin@example.com first if it exists to test dynamic seeding
    const existing = await prisma.admins.findUnique({ where: { email: "admin@example.com" } });
    if (existing) {
      try {
        await prisma.audit_logs.deleteMany({ where: { admin_id: existing.id } });
        await prisma.admins.delete({ where: { id: existing.id } });
      } catch {
        // Safe to ignore if another concurrent test run deleted it first
      }
    }

    const res = await request(app).post("/api/auth/password-login").send({ email: "admin@example.com", password: "admin123" });
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
    expect(res.body.user.email).toBe("admin@example.com");

    const cookies = (res.headers["set-cookie"] as unknown as string[]) || [];
    expect(cookies[0]).toMatch(/^admin_session=/);
  });
});
