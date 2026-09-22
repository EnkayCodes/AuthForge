import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { resetDb } from "./helpers/db.js";
import { createFakeMailer } from "./helpers/mailer.js";
import { setupApplication } from "./helpers/end-user.js";

beforeEach(resetDb);

describe("Audit logging", () => {
  it("records a login event in the audit log", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });

    await request(app)
      .post("/users/register")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    await request(app)
      .post("/users/login")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    const res = await request(app)
      .get("/audit/logs")
      .set("Authorization", `Bearer ${apiKey}`);

    expect(res.status).toBe(200);
    const actions = res.body.logs.map((l: { action: string }) => l.action);
    expect(actions).toContain("user.login");
    expect(actions).toContain("user.registered");
  });

  it("records a failed login attempt", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });

    await request(app)
      .post("/users/register")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    await request(app)
      .post("/users/login")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "wrongpassword" });

    const res = await request(app)
      .get("/audit/logs")
      .set("Authorization", `Bearer ${apiKey}`);

    const actions = res.body.logs.map((l: { action: string }) => l.action);
    expect(actions).toContain("user.login_failed");
  });

  it("filters audit logs by user_id", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });

    const regRes = await request(app)
      .post("/users/register")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });
    const userId = regRes.body.endUser.id;

    await request(app)
      .post("/users/register")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "other@example.com", password: "password123" });

    const res = await request(app)
      .get(`/audit/logs?user_id=${userId}`)
      .set("Authorization", `Bearer ${apiKey}`);

    expect(res.body.logs.length).toBeGreaterThan(0);
    for (const log of res.body.logs) {
      expect(log.endUserId).toBe(userId);
    }
  });

  it("supports limit parameter", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });

    await request(app)
      .post("/users/register")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    await request(app)
      .post("/users/login")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    const res = await request(app)
      .get("/audit/logs?limit=1")
      .set("Authorization", `Bearer ${apiKey}`);

    expect(res.body.logs).toHaveLength(1);
  });
});
