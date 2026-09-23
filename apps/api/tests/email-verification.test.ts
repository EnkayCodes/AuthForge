import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { prisma } from "@authforge/db";
import { createApp } from "../src/app.js";
import { resetDb } from "./helpers/db.js";
import { createFakeMailer } from "./helpers/mailer.js";
import { setupApplication } from "./helpers/end-user.js";
import { hashSingleUseToken } from "../src/lib/single-use-token.js";

beforeEach(resetDb);

async function registerUser(
  app: ReturnType<typeof createApp>,
  apiKey: string,
  email = "user@example.com",
) {
  const res = await request(app)
    .post("/users/register")
    .set("Authorization", `Bearer ${apiKey}`)
    .send({ email, password: "password123" });
  return res.body.endUser.id as string;
}

describe("POST /users/verify-email", () => {
  it("verifies an end-user with a valid token", async () => {
    const { mailer, sent } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app);
    const id = await registerUser(app, apiKey);

    const res = await request(app)
      .post("/users/verify-email")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ token: sent[0].token });

    expect(res.status).toBe(200);
    const stored = await prisma.endUser.findUnique({ where: { id } });
    expect(stored?.emailVerifiedAt).not.toBeNull();
  });

  it("rejects a replayed token with 400", async () => {
    const { mailer, sent } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app);
    await registerUser(app, apiKey);

    await request(app)
      .post("/users/verify-email")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ token: sent[0].token });
    const res = await request(app)
      .post("/users/verify-email")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ token: sent[0].token });

    expect(res.status).toBe(400);
  });

  it("rejects an expired token with 400", async () => {
    const { mailer, sent } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app);
    await registerUser(app, apiKey);

    await prisma.verificationToken.update({
      where: { tokenHash: hashSingleUseToken(sent[0].token) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await request(app)
      .post("/users/verify-email")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ token: sent[0].token });

    expect(res.status).toBe(400);
  });

  it("rejects an unknown token with 400", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app);

    const res = await request(app)
      .post("/users/verify-email")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ token: "not-a-real-token" });

    expect(res.status).toBe(400);
  });

  // The guard that matters: an application must not be able to consume a token
  // that belongs to a different tenant, even though the token value is valid.
  it("rejects a token issued by another application", async () => {
    const { mailer, sent } = createFakeMailer();
    const app = createApp({ mailer });
    const alice = await setupApplication(app, { email: "alice@example.com" });
    const bob = await setupApplication(app, { email: "bob@example.com" });
    const id = await registerUser(app, alice.apiKey);

    const res = await request(app)
      .post("/users/verify-email")
      .set("Authorization", `Bearer ${bob.apiKey}`)
      .send({ token: sent[0].token });

    expect(res.status).toBe(400);
    const stored = await prisma.endUser.findUnique({ where: { id } });
    expect(stored?.emailVerifiedAt).toBeNull();
  });
});

describe("POST /users/verify-email/resend", () => {
  it("issues a fresh token for an unverified address", async () => {
    const { mailer, sent } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app);
    await registerUser(app, apiKey);

    const res = await request(app)
      .post("/users/verify-email/resend")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com" });

    expect(res.status).toBe(202);
    expect(sent).toHaveLength(2);
    expect(sent[1].token).not.toBe(sent[0].token);
  });

  it("returns 202 without sending for an unknown address", async () => {
    const { mailer, sent } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app);

    const res = await request(app)
      .post("/users/verify-email/resend")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "nobody@example.com" });

    expect(res.status).toBe(202);
    expect(sent).toHaveLength(0);
  });

  it("returns 202 without sending for an already-verified address", async () => {
    const { mailer, sent } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app);
    await registerUser(app, apiKey);
    await request(app)
      .post("/users/verify-email")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ token: sent[0].token });

    const res = await request(app)
      .post("/users/verify-email/resend")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com" });

    expect(res.status).toBe(202);
    expect(sent).toHaveLength(1);
  });
});
