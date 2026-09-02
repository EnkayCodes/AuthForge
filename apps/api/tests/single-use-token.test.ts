import { describe, it, expect } from "vitest";
import { generateSingleUseToken, hashSingleUseToken } from "../src/lib/single-use-token.js";

describe("hashSingleUseToken", () => {
  it("produces a stable 64-character hex digest", () => {
    const hash = hashSingleUseToken("abc");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSingleUseToken("abc")).toBe(hash);
  });

  it("produces different digests for different tokens", () => {
    expect(hashSingleUseToken("abc")).not.toBe(hashSingleUseToken("abd"));
  });
});

describe("generateSingleUseToken", () => {
  it("returns a url-safe token carrying 256 bits of entropy", () => {
    const { token } = generateSingleUseToken(60);
    // 32 random bytes, base64url encoded and unpadded.
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("never repeats a token across calls", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateSingleUseToken(60).token));
    expect(tokens.size).toBe(50);
  });

  it("returns the hash of its own token", () => {
    const { token, tokenHash } = generateSingleUseToken(60);
    expect(tokenHash).toBe(hashSingleUseToken(token));
  });

  it("expires ttlSeconds after the supplied instant", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const { expiresAt } = generateSingleUseToken(3600, now);
    expect(expiresAt.toISOString()).toBe("2026-01-01T01:00:00.000Z");
  });
});
