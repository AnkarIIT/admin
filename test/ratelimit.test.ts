import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../server";

describe("rate limits", () => {
  it("returns 429 after too many failed login attempts", async () => {
    let lastStatus = 0;
    for (let i = 0; i < 11; i++) {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "admin@example.com", password: "wrong" });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});
