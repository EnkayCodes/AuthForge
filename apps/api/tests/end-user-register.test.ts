import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { resetDb } from "./helpers/db.js";
import { createFakeMailer } from "./helpers/mailer.js";
import { setupApplication } from "./helpers/end-user.js";

beforeEach(resetDb);

describe("POST /users/register", () => {
  it("registers an end-user and sends a verification email", async () => {
    const { mailer, sent } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app);

    const res = await request(app)
      .post("/users/register")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body.endUser.email).toBe("user@example.com");
    expect(res.body.endUser.emailVerified).toBe(false);
    expect(sent).toHaveLength(1);
    expect(sent[0].kind).toBe("verification");
    expect(sent[0].to).toBe("user@example.com");
    expect(sent[0].token).toBeTruthy();
  });

  it("never exposes password or token material", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app);

    const res = await request(app)
      .post("/users/register")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    expect(res.body.endUser.passwordHash).toBeUndefined();
    expect(res.body.endUser.password).toBeUndefined();
    expect(res.body.token).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain("password123");
  });

  it("normalises the email before storing it", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app);

    const res = await request(app)
      .post("/users/register")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "  USER@Example.COM  ", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body.endUser.email).toBe("user@example.com");
  });

  it("returns 409 for a duplicate email and sends no second email", async () => {
    const { mailer, sent } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app);

    const body = { email: "user@example.com", password: "password123" };
    await request(app).post("/users/register").set("Authorization", `Bearer ${apiKey}`).send(body);
    const res = await request(app)
      .post("/users/register")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ ...body, email: "USER@example.com" });

    expect(res.status).toBe(409);
    expect(sent).toHaveLength(1);
  });

  it("rejects an invalid payload with 400", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app);

    const res = await request(app)
      .post("/users/register")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "not-an-email", password: "short" });

    expect(res.status).toBe(400);
  });

  it("requires an API key", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    await setupApplication(app);

    const res = await request(app)
      .post("/users/register")
      .send({ email: "user@example.com", password: "password123" });

    expect(res.status).toBe(401);
  });
});

// The same person can hold an account in two different tenants. These are two
// distinct end-users that must never collide or be visible to each other.
describe("cross-application isolation", () => {
  // Two complete tenants: two signups, two applications, two keys and two
  // registrations, each an Argon2 hash plus a round trip to a remote database.
  // The slowest case in the suite, and the reason the shared timeout is what it
  // is.
  it("allows the same email to register in two different applications", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const alice = await setupApplication(app, { email: "alice@example.com" });
    const bob = await setupApplication(app, { email: "bob@example.com" });

    const body = { email: "shared@example.com", password: "password123" };
    const first = await request(app)
      .post("/users/register")
      .set("Authorization", `Bearer ${alice.apiKey}`)
      .send(body);
    const second = await request(app)
      .post("/users/register")
      .set("Authorization", `Bearer ${bob.apiKey}`)
      .send(body);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.endUser.id).not.toBe(second.body.endUser.id);
  });
});
