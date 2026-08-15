import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import { prisma, Prisma } from "@authforge/db";
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

// The concurrency test above proves the endpoint behaves correctly under real
// concurrent load, but it cannot guarantee the unique-constraint branch ran —
// if the two requests happen to serialize, the pre-check returns 409 first.
// These two stub only the single `create` call to pin that branch deterministically.
describe("POST /developers/signup — unique-constraint handling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function prismaError(code: string) {
    return new Prisma.PrismaClientKnownRequestError("constraint failure", {
      code,
      clientVersion: Prisma.prismaVersion.client,
    });
  }

  it("translates a P2002 unique-constraint violation into 409", async () => {
    vi.spyOn(prisma.developer, "create").mockRejectedValueOnce(prismaError("P2002"));

    const res = await request(createApp())
      .post("/developers/signup")
      .send({ email: "raced@example.com", password: "password123", name: "Dev" });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe("Email already registered");
  });

  it("does not mislabel an unrelated database error as a duplicate email", async () => {
    vi.spyOn(prisma.developer, "create").mockRejectedValueOnce(prismaError("P1001"));
    // The error handler logs unexpected errors; silence it so output stays pristine.
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await request(createApp())
      .post("/developers/signup")
      .send({ email: "broken@example.com", password: "password123", name: "Dev" });

    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe("Internal server error");
  });
});
