import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { Client } from "pg";
import app from "../server";
import { loginCookie } from "./testHelpers";

const TEST_CODE = "TST" + Date.now().toString().slice(-6);

function db() {
  return new Client({ connectionString: process.env.DATABASE_URL });
}

async function globalCouponsFromDb() {
  const c = db();
  await c.connect();
  try {
    const r = await c.query(`SELECT data FROM "SiteConfig" WHERE id = 'global'`);
    if (!r.rows.length) return {};
    return JSON.parse(r.rows[0].data).coupons || {};
  } finally {
    await c.end();
  }
}

describe("coupons", () => {
  afterAll(async () => {
    try {
      const cookie = await loginCookie();
      await request(app).delete(`/api/coupons/${TEST_CODE}`).set("Cookie", cookie);
    } catch {
      // cleanup best effort
    }
  });

  it("returns seeded legacy coupons after login", async () => {
    const cookie = await loginCookie();
    const res = await request(app).get("/api/coupons").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((c: any) => c.code === "SD_FIRST_10")).toBe(true);
  });

  it("blocks coupon routes without a session", async () => {
    const res = await request(app).get("/api/coupons");
    expect(res.status).toBe(401);
  });

  it("creates a coupon and persists it to the storefront's global row", async () => {
    const cookie = await loginCookie();
    const res = await request(app)
      .post("/api/coupons")
      .set("Cookie", cookie)
      .send({
        code: TEST_CODE,
        type: "Percentage",
        value: 25,
        minOrderValue: 999,
        usageLimit: 50,
      });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe(TEST_CODE);
    expect(res.body.status).toBe("Active");
    expect(res.body.timesUsed).toBe(0);

    const stored = await globalCouponsFromDb();
    expect(stored[TEST_CODE]).toBeDefined();
    expect(stored[TEST_CODE].value).toBe(25);
    expect(stored[TEST_CODE].minOrderValue).toBe(999);
    expect(stored[TEST_CODE].usageLimit).toBe(50);
    expect(stored[TEST_CODE].type).toBe("Percentage");
  });

  it("rejects duplicate coupon codes", async () => {
    const cookie = await loginCookie();
    const res = await request(app)
      .post("/api/coupons")
      .set("Cookie", cookie)
      .send({ code: TEST_CODE, type: "Percentage", value: 10 });
    expect(res.status).toBe(409);
  });

  it("validates coupon input", async () => {
    const cookie = await loginCookie();
    const res = await request(app)
      .post("/api/coupons")
      .set("Cookie", cookie)
      .send({ code: "bad code!", type: "Percentage", value: 0 });
    expect(res.status).toBe(400);
  });

  it("toggles a coupon inactive", async () => {
    const cookie = await loginCookie();
    const res = await request(app)
      .patch(`/api/coupons/${TEST_CODE}`)
      .set("Cookie", cookie)
      .send({ status: "Inactive" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Inactive");

    const stored = await globalCouponsFromDb();
    expect(stored[TEST_CODE].status).toBe("Inactive");
  });

  it("deletes a coupon", async () => {
    const cookie = await loginCookie();
    const res = await request(app).delete(`/api/coupons/${TEST_CODE}`).set("Cookie", cookie);
    expect(res.status).toBe(200);
    const stored = await globalCouponsFromDb();
    expect(stored[TEST_CODE]).toBeUndefined();
  });
});
