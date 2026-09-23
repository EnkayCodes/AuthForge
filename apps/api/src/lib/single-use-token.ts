import { createHash, randomBytes } from "node:crypto";

export interface GeneratedSingleUseToken {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

// Same reasoning as lib/api-key.ts: 32 bytes from a CSPRNG is already
// infeasible to guess, so a deliberately slow hash (Argon2id, used for human
// passwords) would only add latency. A single SHA-256 is the right tool for
// high-entropy material. Lookup is by the hash of the presented value, so
// there is no comparison that needs to be constant-time.
export function hashSingleUseToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateSingleUseToken(
  ttlSeconds: number,
  now: Date = new Date(),
): GeneratedSingleUseToken {
  // base64url so the token survives a URL or query string untouched.
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashSingleUseToken(token),
    expiresAt: new Date(now.getTime() + ttlSeconds * 1000),
  };
}
