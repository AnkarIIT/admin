import { expect } from "vitest";
import request from "supertest";
import { generateSync } from "otplib";
import app from "../server";
import prisma from "../lib/prisma";

export const TOTP_TEST_EMAIL = "totp-test@example.com";
export const TOTP_TEST_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";

export function totpCode(secret: string = TOTP_TEST_SECRET): string {
  return generateSync({ secret });
}

export async function ensureTestAdmin(): Promise<string> {
  const admin = await prisma.admins.upsert({
    where: { email: TOTP_TEST_EMAIL },
    update: { totp_secret: TOTP_TEST_SECRET, totp_enabled: true },
    create: {
      email: TOTP_TEST_EMAIL,
      password_hash: "unused",
      role: "admin",
      totp_secret: TOTP_TEST_SECRET,
      totp_enabled: true,
    },
  });
  return admin.id;
}

export function loginCookie(): Promise<string> {
  return ensureTestAdmin()
    .then(() =>
      request(app)
        .post("/api/auth/totp-login")
        .send({ email: TOTP_TEST_EMAIL, code: totpCode() })
    )
    .then((res) => {
      expect(res.status).toBe(200);
      const cookies = (res.headers["set-cookie"] as unknown as string[]) || [];
      return cookies[0].split(";")[0];
    });
}
