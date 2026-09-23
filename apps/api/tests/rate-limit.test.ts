import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { resetDb } from "./helpers/db.js";
import { createFakeMailer } from "./helpers/mailer.js";
import { setupApplication } from "./helpers/end-user.js";

beforeEach(resetDb);

describe("Rate limiting", () => {
  it("returns 429 after exceeding login rate limit", { timeout: 300_000 }, async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });

    await request(app)
      .post("/users/register")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    const results: number[] = [];
    for (let i = 0; i < 22; i++) {
      const res = await request(app)
        .post("/users/login")
        .set("Authorization", `Bearer ${apiKey}`)
        .send({ email: "user@example.com", password: "password123" });
      results.push(res.status);
    }

    expect(results.filter((s) => s === 429).length).toBeGreaterThan(0);
  });

  it("returns rate limit headers", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });

    await request(app)
      .post("/users/register")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    const res = await request(app)
      .post("/users/login")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    expect(res.headers["ratelimit"]).toBeDefined();
  });

  it("applies stricter limit to password reset", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });

    const results: number[] = [];
    for (let i = 0; i < 7; i++) {
      const res = await request(app)
        .post("/users/password-reset")
        .set("Authorization", `Bearer ${apiKey}`)
        .send({ email: "user@example.com" });
      results.push(res.status);
    }

    expect(results.filter((s) => s === 429).length).toBeGreaterThan(0);
  });
});
