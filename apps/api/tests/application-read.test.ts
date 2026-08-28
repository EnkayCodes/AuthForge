import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { resetDb } from "./helpers/db.js";

beforeEach(resetDb);

async function signUpDeveloper(app: ReturnType<typeof createApp>, email: string) {
  const res = await request(app)
    .post("/developers/signup")
    .send({ email, password: "password123", name: "Dev" });
  return res.body.token as string;
}

async function createApplicationFor(app: ReturnType<typeof createApp>, token: string, name: string) {
  const res = await request(app)
    .post("/applications")
    .set("Authorization", `Bearer ${token}`)
    .send({ name });
  return res.body.application.id as string;
}

describe("GET /applications", () => {
  it("lists only the authenticated developer's applications", async () => {
    const app = createApp();
    const alice = await signUpDeveloper(app, "alice@example.com");
    const bob = await signUpDeveloper(app, "bob@example.com");
    await createApplicationFor(app, alice, "Alice App");
    await createApplicationFor(app, bob, "Bob App");

    const res = await request(app).get("/applications").set("Authorization", `Bearer ${alice}`);

    expect(res.status).toBe(200);
    expect(res.body.applications).toHaveLength(1);
    expect(res.body.applications[0].name).toBe("Alice App");
  });

  it("returns an empty list when there are none", async () => {
    const app = createApp();
    const token = await signUpDeveloper(app, "dev@example.com");
    const res = await request(app).get("/applications").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.applications).toEqual([]);
  });

  it("returns 401 without a token", async () => {
    const res = await request(createApp()).get("/applications");
    expect(res.status).toBe(401);
  });
});

describe("GET /applications/:id", () => {
  it("returns the application to its owner", async () => {
    const app = createApp();
    const token = await signUpDeveloper(app, "dev@example.com");
    const id = await createApplicationFor(app, token, "Acme");

    const res = await request(app)
      .get(`/applications/${id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.application).toMatchObject({ id, name: "Acme" });
  });

  it("returns 404 for another developer's application", async () => {
    const app = createApp();
    const alice = await signUpDeveloper(app, "alice@example.com");
    const bob = await signUpDeveloper(app, "bob@example.com");
    const aliceApp = await createApplicationFor(app, alice, "Alice App");

    const res = await request(app)
      .get(`/applications/${aliceApp}`)
      .set("Authorization", `Bearer ${bob}`);

    expect(res.status).toBe(404);
  });

  it("returns 404 for an unknown id", async () => {
    const app = createApp();
    const token = await signUpDeveloper(app, "dev@example.com");
    const res = await request(app)
      .get("/applications/does-not-exist")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
