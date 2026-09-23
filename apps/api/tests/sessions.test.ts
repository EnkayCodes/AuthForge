import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { resetDb } from "./helpers/db.js";
import { createFakeMailer } from "./helpers/mailer.js";
import { setupApplication } from "./helpers/end-user.js";

beforeEach(resetDb);

async function registerAndLogin(
  app: ReturnType<typeof createApp>,
  apiKey: string,
  email = "user@example.com",
) {
  await request(app)
    .post("/users/register")
    .set("Authorization", `Bearer ${apiKey}`)
    .send({ email, password: "password123" });

  const loginRes = await request(app)
    .post("/users/login")
    .set("Authorization", `Bearer ${apiKey}`)
    .send({ email, password: "password123" });

  return loginRes.body as { endUser: { id: string }; accessToken: string; refreshToken: string };
}

describe("Session tracking", () => {
  it("creates a session on login and lists it", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });

    const { endUser } = await registerAndLogin(app, apiKey);

    const res = await request(app)
      .get(`/users/${endUser.id}/sessions`)
      .set("Authorization", `Bearer ${apiKey}`);
    expect(res.status).toBe(200);
    expect(res.body.sessions).toHaveLength(1);
    expect(res.body.sessions[0].id).toBeDefined();
    expect(res.body.sessions[0].createdAt).toBeDefined();
  });

  it("creates separate sessions for multiple logins", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });

    const { endUser } = await registerAndLogin(app, apiKey);

    await request(app)
      .post("/users/login")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    const res = await request(app)
      .get(`/users/${endUser.id}/sessions`)
      .set("Authorization", `Bearer ${apiKey}`);
    expect(res.body.sessions).toHaveLength(2);
  });

  it("revokes a specific session", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });

    const { endUser } = await registerAndLogin(app, apiKey);

    const listRes = await request(app)
      .get(`/users/${endUser.id}/sessions`)
      .set("Authorization", `Bearer ${apiKey}`);
    const sessionId = listRes.body.sessions[0].id;

    const delRes = await request(app)
      .delete(`/users/${endUser.id}/sessions/${sessionId}`)
      .set("Authorization", `Bearer ${apiKey}`);
    expect(delRes.status).toBe(204);

    const afterRes = await request(app)
      .get(`/users/${endUser.id}/sessions`)
      .set("Authorization", `Bearer ${apiKey}`);
    expect(afterRes.body.sessions).toHaveLength(0);
  });

  it("revokes all sessions for a user", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });

    const { endUser } = await registerAndLogin(app, apiKey);

    await request(app)
      .post("/users/login")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });

    const delRes = await request(app)
      .delete(`/users/${endUser.id}/sessions`)
      .set("Authorization", `Bearer ${apiKey}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.revoked).toBe(2);

    const afterRes = await request(app)
      .get(`/users/${endUser.id}/sessions`)
      .set("Authorization", `Bearer ${apiKey}`);
    expect(afterRes.body.sessions).toHaveLength(0);
  });
});
