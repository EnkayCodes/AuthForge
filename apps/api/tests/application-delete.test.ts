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

describe("DELETE /applications/:id", () => {
  it("deletes the application and it is then gone", async () => {
    const app = createApp();
    const { token, id } = await setup(app);

    const res = await request(app)
      .delete(`/applications/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(204);

    const after = await request(app)
      .get(`/applications/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(after.status).toBe(404);
  });

  it("returns 404 for another developer's application", async () => {
    const app = createApp();
    const { id } = await setup(app, "alice@example.com");
    const other = await setup(app, "bob@example.com");

    const res = await request(app)
      .delete(`/applications/${id}`)
      .set("Authorization", `Bearer ${other.token}`);

    expect(res.status).toBe(404);
  });

  it("returns 404 when deleting twice", async () => {
    const app = createApp();
    const { token, id } = await setup(app);
    await request(app).delete(`/applications/${id}`).set("Authorization", `Bearer ${token}`);
    const res = await request(app)
      .delete(`/applications/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
