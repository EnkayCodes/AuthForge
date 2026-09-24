import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { createServer, type Server } from "node:http";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import request from "supertest";
import { AuthForge } from "../src/authforge.js";
import { SessionManager } from "../src/session.js";
import type { SessionData } from "../src/types.js";

function extractCookieValue(
  res: request.Response,
  name: string,
): string | undefined {
  const header = res.headers["set-cookie"];
  if (!header) return undefined;
  const cookies = Array.isArray(header) ? header : [header];
  for (const c of cookies) {
    if (c.startsWith(`${name}=`)) {
      return c.split(";")[0].slice(name.length + 1);
    }
  }
  return undefined;
}

describe("Full OAuth flow integration", () => {
  let mockApiServer: Server;
  let mockApiPort: number;
  let privateKey: CryptoKey;
  const kid = "integration-kid";

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
        sub: "user-456",
        email: "integration@example.com",
        email_verified: true,
        aud: "int-client",
        permissions: ["admin"],
      })
        .setProtectedHeader({ alg: "RS256", kid })
        .setExpirationTime("1h")
        .sign(privateKey);

      res.json({
        access_token: token,
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "refresh_int_abc",
      });
    });

    apiApp.post("/users/token/refresh", async (req, res) => {
      const auth = req.headers.authorization ?? "";
      if (!auth.startsWith("Bearer af_")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const token = await new SignJWT({
        sub: "user-456",
        email: "integration@example.com",
        email_verified: true,
        aud: "int-client",
        permissions: ["admin"],
      })
        .setProtectedHeader({ alg: "RS256", kid })
        .setExpirationTime("1h")
        .sign(privateKey);

      res.json({
        access_token: token,
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "refresh_int_renewed",
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

  function buildApp() {
    const authforge = new AuthForge({
      baseUrl: `http://localhost:${mockApiPort}`,
      clientId: "int-client",
      redirectUri: "http://localhost:9999/auth/callback",
      apiKey: "af_test_intkey_intsecret",
      cookieSecret: "integration-test-secret-key",
    });

    const app = express();
    app.get("/auth/login", authforge.login());
    app.get("/auth/callback", authforge.callback());
    app.get("/auth/logout", authforge.logout());
    app.get("/protected", authforge.requireAuth(), (req, res) => {
      res.json({ user: req.user });
    });
    app.get("/api/data", authforge.requireAuth(), (req, res) => {
      res.json({ data: "secret", user: req.user });
    });
    return app;
  }

  it("login → callback → protected route → logout", async () => {
    const app = buildApp();

    const loginRes = await request(app).get("/auth/login");
    expect(loginRes.status).toBe(302);
    const pendingCookie = extractCookieValue(
      loginRes,
      "authforge.pending",
    );
    const state = new URL(loginRes.headers.location).searchParams.get(
      "state",
    );

    const callbackRes = await request(app)
      .get(`/auth/callback?code=test-code&state=${state}`)
      .set("Cookie", `authforge.pending=${pendingCookie}`);
    expect(callbackRes.status).toBe(302);
    const sessionCookie = extractCookieValue(
      callbackRes,
      "authforge.session",
    );
    expect(sessionCookie).toBeTruthy();

    const protectedRes = await request(app)
      .get("/protected")
      .set("Cookie", `authforge.session=${sessionCookie}`);
    expect(protectedRes.status).toBe(200);
    expect(protectedRes.body.user).toEqual({
      id: "user-456",
      email: "integration@example.com",
      emailVerified: true,
      permissions: ["admin"],
    });

    const logoutRes = await request(app)
      .get("/auth/logout")
      .set("Cookie", `authforge.session=${sessionCookie}`);
    expect(logoutRes.status).toBe(302);
  });

  it("requireAuth returns 401 for JSON requests without a session", async () => {
    const app = buildApp();
    const res = await request(app)
      .get("/api/data")
      .set("Accept", "application/json");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("requireAuth redirects HTML requests without a session", async () => {
    const app = buildApp();
    const res = await request(app)
      .get("/protected")
      .set("Accept", "text/html");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/auth/login");
  });

  it("requireAuth clears cookie on malformed session", async () => {
    const app = buildApp();
    const res = await request(app)
      .get("/api/data")
      .set("Accept", "application/json")
      .set("Cookie", "authforge.session=garbage-not-jwe");
    expect(res.status).toBe(401);
  });

  it("refreshes an expired access token and sets a new session cookie", async () => {
    const app = buildApp();

    const expiredAccessToken = await new SignJWT({
      sub: "user-456",
      email: "integration@example.com",
      email_verified: true,
      aud: "int-client",
      permissions: ["admin"],
    })
      .setProtectedHeader({ alg: "RS256", kid })
      .setExpirationTime("-1s")
      .sign(privateKey);

    const session = new SessionManager("integration-test-secret-key");
    const sessionData: SessionData = {
      accessToken: expiredAccessToken,
      refreshToken: "refresh_int_expiring",
      expiresAt: Math.floor(Date.now() / 1000) - 1,
    };
    const encryptedSession = await session.encrypt(sessionData);

    const res = await request(app)
      .get("/protected")
      .set("Cookie", `authforge.session=${encryptedSession}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({
      id: "user-456",
      email: "integration@example.com",
      emailVerified: true,
      permissions: ["admin"],
    });

    const newSessionCookie = extractCookieValue(res, "authforge.session");
    expect(newSessionCookie).toBeTruthy();
    expect(newSessionCookie).not.toBe(encryptedSession);

    const decoded = await session.decrypt<SessionData>(newSessionCookie!);
    expect(decoded?.refreshToken).toBe("refresh_int_renewed");
  });
});
