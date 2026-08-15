import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { resetDb } from "./helpers/db.js";

beforeEach(resetDb);

describe("POST /developers/signup", () => {
  it("creates a developer and returns a token", async () => {
    const res = await request(createApp())
      .post("/developers/signup")
      .send({ email: "dev@example.com", password: "password123", name: "Dev" });
    expect(res.status).toBe(201);
    expect(res.body.developer).toMatchObject({ email: "dev@example.com", name: "Dev" });
    expect(res.body.developer.id).toBeTruthy();
    expect(typeof res.body.token).toBe("string");
    expect(res.body.developer.passwordHash).toBeUndefined();
  });

  it("rejects a duplicate email with 409", async () => {
    const app = createApp();
    const body = { email: "dup@example.com", password: "password123", name: "Dev" };
    await request(app).post("/developers/signup").send(body);
    const res = await request(app).post("/developers/signup").send(body);
    expect(res.status).toBe(409);
  });

  it("rejects an invalid email with 400", async () => {
    const res = await request(createApp())
      .post("/developers/signup")
      .send({ email: "nope", password: "password123", name: "Dev" });
    expect(res.status).toBe(400);
  });

  it("rejects a short password with 400", async () => {
    const res = await request(createApp())
      .post("/developers/signup")
      .send({ email: "dev@example.com", password: "short", name: "Dev" });
    expect(res.status).toBe(400);
  });

  it("returns exactly one 201 and one 409 for concurrent signups with the same email", async () => {
    const app = createApp();
    const body = { email: "concurrent@example.com", password: "password123", name: "Dev" };
    const [resA, resB] = await Promise.all([
      request(app).post("/developers/signup").send(body),
      request(app).post("/developers/signup").send(body),
    ]);
    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 409]);
  });
});
