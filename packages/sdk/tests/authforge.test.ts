import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { createServer, type Server } from "node:http";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import request from "supertest";
import { AuthForge } from "../src/authforge.js";

function extractCookieValue(
  res: request.Response,
  name: string,
): string | undefined {
  const header = res.headers["set-cookie"];
  if (!header) return undefined;
  const cookies = Array.isArray(header) ? header : [header];
  for (const c of cookies) {
    if (c.startsWith(`${name}=`)) {
      const val = c.split(";")[0].slice(name.length + 1);
      return val;
    }
  }
  return undefined;
}

describe("AuthForge", () => {
  let mockApiServer: Server;
  let mockApiPort: number;
  let privateKey: CryptoKey;
  const kid = "test-kid";

  beforeAll(async () => {
    const keys = await generateKeyPair("RS256");
    privateKey = keys.privateKey;
    const publicJwk = await exportJWK(keys.publicKey);

    const apiApp = express();
    apiApp.use(express.json());

    apiApp.get("/.well-known/jwks.json", (_req, res) => {
      res.json({
        keys: [{ ...publicJwk, kid, alg: "RS256", use: "sig" }],
      });
    });

    apiApp.post("/token", async (req, res) => {
      const token = await new SignJWT({
        sub: "user-123",
        email: "test@example.com",
        email_verified: true,
        aud: "test-client-id",
        permissions: ["read"],
      })
        .setProtectedHeader({ alg: "RS256", kid })
        .setExpirationTime("1h")
        .sign(privateKey);

      res.json({
        access_token: token,
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "refresh_abc",
      });
    });

    mockApiServer = createServer(apiApp);
    await new Promise<void>((resolve) => {
      mockApiServer.listen(0, () => {
        mockApiPort = (
          mockApiServer.address() as import("node:net").AddressInfo
        ).port;
        resolve();
      });
    });
  });

  afterAll(() => {
    mockApiServer.close();
  });

  function createApp() {
    const authforge = new AuthForge({
      baseUrl: `http://localhost:${mockApiPort}`,
      clientId: "test-client-id",
      redirectUri: `http://localhost:9999/auth/callback`,
      apiKey: "af_test_keyid123_secret456",
      cookieSecret: "test-cookie-secret-at-least-16",
    });

    const app = express();
    app.get("/auth/login", authforge.login());
    app.get("/auth/callback", authforge.callback());
    app.get("/auth/logout", authforge.logout());
    return app;
  }

  describe("login()", () => {
    it("redirects to the authorize endpoint with PKCE params", async () => {
      const app = createApp();
      const res = await request(app).get("/auth/login");

      expect(res.status).toBe(302);
      const location = new URL(res.headers.location);
      expect(location.pathname).toBe("/authorize");
      expect(location.searchParams.get("response_type")).toBe("code");
      expect(location.searchParams.get("client_id")).toBe("test-client-id");
      expect(location.searchParams.get("code_challenge_method")).toBe("S256");
      expect(location.searchParams.get("code_challenge")).toBeTruthy();
      expect(location.searchParams.get("state")).toBeTruthy();
    });

    it("sets the pending cookie", async () => {
      const app = createApp();
      const res = await request(app).get("/auth/login");
      const pending = extractCookieValue(res, "authforge.pending");
      expect(pending).toBeTruthy();
    });
  });

  describe("login() → callback() flow", () => {
    it("exchanges the code, sets session cookie, and redirects", async () => {
      const app = createApp();

      const loginRes = await request(app).get("/auth/login");
      const pendingCookie = extractCookieValue(loginRes, "authforge.pending");
      const location = new URL(loginRes.headers.location);
      const state = location.searchParams.get("state");

      const callbackRes = await request(app)
        .get(`/auth/callback?code=mock-code&state=${state}`)
        .set("Cookie", `authforge.pending=${pendingCookie}`);

      expect(callbackRes.status).toBe(302);
      expect(callbackRes.headers.location).toBe("/");
      const session = extractCookieValue(callbackRes, "authforge.session");
      expect(session).toBeTruthy();
    });

    it("returns 403 on state mismatch", async () => {
      const app = createApp();

      const loginRes = await request(app).get("/auth/login");
      const pendingCookie = extractCookieValue(loginRes, "authforge.pending");

      const res = await request(app)
        .get("/auth/callback?code=mock-code&state=wrong-state")
        .set("Cookie", `authforge.pending=${pendingCookie}`);

      expect(res.status).toBe(403);
    });

    it("returns 403 when pending cookie is missing", async () => {
      const app = createApp();
      const res = await request(app).get(
        "/auth/callback?code=mock-code&state=any",
      );
      expect(res.status).toBe(403);
    });
  });

  describe("logout()", () => {
    it("clears the session cookie and redirects", async () => {
      const app = createApp();
      const res = await request(app).get("/auth/logout");

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/");
      const cookies = res.headers["set-cookie"];
      const cleared = Array.isArray(cookies)
        ? cookies.find((c: string) => c.includes("authforge.session="))
        : cookies;
      expect(cleared).toContain("Expires=");
    });
  });
});
