import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { resetDb } from "./helpers/db.js";

beforeEach(resetDb);

async function setup(app: ReturnType<typeof createApp>, email = "dev@example.com") {
  const signup = await request(app)
    .post("/developers/signup")
    .send({ email, password: "password123", name: "Dev" });
  const token = signup.body.token as string;
  const created = await request(app)
    .post("/applications")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Acme", environment: "production" });
  return { token, id: created.body.application.id as string };
}

describe("POST /applications/:id/keys", () => {
  it("issues a key and returns the token exactly once", async () => {
    const app = createApp();
    const { token, id } = await setup(app);

    const res = await request(app)
      .post(`/applications/${id}/keys`)
      .set("Authorization", `Bearer ${token}`)
      .send({ label: "CI deploy" });

    expect(res.status).toBe(201);
    expect(res.body.token).toMatch(/^af_live_/);
    expect(res.body.apiKey).toMatchObject({ label: "CI deploy", revokedAt: null });
    expect(res.body.apiKey.keyId).toBeTruthy();
    expect(res.body.apiKey.secretHash).toBeUndefined();
    expect(res.body.apiKey.secret).toBeUndefined();
  });

  it("issues test-prefixed keys for non-production applications", async () => {
    const app = createApp();
    const signup = await request(app)
      .post("/developers/signup")
      .send({ email: "dev@example.com", password: "password123", name: "Dev" });
    const token = signup.body.token as string;
    const created = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Acme Dev" });

    const res = await request(app)
      .post(`/applications/${created.body.application.id}/keys`)
      .set("Authorization", `Bearer ${token}`)
      .send({ label: "local" });

    expect(res.status).toBe(201);
    expect(res.body.token).toMatch(/^af_test_/);
  });

  it("rejects a missing label with 400", async () => {
    const app = createApp();
    const { token, id } = await setup(app);
    const res = await request(app)
      .post(`/applications/${id}/keys`)
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 404 when issuing a key for another developer's application", async () => {
    const app = createApp();
    const { id } = await setup(app, "alice@example.com");
    const other = await setup(app, "bob@example.com");

    const res = await request(app)
      .post(`/applications/${id}/keys`)
      .set("Authorization", `Bearer ${other.token}`)
      .send({ label: "stolen" });

    expect(res.status).toBe(404);
  });

  it("returns 401 without a token", async () => {
    const app = createApp();
    const { id } = await setup(app);
    const res = await request(app).post(`/applications/${id}/keys`).send({ label: "x" });
    expect(res.status).toBe(401);
  });
});
