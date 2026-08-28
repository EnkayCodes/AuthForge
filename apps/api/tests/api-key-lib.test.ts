import { describe, it, expect } from "vitest";
import {
  generateApiKey,
  parseApiKeyToken,
  hashApiKeySecret,
  verifyApiKeySecret,
} from "../src/lib/api-key.js";

describe("api key generation", () => {
  it("issues a token that carries the key id and secret", () => {
    const key = generateApiKey("production");
    expect(key.token.startsWith("af_live_")).toBe(true);
    expect(key.token).toContain(key.keyId);
    expect(key.token.endsWith(key.secret)).toBe(true);
  });

  it("marks non-production environments as test keys", () => {
    expect(generateApiKey("development").token.startsWith("af_test_")).toBe(true);
    expect(generateApiKey("staging").token.startsWith("af_test_")).toBe(true);
  });

  it("never returns the same secret twice", () => {
    const a = generateApiKey("production");
    const b = generateApiKey("production");
    expect(a.secret).not.toBe(b.secret);
    expect(a.keyId).not.toBe(b.keyId);
  });

  it("does not store the raw secret in the hash", () => {
    const key = generateApiKey("production");
    expect(key.secretHash).not.toBe(key.secret);
    expect(key.secretHash).not.toContain(key.secret);
  });
});

describe("api key parsing", () => {
  it("round-trips a generated token", () => {
    const key = generateApiKey("production");
    expect(parseApiKeyToken(key.token)).toEqual({ keyId: key.keyId, secret: key.secret });
  });

  it("returns null for malformed tokens", () => {
    for (const bad of ["", "nonsense", "af_live_only-two", "xx_live_a_b", "af_live__b", "af_live_a_"]) {
      expect(parseApiKeyToken(bad)).toBeNull();
    }
  });
});

describe("api key verification", () => {
  it("accepts the correct secret", () => {
    const key = generateApiKey("production");
    expect(verifyApiKeySecret(key.secretHash, key.secret)).toBe(true);
  });

  it("rejects an incorrect secret", () => {
    const key = generateApiKey("production");
    expect(verifyApiKeySecret(key.secretHash, "wrong")).toBe(false);
  });

  it("rejects a malformed stored hash without throwing", () => {
    expect(verifyApiKeySecret("not-a-hash", "whatever")).toBe(false);
  });

  it("hashes deterministically", () => {
    expect(hashApiKeySecret("abc")).toBe(hashApiKeySecret("abc"));
    expect(hashApiKeySecret("abc")).not.toBe(hashApiKeySecret("abd"));
  });
});
