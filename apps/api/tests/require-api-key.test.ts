import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { resetDb } from "./helpers/db.js";

beforeEach(resetDb);

async function setupWithKey(app: ReturnType<typeof createApp>, email = "dev@example.com") {
  const signup = await request(app)
    .post("/developers/signup")
    .send({ email, password: "password123", name: "Dev" });
  const developerToken = signup.body.token as string;
  const created = await request(app)
    .post("/applications")
    .set("Authorization", `Bearer ${developerToken}`)
    .send({ name: "Acme", environment: "production" });
  const applicationId = created.body.application.id as string;
  const issued = await request(app)
    .post(`/applications/${applicationId}/keys`)
    .set("Authorization", `Bearer ${developerToken}`)
    .send({ label: "test key" });
  return {
    developerToken,
    applicationId,
    apiKeyId: issued.body.apiKey.id as string,
    apiToken: issued.body.token as string,
  };
}

describe("GET /applications/current", () => {
  it("authenticates a request with a valid api key", async () => {
    const app = createApp();
    const { apiToken, applicationId } = await setupWithKey(app);

    const res = await request(app)
      .get("/applications/current")
      .set("Authorization", `Bearer ${apiToken}`);

    expect(res.status).toBe(200);
    expect(res.body.application).toMatchObject({ id: applicationId, name: "Acme" });
  });

  it("returns 401 without a key", async () => {
    const res = await request(createApp()).get("/applications/current");
    expect(res.status).toBe(401);
  });

  it("returns 401 for a malformed key", async () => {
    const res = await request(createApp())
      .get("/applications/current")
      .set("Authorization", "Bearer nonsense");
    expect(res.status).toBe(401);
  });

  it("returns 401 when the secret is wrong but the key id is real", async () => {
    const app = createApp();
    const { apiToken } = await setupWithKey(app);
    const parts = apiToken.split("_");
    const tampered = `${parts[0]}_${parts[1]}_${parts[2]}_${"0".repeat(64)}`;

    const res = await request(app)
      .get("/applications/current")
      .set("Authorization", `Bearer ${tampered}`);

    expect(res.status).toBe(401);
  });

  it("returns 401 once the key is revoked", async () => {
    const app = createApp();
    const { apiToken, applicationId, apiKeyId, developerToken } = await setupWithKey(app);

    await request(app)
      .delete(`/applications/${applicationId}/keys/${apiKeyId}`)
      .set("Authorization", `Bearer ${developerToken}`);

    const res = await request(app)
      .get("/applications/current")
      .set("Authorization", `Bearer ${apiToken}`);

    expect(res.status).toBe(401);
  });

  it("does not accept a developer session token as an api key", async () => {
    const app = createApp();
    const { developerToken } = await setupWithKey(app);
    const res = await request(app)
      .get("/applications/current")
      .set("Authorization", `Bearer ${developerToken}`);
    expect(res.status).toBe(401);
  });

  it("records last used time after a successful call", async () => {
    const app = createApp();
    const { apiToken, applicationId, developerToken } = await setupWithKey(app);

    await request(app).get("/applications/current").set("Authorization", `Bearer ${apiToken}`);

    const keys = await request(app)
      .get(`/applications/${applicationId}/keys`)
      .set("Authorization", `Bearer ${developerToken}`);
    expect(keys.body.apiKeys[0].lastUsedAt).not.toBeNull();
  });
});

// The two credential types share the Authorization header, so neither guard may
// ever accept the other's token. The api-key direction is covered above; this is
// the reverse.
describe("developer routes reject an api key", () => {
  it("does not accept an api key as a developer session token", async () => {
    const app = createApp();
    const { apiToken } = await setupWithKey(app);

    const res = await request(app)
      .get("/developers/me")
      .set("Authorization", `Bearer ${apiToken}`);
    expect(res.status).toBe(401);
  });

  it("does not let an api key manage applications", async () => {
    const app = createApp();
    const { apiToken, applicationId } = await setupWithKey(app);

    const list = await request(app)
      .get("/applications")
      .set("Authorization", `Bearer ${apiToken}`);
    expect(list.status).toBe(401);

    const destroy = await request(app)
      .delete(`/applications/${applicationId}`)
      .set("Authorization", `Bearer ${apiToken}`);
    expect(destroy.status).toBe(401);
  });
});
