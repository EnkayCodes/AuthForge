import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { prisma } from "@authforge/db";
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

  // A token stays cryptographically valid until it expires, so the guard must
  // confirm the developer still exists rather than trusting the payload alone.
  it("returns 401 when the token is valid but the developer no longer exists", async () => {
    const app = createApp();
    const signup = await request(app)
      .post("/developers/signup")
      .send({ email: "deleted@example.com", password: "password123", name: "Dev" });
    const token = signup.body.token as string;
    expect(signup.status).toBe(201);

    await prisma.developer.delete({ where: { id: signup.body.developer.id as string } });

    const res = await request(app).get("/developers/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Unauthorized");
  });

  it("rejects a non-Bearer authorization scheme", async () => {
    const res = await request(createApp())
      .get("/developers/me")
      .set("Authorization", "Basic dXNlcjpwYXNz");
    expect(res.status).toBe(401);
  });
});
