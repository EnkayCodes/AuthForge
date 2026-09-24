import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { createTokenVerifier } from "../src/jwks.js";

describe("createTokenVerifier", () => {
  let server: Server;
  let port: number;
  let privateKey: CryptoKey;
  const kid = "test-key-id";

  beforeAll(async () => {
    const keys = await generateKeyPair("RS256");
    privateKey = keys.privateKey;
    const publicJwk = await exportJWK(keys.publicKey);

    server = createServer((req, res) => {
      if (req.url === "/.well-known/jwks.json") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            keys: [{ ...publicJwk, kid, alg: "RS256", use: "sig" }],
          }),
        );
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        port = (server.address() as import("node:net").AddressInfo).port;
        resolve();
      });
    });
  });

  afterAll(() => {
    server.close();
  });

  it("verifies a valid RS256 token and returns its payload", async () => {
    const token = await new SignJWT({
      sub: "user-123",
      email: "test@example.com",
      email_verified: true,
      aud: "client-id",
      permissions: ["read", "write"],
    })
      .setProtectedHeader({ alg: "RS256", kid })
      .setExpirationTime("1h")
      .sign(privateKey);

    const verify = createTokenVerifier(`http://localhost:${port}`);
    const payload = await verify(token);

    expect(payload.sub).toBe("user-123");
    expect(payload.email).toBe("test@example.com");
    expect(payload.email_verified).toBe(true);
    expect(payload.permissions).toEqual(["read", "write"]);
  });

  it("rejects an expired token", async () => {
    const token = await new SignJWT({ sub: "user-123" })
      .setProtectedHeader({ alg: "RS256", kid })
      .setExpirationTime("-1h")
      .sign(privateKey);

    const verify = createTokenVerifier(`http://localhost:${port}`);
    await expect(verify(token)).rejects.toThrow();
  });

  it("rejects a token signed with the wrong key", async () => {
    const otherKeys = await generateKeyPair("RS256");
    const token = await new SignJWT({ sub: "user-123" })
      .setProtectedHeader({ alg: "RS256", kid: "wrong-kid" })
      .setExpirationTime("1h")
      .sign(otherKeys.privateKey);

    const verify = createTokenVerifier(`http://localhost:${port}`);
    await expect(verify(token)).rejects.toThrow();
  });
});
