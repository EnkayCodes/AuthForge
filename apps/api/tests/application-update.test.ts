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

describe("PATCH /applications/:id", () => {
  it("updates the name and redirect uris", async () => {
    const app = createApp();
    const { token, id } = await setup(app);

    const res = await request(app)
      .patch(`/applications/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Acme Renamed", redirectUris: ["https://acme.test/cb"] });

    expect(res.status).toBe(200);
    expect(res.body.application).toMatchObject({
      name: "Acme Renamed",
      redirectUris: ["https://acme.test/cb"],
    });
  });

  it("rejects an empty payload with 400", async () => {
    const app = createApp();
    const { token, id } = await setup(app);
    const res = await request(app)
      .patch(`/applications/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("rejects an invalid ttl with 400", async () => {
    const app = createApp();
    const { token, id } = await setup(app);
    const res = await request(app)
      .patch(`/applications/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ accessTokenTtl: "banana" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for another developer's application", async () => {
    const app = createApp();
    const { id } = await setup(app, "alice@example.com");
    const other = await setup(app, "bob@example.com");

    const res = await request(app)
      .patch(`/applications/${id}`)
      .set("Authorization", `Bearer ${other.token}`)
      .send({ name: "Hijacked" });

    expect(res.status).toBe(404);
  });
});
