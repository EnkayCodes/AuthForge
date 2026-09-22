import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { resetDb } from "./helpers/db.js";
import { createFakeMailer } from "./helpers/mailer.js";
import { setupApplication } from "./helpers/end-user.js";

beforeEach(resetDb);

describe("POST /users/login", () => {
  it("returns the end-user for correct credentials once verified", async () => {
    const { mailer, sent } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app);
    await request(app)
      .post("/users/register")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });
    await request(app)
      .post("/users/verify-email")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ token: sent[0].token });

    const res = await request(app)
      .post("/users/login")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.endUser.email).toBe("user@example.com");
    expect(res.body.endUser.emailVerified).toBe(true);
  });

  it("returns an RS256 access token alongside the end-user", async () => {
    const { mailer, sent } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app);
    await request(app)
      .post("/users/register")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });
    await request(app)
      .post("/users/verify-email")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ token: sent[0].token });

    const res = await request(app)
      .post("/users/login")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.endUser).toBeDefined();
    expect(typeof res.body.accessToken).toBe("string");
    expect(res.body.accessToken.split(".")).toHaveLength(3);
  });

  // An attacker must not be able to tell a registered address from an
  // unregistered one by comparing responses.
  it("returns an identical 401 for a wrong password and an unknown email", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app);
    await request(app)
      .post("/users/register")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    const wrongPassword = await request(app)
      .post("/users/login")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "wrong-password" });
    const unknownEmail = await request(app)
      .post("/users/login")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "nobody@example.com", password: "wrong-password" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  it("blocks an unverified end-user when the application requires verification", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app);
    await request(app)
      .post("/users/register")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    const res = await request(app)
      .post("/users/login")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("email_not_verified");
  });

  it("allows an unverified end-user when the application does not require verification", async () => {
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

    expect(res.status).toBe(200);
    expect(res.body.endUser.emailVerified).toBe(false);
  });

  it("does not authenticate an end-user through another application's key", async () => {
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
    await request(app)
      .post("/users/register")
      .set("Authorization", `Bearer ${alice.apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    const res = await request(app)
      .post("/users/login")
      .set("Authorization", `Bearer ${bob.apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    expect(res.status).toBe(401);
  });
});
