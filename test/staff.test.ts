import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../server";
import prisma from "../lib/prisma";
import { hashPassword } from "../lib/auth";

const SUPER_EMAIL = "staff-super@example.com";
const STAFF_EMAIL = "staff-edit-test@example.com";
let superCookie = "";
let staffId = "";

beforeAll(async () => {
  await prisma.admins.deleteMany({ where: { email: { in: [SUPER_EMAIL, STAFF_EMAIL] } } });
  await prisma.admins.create({
    data: { email: SUPER_EMAIL, password_hash: hashPassword("superpass123"), role: "super_admin", totp_enabled: false },
  });
  const login = await request(app)
    .post("/api/auth/password-login")
    .send({ email: SUPER_EMAIL, password: "superpass123" });
  superCookie = (login.headers["set-cookie"] as unknown as string[])?.[0]?.split(";")[0] || "";
});

afterAll(async () => {
  await prisma.admins.deleteMany({ where: { email: { in: [SUPER_EMAIL, STAFF_EMAIL] } } });
  await prisma.$disconnect();
});

describe("staff management", () => {
  it("creates a staff member as super admin", async () => {
    const res = await request(app)
      .post("/api/staff")
      .set("Cookie", superCookie)
      .send({ name: "Staff Editor", email: STAFF_EMAIL, role: "Store Manager", password: "testpass123" });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(STAFF_EMAIL);
    staffId = res.body.user.id;
  });

  it("blocks staff creation without super admin role", async () => {
    const res = await request(app)
      .post("/api/staff")
      .send({ name: "Nope", email: "nope@example.com", role: "editor" });
    expect(res.status).toBe(401);
  });

  it("updates name, role, active status and password", async () => {
    const res = await request(app)
      .patch(`/api/staff/${staffId}`)
      .set("Cookie", superCookie)
      .send({ name: "Edited Name", role: "Fulfillment Specialist", is_active: false, password: "newpass123" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Edited Name");
    expect(res.body.roleName).toBe("Fulfillment Specialist");
    expect(res.body.status).toBe("Inactive");

    const row = await prisma.admins.findUnique({ where: { id: staffId } });
    expect(row?.name).toBe("Edited Name");
    expect(row?.is_active).toBe(false);

    const login = await request(app)
      .post("/api/auth/password-login")
      .send({ email: STAFF_EMAIL, password: "newpass123" });
    expect(login.status).toBe(200);
  });

  it("deletes the staff member", async () => {
    const res = await request(app)
      .delete(`/api/staff/${staffId}`)
      .set("Cookie", superCookie);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const gone = await prisma.admins.findUnique({ where: { id: staffId } });
    expect(gone).toBeNull();
  });
});
