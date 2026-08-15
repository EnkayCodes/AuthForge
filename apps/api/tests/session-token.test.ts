import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import { signSessionToken, verifySessionToken } from "../src/lib/session-token.js";
import { env } from "../src/env.js";

describe("session token", () => {
  it("round-trips the developerId", () => {
    const token = signSessionToken({ developerId: "dev_123" });
    expect(verifySessionToken(token)).toEqual({ developerId: "dev_123" });
  });

  it("returns null for a tampered token", () => {
    const token = signSessionToken({ developerId: "dev_123" });
    expect(verifySessionToken(token + "x")).toBeNull();
  });

  it("returns null for garbage", () => {
    expect(verifySessionToken("not-a-token")).toBeNull();
  });

  it("rejects an unsigned token claiming the 'none' algorithm", () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ developerId: "dev_123" })).toString("base64url");
    expect(verifySessionToken(`${header}.${payload}.`)).toBeNull();
  });

  it("rejects a validly signed token that carries no developerId", () => {
    const token = jwt.sign({ role: "admin" }, env.SESSION_JWT_SECRET, { algorithm: "HS256" });
    expect(verifySessionToken(token)).toBeNull();
  });

  it("returns null for an expired token", () => {
    const token = jwt.sign({ developerId: "dev_123" }, env.SESSION_JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: "-1s",
    });
    expect(verifySessionToken(token)).toBeNull();
  });
});
