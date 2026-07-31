import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { generateSync } from "otplib";
import bcrypt from "bcryptjs";
import app from "../server";
import prisma from "../lib/prisma";
import { hashRecoveryCodes, RECOVERY_CODE_COUNT } from "../lib/auth";

const TEST_EMAIL = "2fa-test@example.com";
const TEST_PASSWORD = "test-pass-123";
const TEST_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
const REC_CODE = "ABCD-EFGH-IJKL";

let testAdminId = "";

async function login() {
  const res = await request(app).post("/api/auth/login").send({ email: TEST_EMAIL, password: TEST_PASSWORD });
  expect(res.status).toBe(200);
  expect(res.body.twoFactorRequired).toBe(true);
  expect(typeof res.body.pendingToken).toBe("string");
  return res.body.pendingToken as string;
}

async function verify(pendingToken: string, code: string) {
  return request(app).post("/api/auth/verify-2fa").send({ pendingToken, code });
}

function totp() {
  return generateSync({ secret: TEST_SECRET });
}

beforeAll(async () => {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const admin = await prisma.admins.create({
    data: { email: TEST_EMAIL, password_hash: passwordHash, role: "admin", totp_secret: TEST_SECRET, totp_enabled: true },
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

describe("2FA login flow", () => {
  it("requires a second step when 2FA is enabled", async () => {
    const token = await login();
    expect(token.length).toBeGreaterThan(20);
  });

  it("completes login with a valid TOTP code and sets a session", async () => {
    const pendingToken = await login();
    const res = await verify(pendingToken, totp());
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
    expect(res.body.user.totpEnabled).toBe(true);
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("rejects a wrong code but keeps the pending login usable", async () => {
    const pendingToken = await login();
    const bad = await verify(pendingToken, "000000");
    expect(bad.status).toBe(401);
    expect(bad.body.error).toBe("Invalid authentication code");

    const good = await verify(pendingToken, totp());
    expect(good.status).toBe(200);
    expect(good.body.authenticated).toBe(true);
  });

  it("rate-limits verify-2fa after 5 failed attempts", async () => {
    const pendingToken = await login();
    let lastStatus = 0;
    for (let i = 0; i < 5; i++) {
      const res = await verify(pendingToken, "111111");
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(401);
    const blocked = await verify(pendingToken, "222222");
    expect(blocked.status).toBe(429);
  });

  it("rejects a missing or expired pending token", async () => {
    const res = await verify("not-a-real-token", totp());
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expired|invalid/i);
  });
});

describe("recovery codes", () => {
  it("logs in with a recovery code and consumes it", async () => {
    await prisma.admins.update({
      where: { email: TEST_EMAIL },
      data: { recovery_codes_hash: await hashRecoveryCodes([REC_CODE]) },
    });

    const pendingToken = await login();
    const res = await verify(pendingToken, REC_CODE);
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);

    const admin = await prisma.admins.findUnique({ where: { email: TEST_EMAIL } });
    expect(admin?.recovery_codes_hash).toBeDefined();
    const remaining = JSON.parse(admin!.recovery_codes_hash as string);
    expect(remaining.length).toBe(0);
  });

  it("does not accept an already-used recovery code", async () => {
    const pendingToken = await login();
    const res = await verify(pendingToken, REC_CODE);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid authentication code");
  });

  it("is lenient about formatting and case", async () => {
    await prisma.admins.update({
      where: { email: TEST_EMAIL },
      data: { recovery_codes_hash: await hashRecoveryCodes([REC_CODE]) },
    });

    const pendingToken = await login();
    const res = await verify(pendingToken, "abcd-efgh ijkl");
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
  });
});

describe("2FA setup", () => {
  it("issues 10 recovery codes on confirm and they work at login", async () => {
    const pendingToken = await login();
    const step2 = await verify(pendingToken, totp());
    const cookie = (step2.headers["set-cookie"] as unknown as string[])[0].split(";")[0];

    const confirm = await request(app)
      .post("/api/auth/confirm-2fa")
      .set("Cookie", cookie)
      .send({ code: totp() });
    expect(confirm.status).toBe(200);
    expect(confirm.body.success).toBe(true);
    expect(Array.isArray(confirm.body.recoveryCodes)).toBe(true);
    expect(confirm.body.recoveryCodes.length).toBe(RECOVERY_CODE_COUNT);
    for (const rc of confirm.body.recoveryCodes) {
      expect(rc).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    }

    const admin = await prisma.admins.findUnique({ where: { email: TEST_EMAIL } });
    expect(JSON.parse(admin!.recovery_codes_hash as string).length).toBe(RECOVERY_CODE_COUNT);

    const secondPending = await login();
    const recovered = await verify(secondPending, confirm.body.recoveryCodes[0]);
    expect(recovered.status).toBe(200);
    expect(recovered.body.authenticated).toBe(true);

    const afterUse = await prisma.admins.findUnique({ where: { email: TEST_EMAIL } });
    expect(JSON.parse(afterUse!.recovery_codes_hash as string).length).toBe(RECOVERY_CODE_COUNT - 1);
  });

  it("clears recovery codes when 2FA is disabled", async () => {
    const pendingToken = await login();
    const step2 = await verify(pendingToken, totp());
    const cookie = (step2.headers["set-cookie"] as unknown as string[])[0].split(";")[0];

    const disable = await request(app)
      .post("/api/auth/disable-2fa")
      .set("Cookie", cookie)
      .send({ code: totp() });
    expect(disable.status).toBe(200);
    expect(disable.body.user.totpEnabled).toBe(false);

    const admin = await prisma.admins.findUnique({ where: { email: TEST_EMAIL } });
    expect(admin?.totp_enabled).toBe(false);
    expect(admin?.recovery_codes_hash).toBeNull();
  });
});
