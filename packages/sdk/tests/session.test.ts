import { describe, it, expect } from "vitest";
import { SessionManager, parseCookies } from "../src/session.js";

describe("SessionManager", () => {
  const secret = "test-secret-at-least-sixteen-chars";

  describe("encrypt / decrypt round-trip", () => {
    it("recovers the original session data", async () => {
      const manager = new SessionManager(secret);
      const data = {
        accessToken: "eyJhbGciOiJSUzI1NiJ9.test",
        refreshToken: "refresh_abc123",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      };
      const encrypted = await manager.encrypt(data);
      const decrypted = await manager.decrypt(encrypted);
      expect(decrypted).toEqual(data);
    });

    it("produces different ciphertext each time", async () => {
      const manager = new SessionManager(secret);
      const data = { accessToken: "a", refreshToken: "b", expiresAt: 1 };
      const a = await manager.encrypt(data);
      const b = await manager.encrypt(data);
      expect(a).not.toBe(b);
    });

    it("handles pending data shape", async () => {
      const manager = new SessionManager(secret);
      const pending = { codeVerifier: "abc123", state: "xyz789" };
      const encrypted = await manager.encrypt(pending);
      const decrypted = await manager.decrypt(encrypted);
      expect(decrypted).toEqual(pending);
    });
  });

  describe("decrypt with wrong key", () => {
    it("returns null", async () => {
      const a = new SessionManager("secret-one-abcdef");
      const b = new SessionManager("secret-two-abcdef");
      const encrypted = await a.encrypt({ foo: "bar" });
      expect(await b.decrypt(encrypted)).toBeNull();
    });
  });

  describe("decrypt malformed input", () => {
    it("returns null for garbage", async () => {
      const manager = new SessionManager(secret);
      expect(await manager.decrypt("not.a.valid.jwe.string")).toBeNull();
    });

    it("returns null for empty string", async () => {
      const manager = new SessionManager(secret);
      expect(await manager.decrypt("")).toBeNull();
    });
  });
});

describe("parseCookies", () => {
  it("parses a cookie header into key-value pairs", () => {
    const result = parseCookies("name=value; other=data");
    expect(result).toEqual({ name: "value", other: "data" });
  });

  it("handles URL-encoded values", () => {
    const result = parseCookies("token=hello%20world");
    expect(result).toEqual({ token: "hello world" });
  });

  it("returns empty object for undefined", () => {
    expect(parseCookies(undefined)).toEqual({});
  });

  it("returns empty object for empty string", () => {
    expect(parseCookies("")).toEqual({});
  });
});
