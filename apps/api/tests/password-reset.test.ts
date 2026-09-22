import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { prisma } from "@authforge/db";
import { createApp } from "../src/app.js";
import { resetDb } from "./helpers/db.js";
import { createFakeMailer } from "./helpers/mailer.js";
import { setupApplication } from "./helpers/end-user.js";
import { hashSingleUseToken } from "../src/lib/single-use-token.js";

beforeEach(resetDb);

async function registerUser(app: ReturnType<typeof createApp>, apiKey: string) {
  await request(app)
    .post("/users/register")
    .set("Authorization", `Bearer ${apiKey}`)
    .send({ email: "user@example.com", password: "password123" });
}

describe("POST /users/password-reset", () => {
  it("sends a reset email for a known address", async () => {
    const { mailer, sent } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app);
    await registerUser(app, apiKey);

    const res = await request(app)
      .post("/users/password-reset")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com" });

    expect(res.status).toBe(202);
    const resets = sent.filter((m) => m.kind === "password-reset");
    expect(resets).toHaveLength(1);
    expect(resets[0].to).toBe("user@example.com");
  });

  it("returns 202 without sending for an unknown address", async () => {
    const { mailer, sent } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app);

    const res = await request(app)
      .post("/users/password-reset")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "nobody@example.com" });

    expect(res.status).toBe(202);
    expect(sent.filter((m) => m.kind === "password-reset")).toHaveLength(0);
  });

  it("does not send for an address belonging to another application", async () => {
    const { mailer, sent } = createFakeMailer();
    const app = createApp({ mailer });
    const alice = await setupApplication(app, { email: "alice@example.com" });
    const bob = await setupApplication(app, { email: "bob@example.com" });
    await registerUser(app, alice.apiKey);

    const res = await request(app)
      .post("/users/password-reset")
      .set("Authorization", `Bearer ${bob.apiKey}`)
      .send({ email: "user@example.com" });

    expect(res.status).toBe(202);
    expect(sent.filter((m) => m.kind === "password-reset")).toHaveLength(0);
  });
});

describe("POST /users/password-reset/confirm", () => {
  async function requestReset(app: ReturnType<typeof createApp>, apiKey: string) {
    await request(app)
      .post("/users/password-reset")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com" });
  }

  it("changes the password and lets the new one log in", async () => {
    const { mailer, sent } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });
    await registerUser(app, apiKey);
    await requestReset(app, apiKey);
    const token = sent.filter((m) => m.kind === "password-reset")[0].token;

    const res = await request(app)
      .post("/users/password-reset/confirm")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ token, password: "brand-new-password" });
    expect(res.status).toBe(200);

    const withNew = await request(app)
      .post("/users/login")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "brand-new-password" });
    expect(withNew.status).toBe(200);

    const withOld = await request(app)
      .post("/users/login")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });
    expect(withOld.status).toBe(401);
  });

  it("marks the address verified, because the mailbox was demonstrably controlled", async () => {
    const { mailer, sent } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });
    await registerUser(app, apiKey);
    await requestReset(app, apiKey);
    const token = sent.filter((m) => m.kind === "password-reset")[0].token;

    await request(app)
      .post("/users/password-reset/confirm")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ token, password: "brand-new-password" });

    const res = await request(app)
      .post("/users/login")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "brand-new-password" });
    expect(res.status).toBe(200);
    expect(res.body.endUser.emailVerified).toBe(true);
  });

  it("rejects a replayed token with 400", async () => {
    const { mailer, sent } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });
    await registerUser(app, apiKey);
    await requestReset(app, apiKey);
    const token = sent.filter((m) => m.kind === "password-reset")[0].token;

    await request(app)
      .post("/users/password-reset/confirm")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ token, password: "brand-new-password" });
    const res = await request(app)
      .post("/users/password-reset/confirm")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ token, password: "another-password" });

    expect(res.status).toBe(400);
  });

  it("rejects an expired token with 400", async () => {
    const { mailer, sent } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });
    await registerUser(app, apiKey);
    await requestReset(app, apiKey);
    const token = sent.filter((m) => m.kind === "password-reset")[0].token;

    await prisma.passwordResetToken.update({
      where: { tokenHash: hashSingleUseToken(token) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await request(app)
      .post("/users/password-reset/confirm")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ token, password: "brand-new-password" });

    expect(res.status).toBe(400);
  });

  it("rejects a token issued by another application", async () => {
    const { mailer, sent } = createFakeMailer();
    const app = createApp({ mailer });
    const alice = await setupApplication(app, {
      email: "alice@example.com",
      requireVerifiedEmail: false,
    });
    const bob = await setupApplication(app, {
      email: "bob@example.com",
      requireVerifiedEmail: false,
    });
    await registerUser(app, alice.apiKey);
    await requestReset(app, alice.apiKey);
    const token = sent.filter((m) => m.kind === "password-reset")[0].token;

    const res = await request(app)
      .post("/users/password-reset/confirm")
      .set("Authorization", `Bearer ${bob.apiKey}`)
      .send({ token, password: "brand-new-password" });

    expect(res.status).toBe(400);

    // And the password must be unchanged — a rejected attempt must not do work.
    const stillOld = await request(app)
      .post("/users/login")
      .set("Authorization", `Bearer ${alice.apiKey}`)
      .send({ email: "user@example.com", password: "password123" });
    expect(stillOld.status).toBe(200);
  });

  // A second outstanding token is a second standing key to the account. Using
  // one must retire the others.
  it("invalidates the user's other outstanding reset tokens", async () => {
    const { mailer, sent } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });
    await registerUser(app, apiKey);
    await requestReset(app, apiKey);
    await requestReset(app, apiKey);
    const resets = sent.filter((m) => m.kind === "password-reset");
    expect(resets).toHaveLength(2);

    await request(app)
      .post("/users/password-reset/confirm")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ token: resets[1].token, password: "brand-new-password" });

    const res = await request(app)
      .post("/users/password-reset/confirm")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ token: resets[0].token, password: "attacker-password" });

    expect(res.status).toBe(400);
  });
});
