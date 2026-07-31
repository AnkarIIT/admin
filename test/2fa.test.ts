import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { generateSync } from "otplib";
import app from "../server";
import prisma from "../lib/prisma";
import { hashRecoveryCodes, RECOVERY_CODE_COUNT } from "../lib/auth";

const SETUP_EMAIL = "totp-setup-test@example.com";
const TEST_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
const REC_CODE = "ABCD-EFGH-IJKL";

let testAdminId = "";
let activeSecret = TEST_SECRET;

function codeFor(secret: string) {
  return generateSync({ secret });
}

function status(email: string = SETUP_EMAIL) {
  return request(app).get(`/api/auth/totp-status?email=${encodeURIComponent(email)}`);
}

beforeAll(async () => {
  await prisma.admins.deleteMany({ where: { email: SETUP_EMAIL } });
  const admin = await prisma.admins.create({
    data: { email: SETUP_EMAIL, password_hash: "unused", role: "admin", totp_enabled: false },
  });
  testAdminId = admin.id;
});

afterAll(async () => {
  if (testAdminId) {
    await prisma.audit_logs.deleteMany({ where: { admin_id: testAdminId } });
    await prisma.admins.delete({ where: { id: testAdminId } }).catch(() => {});
  }
  await prisma.$disconnect();
});

describe("TOTP setup flow", () => {
  it("reports disabled before setup", async () => {
    const res = await status();
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(false);
  });

  it("starts setup with a secret and QR code", async () => {
    const res = await request(app).post("/api/auth/totp-setup").send({ email: SETUP_EMAIL });
    expect(res.status).toBe(200);
    expect(typeof res.body.secret).toBe("string");
    expect(res.body.secret.length).toBeGreaterThan(10);
    expect(res.body.uri).toContain("otpauth://");
    expect(res.body.qr).toMatch(/^data:image\/png;base64,/);
    activeSecret = res.body.secret;
  });

  it("rejects confirm with a wrong code", async () => {
    const res = await request(app).post("/api/auth/totp-confirm").send({ email: SETUP_EMAIL, code: "000000" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid authentication code");
  });

  it("confirms setup, enables TOTP and returns recovery codes", async () => {
    const res = await request(app).post("/api/auth/totp-confirm").send({ email: SETUP_EMAIL, code: codeFor(activeSecret) });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.totpEnabled).toBe(true);
    expect(Array.isArray(res.body.recoveryCodes)).toBe(true);
    expect(res.body.recoveryCodes.length).toBe(RECOVERY_CODE_COUNT);
    expect(res.headers["set-cookie"]).toBeDefined();
    for (const rc of res.body.recoveryCodes) {
      expect(rc).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    }

    const afterStatus = await status();
    expect(afterStatus.body.enabled).toBe(true);
  });

  it("blocks a second setup once enabled", async () => {
    const res = await request(app).post("/api/auth/totp-setup").send({ email: SETUP_EMAIL });
    expect(res.status).toBe(409);
  });

  it("logs in with the TOTP code after setup", async () => {
    const res = await request(app).post("/api/auth/totp-login").send({ email: SETUP_EMAIL, code: codeFor(activeSecret) });
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
    expect(res.headers["set-cookie"]).toBeDefined();
  });
});

describe("recovery codes", () => {
  it("logs in with a recovery code and consumes it", async () => {
    await prisma.admins.update({
      where: { id: testAdminId },
      data: { recovery_codes_hash: await hashRecoveryCodes([REC_CODE]) },
    });

    const res = await request(app).post("/api/auth/totp-login").send({ email: SETUP_EMAIL, code: REC_CODE });
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);

    const admin = await prisma.admins.findUnique({ where: { id: testAdminId } });
    const remaining = JSON.parse(admin!.recovery_codes_hash as string);
    expect(remaining.length).toBe(0);
  });

  it("does not accept an already-used recovery code", async () => {
    const res = await request(app).post("/api/auth/totp-login").send({ email: SETUP_EMAIL, code: REC_CODE });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid authentication code");
  });

  it("is lenient about formatting and case", async () => {
    await prisma.admins.update({
      where: { id: testAdminId },
      data: { recovery_codes_hash: await hashRecoveryCodes([REC_CODE]) },
    });

    const res = await request(app).post("/api/auth/totp-login").send({ email: SETUP_EMAIL, code: "abcd-efgh ijkl" });
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
  });
});
