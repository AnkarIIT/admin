import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../server";
import { TOTP_TEST_EMAIL, ensureTestAdmin } from "./auth.test";

describe("rate limits", () => {
  it("returns 429 after too many failed TOTP login attempts", async () => {
    await ensureTestAdmin();
    let lastStatus = 0;
    for (let i = 0; i < 11; i++) {
      const res = await request(app)
        .post("/api/auth/totp-login")
        .send({ email: TOTP_TEST_EMAIL, code: "000000" });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});
