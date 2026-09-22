import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { resetDb } from "./helpers/db.js";
import { createFakeMailer } from "./helpers/mailer.js";
import { setupApplication } from "./helpers/end-user.js";

beforeEach(resetDb);

describe("RBAC", () => {
  it("creates a role and a permission, attaches them, assigns to a user", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });

    const roleRes = await request(app)
      .post("/roles")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ name: "editor", description: "Can edit content" });
    expect(roleRes.status).toBe(201);
    const roleId = roleRes.body.role.id;

    const permRes = await request(app)
      .post("/permissions")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ key: "posts:write", description: "Write posts" });
    expect(permRes.status).toBe(201);
    const permissionId = permRes.body.permission.id;

    const attachRes = await request(app)
      .post(`/roles/${roleId}/permissions`)
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ permissionId });
    expect(attachRes.status).toBe(204);

    const userRes = await request(app)
      .post("/users/register")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "user@example.com", password: "password123" });
    expect(userRes.status).toBe(201);
    const userId = userRes.body.endUser.id;

    const assignRes = await request(app)
      .post(`/users/${userId}/roles`)
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ roleId });
    expect(assignRes.status).toBe(204);

    const rolesRes = await request(app)
      .get(`/users/${userId}/roles`)
      .set("Authorization", `Bearer ${apiKey}`);
    expect(rolesRes.status).toBe(200);
    expect(rolesRes.body.roles).toHaveLength(1);
    expect(rolesRes.body.roles[0].name).toBe("editor");
  });

  it("includes permissions in the access token", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app, { requireVerifiedEmail: false });

    const roleRes = await request(app)
      .post("/roles")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ name: "admin" });
    const roleId = roleRes.body.role.id;

    await request(app)
      .post("/permissions")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ key: "users:read" });
    const perm = await request(app)
      .post("/permissions")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ key: "users:write" });

    const readPerm = (await request(app)
      .get("/permissions")
      .set("Authorization", `Bearer ${apiKey}`)).body.permissions;

    for (const p of readPerm) {
      await request(app)
        .post(`/roles/${roleId}/permissions`)
        .set("Authorization", `Bearer ${apiKey}`)
        .send({ permissionId: p.id });
    }

    await request(app)
      .post("/users/register")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "admin@example.com", password: "password123" });

    const loginRes = await request(app)
      .post("/users/login")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "admin@example.com", password: "password123" });
    const tokenBefore = loginRes.body.accessToken;
    const payloadBefore = JSON.parse(
      Buffer.from(tokenBefore.split(".")[1], "base64url").toString(),
    );
    expect(payloadBefore.permissions).toEqual([]);

    const userId = loginRes.body.endUser.id;
    await request(app)
      .post(`/users/${userId}/roles`)
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ roleId });

    const loginRes2 = await request(app)
      .post("/users/login")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ email: "admin@example.com", password: "password123" });
    const tokenAfter = loginRes2.body.accessToken;
    const payloadAfter = JSON.parse(
      Buffer.from(tokenAfter.split(".")[1], "base64url").toString(),
    );
    expect(payloadAfter.permissions).toContain("users:read");
    expect(payloadAfter.permissions).toContain("users:write");
  });

  it("lists roles with their permissions", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app);

    await request(app)
      .post("/roles")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ name: "viewer" });

    const listRes = await request(app)
      .get("/roles")
      .set("Authorization", `Bearer ${apiKey}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.roles).toHaveLength(1);
    expect(listRes.body.roles[0].name).toBe("viewer");
  });

  it("deletes a role", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app);

    const roleRes = await request(app)
      .post("/roles")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ name: "temp" });
    const roleId = roleRes.body.role.id;

    const delRes = await request(app)
      .delete(`/roles/${roleId}`)
      .set("Authorization", `Bearer ${apiKey}`);
    expect(delRes.status).toBe(204);

    const listRes = await request(app)
      .get("/roles")
      .set("Authorization", `Bearer ${apiKey}`);
    expect(listRes.body.roles).toHaveLength(0);
  });

  it("rejects duplicate role names within an application", async () => {
    const { mailer } = createFakeMailer();
    const app = createApp({ mailer });
    const { apiKey } = await setupApplication(app);

    await request(app)
      .post("/roles")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ name: "admin" });

    const dup = await request(app)
      .post("/roles")
      .set("Authorization", `Bearer ${apiKey}`)
      .send({ name: "admin" });
    expect(dup.status).toBe(409);
  });
});
