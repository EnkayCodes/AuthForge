import { hkdfSync } from "node:crypto";
import { CompactEncrypt, compactDecrypt } from "jose";

export class SessionManager {
  private key: Uint8Array;

  constructor(secret: string) {
    this.key = new Uint8Array(
      hkdfSync("sha256", secret, "authforge", "cookie-encryption", 32),
    );
  }

  async encrypt(data: object): Promise<string> {
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    return new CompactEncrypt(encoded)
      .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
      .encrypt(this.key);
  }

  async decrypt<T = unknown>(jwe: string): Promise<T | null> {
    try {
      const { plaintext } = await compactDecrypt(jwe, this.key);
      return JSON.parse(new TextDecoder().decode(plaintext)) as T;
    } catch {
      return null;
    }
  }
}

export function parseCookies(
  header: string | undefined,
): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const pair of header.split(";")) {
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (name) cookies[name] = decodeURIComponent(value);
  }
  return cookies;
}
