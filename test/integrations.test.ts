import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../server";
import prisma from "../lib/prisma";
import { hashPassword } from "../lib/auth";

const SUPER_EMAIL = "int-super@example.com";
const EDITOR_EMAIL = "int-editor@example.com";
let superCookie = "";
let editorCookie = "";
let originalRow: any = null;

async function readRow() {
  return prisma.siteConfig.findUnique({ where: { id: "integrations" } });
}

beforeAll(async () => {
  await prisma.admins.deleteMany({ where: { email: { in: [SUPER_EMAIL, EDITOR_EMAIL] } } });
  await prisma.admins.create({
    data: { email: SUPER_EMAIL, password_hash: hashPassword("superpass123"), role: "super_admin", totp_enabled: false },
  });
  await prisma.admins.create({
    data: { email: EDITOR_EMAIL, password_hash: hashPassword("editorpass123"), role: "editor", totp_enabled: false },
  });
  const login = await request(app)
    .post("/api/auth/password-login")
    .send({ email: SUPER_EMAIL, password: "superpass123" });
  superCookie = (login.headers["set-cookie"] as unknown as string[])?.[0]?.split(";")[0] || "";
  const editorLogin = await request(app)
    .post("/api/auth/password-login")
    .send({ email: EDITOR_EMAIL, password: "editorpass123" });
  editorCookie = (editorLogin.headers["set-cookie"] as unknown as string[])?.[0]?.split(";")[0] || "";

  const existing = await readRow();
  originalRow = existing ? { data: existing.data, updatedAt: existing.updatedAt } : null;
});

afterAll(async () => {
  await prisma.admins.deleteMany({ where: { email: { in: [SUPER_EMAIL, EDITOR_EMAIL] } } });
  if (originalRow) {
    await prisma.siteConfig.upsert({
      where: { id: "integrations" },
      create: { id: "integrations", data: originalRow.data, updatedAt: originalRow.updatedAt },
      update: { data: originalRow.data, updatedAt: originalRow.updatedAt },
    });
  } else {
    await prisma.siteConfig.deleteMany({ where: { id: "integrations" } });
  }
  await prisma.$disconnect();
});

describe("integrations", () => {
  it("lists registered services (cashfree, tagembed) off by default", async () => {
    const res = await request(app).get("/api/integrations").set("Cookie", superCookie);
    expect(res.status).toBe(200);
    const ids = res.body.map((i: any) => i.id);
    expect(ids).toContain("cashfree");
    expect(ids).toContain("tagembed");
    expect(res.body.every((i: any) => i.enabled === false && i.status === "disconnected")).toBe(true);
    expect(res.body.every((i: any) => i.developerNote)).toBe(true);
  });

  it("blocks non-super-admin roles and anonymous access", async () => {
    const anon = await request(app).get("/api/integrations");
    expect(anon.status).toBe(401);
    const editor = await request(app).get("/api/integrations").set("Cookie", editorCookie);
    expect(editor.status).toBe(403);
  });

  it("turns a service on and persists it", async () => {
    const res = await request(app)
      .patch("/api/integrations/cashfree")
      .set("Cookie", superCookie)
      .send({ enabled: true });
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(true);
    expect(res.body.status).toBe("connected");

    const row = await readRow();
    const stored = JSON.parse(row!.data).integrations.cashfree;
    expect(stored.enabled).toBe(true);
  });

  it("turns a service off again", async () => {
    const res = await request(app)
      .patch("/api/integrations/tagembed")
      .set("Cookie", superCookie)
      .send({ enabled: false });
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(false);
    expect(res.body.status).toBe("disconnected");
  });

  it("rejects payloads with credential fields (admin only toggles on/off)", async () => {
    const res = await request(app)
      .patch("/api/integrations/cashfree")
      .set("Cookie", superCookie)
      .send({ enabled: true, fields: { clientSecret: "sk_test_123" } });
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown services", async () => {
    const res = await request(app).patch("/api/integrations/nonexistent").set("Cookie", superCookie).send({ enabled: true });
    expect(res.status).toBe(404);
  });
});
