import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { resetDb } from "./helpers/db.js";

beforeEach(resetDb);

describe("GET /developers/me", () => {
  it("returns the current developer with a valid token", async () => {
    const app = createApp();
    const signup = await request(app)
      .post("/developers/signup")
      .send({ email: "dev@example.com", password: "password123", name: "Dev" });
    const token = signup.body.token as string;

    const res = await request(app)
      .get("/developers/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.developer).toMatchObject({ email: "dev@example.com", name: "Dev" });
  });

  it("returns 401 without a token", async () => {
    const res = await request(createApp()).get("/developers/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with a bad token", async () => {
    const res = await request(createApp())
      .get("/developers/me")
      .set("Authorization", "Bearer garbage");
    expect(res.status).toBe(401);
  });
});
