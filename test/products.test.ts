import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../server";
import prisma from "../lib/prisma";
import { hashPassword } from "../lib/auth";

const SUPER_EMAIL = "prod-super@example.com";
let superCookie = "";
let createdIds: string[] = [];

beforeAll(async () => {
  await prisma.admins.deleteMany({ where: { email: SUPER_EMAIL } });
  await prisma.admins.create({
    data: { email: SUPER_EMAIL, password_hash: hashPassword("superpass123"), role: "super_admin", totp_enabled: false },
  });
  const login = await request(app)
    .post("/api/auth/password-login")
    .send({ email: SUPER_EMAIL, password: "superpass123" });
  superCookie = (login.headers["set-cookie"] as unknown as string[])?.[0]?.split(";")[0] || "";
});

afterAll(async () => {
  await prisma.product.deleteMany({ where: { id: { in: createdIds } } });
  await prisma.admins.deleteMany({ where: { email: SUPER_EMAIL } });
  await prisma.$disconnect();
});

describe("product specifications", () => {
  const uniq = Date.now().toString().slice(-6);

  it("persists specifications when creating a product", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Cookie", superCookie)
      .send({
        name: `Spec Test ${uniq}`,
        price: 499,
        stock: 5,
        specifications: {
          material: "PETG",
          dimensions: "25x18x10cm",
          printTime: "8 hours",
          infill: "30%",
          layerHeight: "0.3mm",
          supportRequired: true,
          productionTime: "Ships within 7-10 days",
          durabilityRating: "heavy-use",
          madeToOrder: true,
        },
      });
    expect(res.status).toBe(201);
    expect(res.body.specifications.material).toBe("PETG");
    expect(res.body.specifications.productionTime).toBe("Ships within 7-10 days");
    createdIds.push(res.body.id);

    const row = await prisma.product.findUnique({ where: { id: res.body.id } });
    const stored = row!.specifications as any;
    expect(stored.material).toBe("PETG");
    expect(stored.durabilityRating).toBe("heavy-use");
    expect(stored.supportRequired).toBe(true);
  });

  it("updates specifications via PATCH without touching other fields", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Cookie", superCookie)
      .send({ name: `Spec Patch ${uniq}`, price: 299, specifications: { material: "PLA", madeToOrder: true } });
    expect(res.status).toBe(201);
    const id = res.body.id;
    createdIds.push(id);

    const patched = await request(app)
      .patch(`/api/products/${id}`)
      .set("Cookie", superCookie)
      .send({
        price: 349,
        specifications: { ...res.body.specifications, material: "PLA+", productionTime: "Ships within 3-5 days" },
      });
    expect(patched.status).toBe(200);
    expect(Number(patched.body.base_price)).toBe(349);
    expect(patched.body.specifications.material).toBe("PLA+");
    expect(patched.body.specifications.productionTime).toBe("Ships within 3-5 days");
  });

  it("keeps specifications when patching only price (no specs in body)", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Cookie", superCookie)
      .send({ name: `Spec Keep ${uniq}`, price: 199, specifications: { material: "ABS", infill: "40%" } });
    expect(res.status).toBe(201);
    const id = res.body.id;
    createdIds.push(id);

    const patched = await request(app).patch(`/api/products/${id}`).set("Cookie", superCookie).send({ stock: 9 });
    expect(patched.status).toBe(200);
    expect(patched.body.specifications.material).toBe("ABS");
    expect(patched.body.specifications.infill).toBe("40%");
  });

  it("blocks product writes without a session", async () => {
    const res = await request(app)
      .post("/api/products")
      .send({ name: `No Auth ${uniq}`, price: 10 });
    expect(res.status).toBe(401);
  });
});
