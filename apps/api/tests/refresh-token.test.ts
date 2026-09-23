import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { prisma } from "@authforge/db";
import { createApp } from "../src/app.js";
import { resetDb } from "./helpers/db.js";
import { createFakeMailer } from "./helpers/mailer.js";
import { setupApplication } from "./helpers/end-user.js";
import { hashSingleUseToken } from "../src/lib/single-use-token.js";

beforeEach(resetDb);

async function registerAndLogin(
  app: ReturnType<typeof createApp>,
  apiKey: string,
) {
  await request(app)
    .post("/users/register")
    .set("Authorization", `Bearer ${apiKey}`)
    .send({ email: "user@example.com", password: "password123" });

  const res = await request(app)
    .post("/users/login")
    .set("Authorization", `Bearer ${apiKey}`)
    .send({ email: "user@example.com", password: "password123" });

  return res.body as {
    endUser: { id: string; email: string };
    accessToken: string;
    refreshToken: string;
  };
}

describe("POST /users/login (refresh token)", () => {
  it("returns a refresh token alongside the access token", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });

    const body = await registerAndLogin(app, apiKey);

    expect(typeof body.refreshToken).toBe("string");
    expect(body.refreshToken.length).toBeGreaterThan(0);
  });
});

describe("POST /users/token/refresh", () => {
  it("returns a new access token and a new refresh token", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });
    const login = await registerAndLogin(app, apiKey);

    const res = await request(app)
      .post("/users/token/refresh")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ refreshToken: login.refreshToken });

    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe("string");
    expect(typeof res.body.refreshToken).toBe("string");
    expect(res.body.refreshToken).not.toBe(login.refreshToken);
  });

  it("the rotated refresh token works for a subsequent refresh", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });
    const login = await registerAndLogin(app, apiKey);

    const first = await request(app)
      .post("/users/token/refresh")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ refreshToken: login.refreshToken });

    const second = await request(app)
      .post("/users/token/refresh")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ refreshToken: first.body.refreshToken });

    expect(second.status).toBe(200);
    expect(typeof second.body.accessToken).toBe("string");
  });

  it("rejects a replayed (already-used) refresh token", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });
    const login = await registerAndLogin(app, apiKey);

    await request(app)
      .post("/users/token/refresh")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ refreshToken: login.refreshToken });

    const replay = await request(app)
      .post("/users/token/refresh")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ refreshToken: login.refreshToken });

    expect(replay.status).toBe(401);
  });

  it("revokes the entire family when a used token is replayed", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });
    const login = await registerAndLogin(app, apiKey);

    // Rotate once: login.refreshToken -> token2
    const first = await request(app)
      .post("/users/token/refresh")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ refreshToken: login.refreshToken });
    const token2 = first.body.refreshToken;

    // Replay the original — triggers family revocation.
    await request(app)
      .post("/users/token/refresh")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ refreshToken: login.refreshToken });

    // The latest token in the family should also be revoked now.
    const res = await request(app)
      .post("/users/token/refresh")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ refreshToken: token2 });

    expect(res.status).toBe(401);
  });

  it("rejects an expired refresh token", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });
    const login = await registerAndLogin(app, apiKey);

    await prisma.refreshToken.update({
      where: { tokenHash: hashSingleUseToken(login.refreshToken) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await request(app)
      .post("/users/token/refresh")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ refreshToken: login.refreshToken });

    expect(res.status).toBe(401);
  });

  it("rejects a refresh token from another application", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const alice = await setupApplication(app, {
      email: "alice@example.com",
      requireVerifiedEmail: false,
    });
    const bob = await setupApplication(app, {
      email: "bob@example.com",
      requireVerifiedEmail: false,
    });
    const login = await registerAndLogin(app, alice.apiKey);

    const res = await request(app)
      .post("/users/token/refresh")
      .set("Authorization", `Bearer ${bob.apiKey}`)
      .send({ refreshToken: login.refreshToken });

    expect(res.status).toBe(401);
  });

  it("rejects a completely unknown token", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });

    const res = await request(app)
      .post("/users/token/refresh")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ refreshToken: "not-a-real-token" });

    expect(res.status).toBe(401);
  });
});
