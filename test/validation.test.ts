import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../server";
import prisma from "../lib/prisma";
import { loginCookie } from "./testHelpers";

let cookie = "";
let createdProductId = "";

beforeAll(async () => {
  cookie = await loginCookie();
});

afterAll(async () => {
  if (createdProductId) {
    await prisma.product.delete({ where: { id: createdProductId } }).catch(() => {});
  }
  await prisma.audit_logs.deleteMany({ where: { action: "test_log" } });
  await prisma.$disconnect();
});

describe("zod validation", () => {
  it("rejects product create without name", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Cookie", cookie)
      .send({ price: 100 });
    expect(res.status).toBe(400);
  });

  it("rejects product create with invalid price", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Cookie", cookie)
      .send({ name: "Bad Price", price: "not-a-number" });
    expect(res.status).toBe(400);
  });

  it("rejects product create with negative price", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Cookie", cookie)
      .send({ name: "Negative", price: -5 });
    expect(res.status).toBe(400);
  });

  it("creates a valid product and returns 201", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Cookie", cookie)
      .send({ name: "Vitest Product", price: 1234, category: "TOYS" });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Vitest Product");
    expect(res.body.base_price).toBe(1234);
    createdProductId = res.body.id;
  });

  it("rejects order update with invalid status", async () => {
    const res = await request(app)
      .patch("/api/orders/does-not-exist")
      .set("Cookie", cookie)
      .send({ status: "exploded" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for order update on missing order", async () => {
    const res = await request(app)
      .patch("/api/orders/does-not-exist")
      .set("Cookie", cookie)
      .send({ status: "shipped" });
    expect(res.status).toBe(404);
  });

  it("returns 404 for deleting a missing product", async () => {
    const res = await request(app).delete("/api/products/does-not-exist").set("Cookie", cookie);
    expect(res.status).toBe(404);
  });

  it("rejects activity log without action", async () => {
    const res = await request(app)
      .post("/api/activity-logs")
      .set("Cookie", cookie)
      .send({ module: "Test" });
    expect(res.status).toBe(400);
  });

  it("persists a valid activity log", async () => {
    const res = await request(app)
      .post("/api/activity-logs")
      .set("Cookie", cookie)
      .send({ action: "test_log", module: "Test" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("does not leak internal errors", async () => {
    const res = await request(app).patch("/api/products/x").set("Cookie", cookie).send({});
    expect(res.status).toBe(400);
  });
});
