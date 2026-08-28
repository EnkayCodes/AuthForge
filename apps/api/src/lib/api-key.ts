import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type ApiKeyEnvironment = "development" | "staging" | "production";

export interface GeneratedApiKey {
  keyId: string;
  secret: string;
  token: string;
  secretHash: string;
}

const TOKEN_PREFIX = "af";

function environmentSegment(environment: ApiKeyEnvironment): "live" | "test" {
  return environment === "production" ? "live" : "test";
}

// An API key secret is 256 bits of randomness, so guessing is already
// infeasible and a deliberately slow hash (Argon2id, used for human passwords)
// would only add latency to every authenticated request. A single SHA-256 is
// the right tool for a high-entropy token.
export function hashApiKeySecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function verifyApiKeySecret(secretHash: string, secret: string): boolean {
  const expected = Buffer.from(secretHash, "hex");
  const actual = Buffer.from(hashApiKeySecret(secret), "hex");
  if (expected.length !== actual.length || expected.length === 0) return false;
  return timingSafeEqual(expected, actual);
}

export function generateApiKey(environment: ApiKeyEnvironment): GeneratedApiKey {
  const keyId = randomBytes(12).toString("hex");
  const secret = randomBytes(32).toString("hex");
  return {
    keyId,
    secret,
    token: `${TOKEN_PREFIX}_${environmentSegment(environment)}_${keyId}_${secret}`,
    secretHash: hashApiKeySecret(secret),
  };
}

export function parseApiKeyToken(token: string): { keyId: string; secret: string } | null {
  const parts = token.split("_");
  if (parts.length !== 4) return null;
  const [prefix, env, keyId, secret] = parts;
  if (prefix !== TOKEN_PREFIX) return null;
  if (env !== "live" && env !== "test") return null;
  if (!keyId || !secret) return null;
  return { keyId, secret };
}
