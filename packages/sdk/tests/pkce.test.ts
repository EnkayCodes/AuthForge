import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { generateCodeVerifier, generateCodeChallenge, generateState } from "../src/pkce.js";

describe("generateCodeVerifier", () => {
  it("returns a string of at least 43 characters", () => {
    const verifier = generateCodeVerifier();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
  });

  it("returns a string of at most 128 characters", () => {
    const verifier = generateCodeVerifier();
    expect(verifier.length).toBeLessThanOrEqual(128);
  });

  it("uses only base64url characters", () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates unique values on each call", () => {
    const a = generateCodeVerifier();
    const b = generateCodeVerifier();
    expect(a).not.toBe(b);
  });
});

describe("generateCodeChallenge", () => {
  it("produces the SHA-256 base64url digest of the verifier", () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const expected = createHash("sha256").update(verifier).digest("base64url");
    expect(generateCodeChallenge(verifier)).toBe(expected);
  });

  it("matches the AuthForge API verification logic", () => {
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    const apiCheck = createHash("sha256").update(verifier).digest("base64url");
    expect(challenge).toBe(apiCheck);
  });
});

describe("generateState", () => {
  it("returns a non-empty string", () => {
    expect(generateState().length).toBeGreaterThan(0);
  });

  it("uses only base64url characters", () => {
    expect(generateState()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates unique values on each call", () => {
    expect(generateState()).not.toBe(generateState());
  });
});
