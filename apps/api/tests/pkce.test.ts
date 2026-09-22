import { describe, it, expect } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { verifyCodeChallenge } from "../src/lib/pkce.js";

describe("PKCE S256 verification", () => {
  it("accepts a matching verifier-challenge pair", () => {
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    expect(verifyCodeChallenge(verifier, challenge)).toBe(true);
  });

  it("rejects a mismatched verifier", () => {
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const wrong = randomBytes(32).toString("base64url");
    expect(verifyCodeChallenge(wrong, challenge)).toBe(false);
  });
});
