import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { resetDb } from "./helpers/db.js";

beforeEach(resetDb);

async function seedDeveloper(app: ReturnType<typeof createApp>) {
  await request(app)
    .post("/developers/signup")
    .send({ email: "dev@example.com", password: "password123", name: "Dev" });
}

describe("POST /developers/login", () => {
  it("logs in with correct credentials", async () => {
    const app = createApp();
    await seedDeveloper(app);
    const res = await request(app)
      .post("/developers/login")
      .send({ email: "dev@example.com", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body.developer).toMatchObject({ email: "dev@example.com" });
    expect(typeof res.body.token).toBe("string");
  });

  it("rejects a wrong password with 401", async () => {
    const app = createApp();
    await seedDeveloper(app);
    const res = await request(app)
      .post("/developers/login")
      .send({ email: "dev@example.com", password: "wrongpass" });
    expect(res.status).toBe(401);
  });

  it("rejects an unknown email with 401", async () => {
    const res = await request(createApp())
      .post("/developers/login")
      .send({ email: "ghost@example.com", password: "password123" });
    expect(res.status).toBe(401);
  });
});
