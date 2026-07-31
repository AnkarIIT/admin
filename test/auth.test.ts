import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../server";

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "admin123";

export function loginCookie(): Promise<string> {
  return request(app)
    .post("/api/auth/login")
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    .then((res) => {
      expect(res.status).toBe(200);
      const cookies = (res.headers["set-cookie"] as unknown as string[]) || [];
      return cookies[0].split(";")[0];
    });
}

describe("auth", () => {
  it("rejects login with wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });

  it("rejects login with unknown email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "whatever" });
    expect(res.status).toBe(401);
  });

  it("rejects login with missing fields", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL });
    expect(res.status).toBe(400);
  });

  it("logs in and sets a session cookie", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
    expect(res.body.user.email).toBe(ADMIN_EMAIL);
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("serves data routes without a session", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
  });

  it("returns the current user via /api/auth/me", async () => {
    const cookie = await loginCookie();
    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
    expect(res.body.user.email).toBe(ADMIN_EMAIL);
  });

  it("invalidates the session on logout", async () => {
    const cookie = await loginCookie();
    const logout = await request(app).post("/api/auth/logout").set("Cookie", cookie);
    expect(logout.status).toBe(200);
    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(401);
  });
});
