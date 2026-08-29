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
    .send({ name: "Acme" });
  return { token, id: created.body.application.id as string };
}

async function issueKey(app: ReturnType<typeof createApp>, token: string, id: string, label: string) {
  const res = await request(app)
    .post(`/applications/${id}/keys`)
    .set("Authorization", `Bearer ${token}`)
    .send({ label });
  return res.body.apiKey.id as string;
}

// The ownership gate passes here, because the same developer owns both
// applications. Only the applicationId filter on the key lookup stops a key
// being revoked through a sibling application's path.
describe("cross-application key scoping", () => {
  it("cannot revoke one application's key through another application owned by the same developer", async () => {
    const app = createApp();
    const { token, id: appA } = await setup(app);
    const second = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Acme Second" });
    const appB = second.body.application.id as string;

    const keyInA = await issueKey(app, token, appA, "belongs to A");

    const res = await request(app)
      .delete(`/applications/${appB}/keys/${keyInA}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);

    // And the key must still be usable — the failed attempt must not revoke it.
    const keys = await request(app)
      .get(`/applications/${appA}/keys`)
      .set("Authorization", `Bearer ${token}`);
    expect(keys.body.apiKeys[0].revokedAt).toBeNull();
  });

  it("does not list one application's keys under another", async () => {
    const app = createApp();
    const { token, id: appA } = await setup(app);
    const second = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Acme Second" });
    const appB = second.body.application.id as string;

    await issueKey(app, token, appA, "belongs to A");

    const res = await request(app)
      .get(`/applications/${appB}/keys`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.apiKeys).toEqual([]);
  });
});

describe("GET /applications/:id/keys", () => {
  it("lists keys without exposing any secret material", async () => {
    const app = createApp();
    const { token, id } = await setup(app);
    await issueKey(app, token, id, "one");
    await issueKey(app, token, id, "two");

    const res = await request(app)
      .get(`/applications/${id}/keys`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.apiKeys).toHaveLength(2);
    for (const key of res.body.apiKeys) {
      expect(key.secretHash).toBeUndefined();
      expect(key.secret).toBeUndefined();
      expect(key.token).toBeUndefined();
      expect(key.keyId).toBeTruthy();
    }
  });

  it("returns 404 for another developer's application", async () => {
    const app = createApp();
    const { id } = await setup(app, "alice@example.com");
    const other = await setup(app, "bob@example.com");
    const res = await request(app)
      .get(`/applications/${id}/keys`)
      .set("Authorization", `Bearer ${other.token}`);
    expect(res.status).toBe(404);
  });
});

describe("DELETE /applications/:id/keys/:keyId", () => {
  it("revokes a key", async () => {
    const app = createApp();
    const { token, id } = await setup(app);
    const keyId = await issueKey(app, token, id, "revoke me");

    const res = await request(app)
      .delete(`/applications/${id}/keys/${keyId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.apiKey.revokedAt).not.toBeNull();
  });

  it("returns 409 when revoking twice", async () => {
    const app = createApp();
    const { token, id } = await setup(app);
    const keyId = await issueKey(app, token, id, "revoke me");
    await request(app)
      .delete(`/applications/${id}/keys/${keyId}`)
      .set("Authorization", `Bearer ${token}`);
    const res = await request(app)
      .delete(`/applications/${id}/keys/${keyId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(409);
  });

  it("returns 404 for another developer's key", async () => {
    const app = createApp();
    const alice = await setup(app, "alice@example.com");
    const bob = await setup(app, "bob@example.com");
    const keyId = await issueKey(app, alice.token, alice.id, "alice key");

    const res = await request(app)
      .delete(`/applications/${alice.id}/keys/${keyId}`)
      .set("Authorization", `Bearer ${bob.token}`);

    expect(res.status).toBe(404);
  });

  it("removes an application's keys when the application is deleted", async () => {
    const app = createApp();
    const { token, id } = await setup(app);
    await issueKey(app, token, id, "cascade");

    await request(app).delete(`/applications/${id}`).set("Authorization", `Bearer ${token}`);

    const res = await request(app)
      .get(`/applications/${id}/keys`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
