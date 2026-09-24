# @authforge/sdk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a thin TypeScript SDK (`packages/sdk`) that consumer Express apps use to integrate AuthForge OAuth2 authentication — PKCE flow, encrypted cookie sessions, JWKS token verification, and automatic refresh.

**Architecture:** The SDK is a single class (`AuthForge`) that produces Express route handlers (`login`, `callback`, `logout`) and middleware (`requireAuth`). Internally it delegates to three focused modules: `pkce.ts` (PKCE generation), `session.ts` (encrypted cookie I/O via jose JWE), and `jwks.ts` (remote JWKS verification via jose). No database, no Prisma — pure HTTP client against the AuthForge API.

**Tech Stack:** TypeScript (ES2022/NodeNext), jose (JWE + JWKS), Express 4 peer dependency, vitest

## Global Constraints

- Node >= 20, ESM (`"type": "module"`)
- Single runtime dependency: `jose ^5.0.0`
- Express 4+ as peer dependency — SDK never bundles Express
- Extends `tsconfig.base.json` from monorepo root
- Test runner: vitest (matches `apps/api` pattern)
- All imports use `.js` extensions (NodeNext resolution)
- The AuthForge API key token format is `af_<env>_<keyId>_<secret>` — the SDK accepts the full token string and sends it as `Authorization: Bearer <token>`

---

### Task 1: Package scaffold, types, and PKCE module

**Files:**
- Create: `packages/sdk/package.json`
- Create: `packages/sdk/tsconfig.json`
- Create: `packages/sdk/vitest.config.ts`
- Create: `packages/sdk/src/types.ts`
- Create: `packages/sdk/src/pkce.ts`
- Create: `packages/sdk/src/index.ts`
- Create: `packages/sdk/tests/pkce.test.ts`

**Interfaces:**
- Consumes: nothing (first task)
- Produces:
  - `AuthForgeConfig` interface (used by Tasks 2–5)
  - `AuthUser`, `SessionData`, `PendingData` interfaces (used by Tasks 2–5)
  - `generateCodeVerifier(): string` (used by Task 4)
  - `generateCodeChallenge(verifier: string): string` (used by Task 4)
  - `generateState(): string` (used by Task 4)

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@authforge/sdk",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "jose": "^5.0.0"
  },
  "peerDependencies": {
    "express": "^4.0.0 || ^5.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.16.0",
    "express": "^4.21.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

- [ ] **Step 3: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Create src/types.ts**

```ts
import type { Request, Response, NextFunction } from "express";

export interface AuthForgeConfig {
  baseUrl: string;
  clientId: string;
  redirectUri: string;
  apiKey: string;
  cookieSecret?: string;
  cookieName?: string;
  scope?: string;
  loginPath?: string;
  postLoginRedirect?: string;
  postLogoutRedirect?: string;
  onError?: (error: Error, req: Request) => void;
}

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  permissions: string[];
}

export interface SessionData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface PendingData {
  codeVerifier: string;
  state: string;
}

export type RequestHandler = (req: Request, res: Response, next: NextFunction) => void;

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
```

- [ ] **Step 5: Create src/index.ts (placeholder)**

```ts
export type { AuthForgeConfig, AuthUser } from "./types.js";
```

- [ ] **Step 6: Run pnpm install**

Run: `pnpm install`

Expected: installs jose and dev dependencies, links workspace package

- [ ] **Step 7: Write the failing PKCE tests**

Create `packages/sdk/tests/pkce.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { generateCodeVerifier, generateCodeChallenge, generateState } from "../src/pkce.js";

describe("generateCodeVerifier", () => {
  it("returns a string of at least 43 characters", () => {
    const verifier = generateCodeVerifier();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
  });

  it("returns a string of at most 128 characters", () => {
    const verifier = generateCodeVerifier();
    expect(verifier.length).toBeLessThanOrEqual(128);
  });

  it("uses only base64url characters", () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates unique values on each call", () => {
    const a = generateCodeVerifier();
    const b = generateCodeVerifier();
    expect(a).not.toBe(b);
  });
});

describe("generateCodeChallenge", () => {
  it("produces the SHA-256 base64url digest of the verifier", () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const expected = createHash("sha256").update(verifier).digest("base64url");
    expect(generateCodeChallenge(verifier)).toBe(expected);
  });

  it("matches the AuthForge API verification logic", () => {
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    const apiCheck = createHash("sha256").update(verifier).digest("base64url");
    expect(challenge).toBe(apiCheck);
  });
});

describe("generateState", () => {
  it("returns a non-empty string", () => {
    expect(generateState().length).toBeGreaterThan(0);
  });

  it("uses only base64url characters", () => {
    expect(generateState()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates unique values on each call", () => {
    expect(generateState()).not.toBe(generateState());
  });
});
```

- [ ] **Step 8: Run tests to verify they fail**

Run: `cd packages/sdk && pnpm test`

Expected: FAIL — `Cannot find module '../src/pkce.js'`

- [ ] **Step 9: Implement src/pkce.ts**

```ts
import { randomBytes, createHash } from "node:crypto";

export function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

export function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function generateState(): string {
  return randomBytes(16).toString("base64url");
}
```

- [ ] **Step 10: Run tests to verify they pass**

Run: `cd packages/sdk && pnpm test`

Expected: all 8 tests PASS

- [ ] **Step 11: Typecheck**

Run: `cd packages/sdk && pnpm typecheck`

Expected: no errors

- [ ] **Step 12: Commit**

```bash
git add packages/sdk/
git commit -m "feat(sdk): scaffold package and implement PKCE module"
```

---

### Task 2: Session encryption module

**Files:**
- Create: `packages/sdk/src/session.ts`
- Create: `packages/sdk/tests/session.test.ts`

**Interfaces:**
- Consumes: `SessionData`, `PendingData` from `types.ts` (Task 1)
- Produces:
  - `SessionManager` class with methods:
    - `constructor(secret: string)`
    - `encrypt(data: object): Promise<string>`
    - `decrypt<T>(jwe: string): Promise<T | null>`
  - `parseCookies(header: string | undefined): Record<string, string>`

- [ ] **Step 1: Write the failing session tests**

Create `packages/sdk/tests/session.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/sdk && pnpm test`

Expected: FAIL — `Cannot find module '../src/session.js'`

- [ ] **Step 3: Implement src/session.ts**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/sdk && pnpm test`

Expected: all 9 session tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/sdk/src/session.ts packages/sdk/tests/session.test.ts
git commit -m "feat(sdk): add encrypted session module"
```

---

### Task 3: JWKS token verification module

**Files:**
- Create: `packages/sdk/src/jwks.ts`
- Create: `packages/sdk/tests/jwks.test.ts`

**Interfaces:**
- Consumes: nothing directly (uses jose)
- Produces:
  - `createTokenVerifier(baseUrl: string): (token: string) => Promise<JWTPayload>` (used by Task 5)

- [ ] **Step 1: Write the failing JWKS tests**

Create `packages/sdk/tests/jwks.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/sdk && pnpm test`

Expected: FAIL — `Cannot find module '../src/jwks.js'`

- [ ] **Step 3: Implement src/jwks.ts**

```ts
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export function createTokenVerifier(
  baseUrl: string,
): (token: string) => Promise<JWTPayload> {
  const jwks = createRemoteJWKSet(
    new URL(`${baseUrl}/.well-known/jwks.json`),
  );

  return async (token: string): Promise<JWTPayload> => {
    const { payload } = await jwtVerify(token, jwks, {
      algorithms: ["RS256"],
    });
    return payload;
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/sdk && pnpm test`

Expected: all 3 JWKS tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/sdk/src/jwks.ts packages/sdk/tests/jwks.test.ts
git commit -m "feat(sdk): add JWKS token verification module"
```

---

### Task 4: AuthForge class — login, callback, logout

**Files:**
- Create: `packages/sdk/src/authforge.ts`
- Create: `packages/sdk/tests/authforge.test.ts`
- Modify: `packages/sdk/src/index.ts`
- Modify: `packages/sdk/package.json` (add supertest devDep)

**Interfaces:**
- Consumes:
  - `generateCodeVerifier()`, `generateCodeChallenge()`, `generateState()` from `pkce.ts` (Task 1)
  - `SessionManager`, `parseCookies` from `session.ts` (Task 2)
  - `createTokenVerifier` from `jwks.ts` (Task 3)
  - `AuthForgeConfig`, `SessionData`, `PendingData`, `RequestHandler` from `types.ts` (Task 1)
- Produces:
  - `AuthForge` class with methods:
    - `constructor(config: AuthForgeConfig)`
    - `login(): RequestHandler`
    - `callback(): RequestHandler`
    - `logout(): RequestHandler`
    - `requireAuth(): RequestHandler` (tested in Task 5)

- [ ] **Step 1: Add supertest devDependency**

Run: `cd packages/sdk && pnpm add -D supertest @types/supertest`

- [ ] **Step 2: Write the failing AuthForge tests**

Create `packages/sdk/tests/authforge.test.ts`:

```ts
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd packages/sdk && pnpm test`

Expected: FAIL — `Cannot find module '../src/authforge.js'`

- [ ] **Step 4: Implement src/authforge.ts**

```ts
import type { Request, Response, NextFunction } from "express";
import type {
  AuthForgeConfig,
  AuthUser,
  RequestHandler,
  SessionData,
  PendingData,
} from "./types.js";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from "./pkce.js";
import { SessionManager, parseCookies } from "./session.js";
import { createTokenVerifier } from "./jwks.js";
import { errors, type JWTPayload } from "jose";

export class AuthForge {
  private config: AuthForgeConfig;
  private session: SessionManager;
  private cookieName: string;
  private verifyToken: (token: string) => Promise<JWTPayload>;

  constructor(config: AuthForgeConfig) {
    this.config = config;
    const secret = config.cookieSecret ?? config.apiKey;
    this.cookieName = config.cookieName ?? "authforge.session";
    this.session = new SessionManager(secret);
    this.verifyToken = createTokenVerifier(config.baseUrl);
  }

  login(): RequestHandler {
    return async (req: Request, res: Response) => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      const state = generateState();

      const pending: PendingData = { codeVerifier: verifier, state };
      const encrypted = await this.session.encrypt(pending);

      res.cookie("authforge.pending", encrypted, {
        httpOnly: true,
        secure: req.protocol === "https",
        sameSite: "lax",
        path: "/",
        maxAge: 600_000,
      });

      const url = new URL(`${this.config.baseUrl}/authorize`);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", this.config.clientId);
      url.searchParams.set("redirect_uri", this.config.redirectUri);
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", challenge);
      url.searchParams.set("code_challenge_method", "S256");
      if (this.config.scope) url.searchParams.set("scope", this.config.scope);

      res.redirect(url.toString());
    };
  }

  callback(): RequestHandler {
    return async (req: Request, res: Response) => {
      try {
        const cookies = parseCookies(req.headers.cookie);
        const pendingCookie = cookies["authforge.pending"];
        if (!pendingCookie) {
          res.status(403).json({ error: "Missing pending cookie" });
          return;
        }

        const pending =
          await this.session.decrypt<PendingData>(pendingCookie);
        if (!pending) {
          res.status(403).json({ error: "Invalid pending cookie" });
          return;
        }

        const state = req.query.state as string | undefined;
        const code = req.query.code as string | undefined;

        if (!state || state !== pending.state) {
          res.status(403).json({ error: "Invalid state parameter" });
          return;
        }
        if (!code) {
          res.status(400).json({ error: "Missing authorization code" });
          return;
        }

        const tokenRes = await fetch(`${this.config.baseUrl}/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grant_type: "authorization_code",
            code,
            redirect_uri: this.config.redirectUri,
            client_id: this.config.clientId,
            code_verifier: pending.codeVerifier,
          }),
        });

        if (!tokenRes.ok) {
          res.status(502).json({ error: "Token exchange failed" });
          return;
        }

        const tokens = (await tokenRes.json()) as {
          access_token: string;
          token_type: string;
          expires_in: number;
          refresh_token: string;
        };

        const sessionData: SessionData = {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
        };

        const encrypted = await this.session.encrypt(sessionData);

        res.cookie(this.cookieName, encrypted, {
          httpOnly: true,
          secure: req.protocol === "https",
          sameSite: "lax",
          path: "/",
        });

        res.clearCookie("authforge.pending", { path: "/" });
        res.redirect(this.config.postLoginRedirect ?? "/");
      } catch (error) {
        this.config.onError?.(error as Error, req);
        res.status(500).json({ error: "Authentication failed" });
      }
    };
  }

  logout(): RequestHandler {
    return async (_req: Request, res: Response) => {
      res.clearCookie(this.cookieName, { path: "/" });
      res.redirect(this.config.postLogoutRedirect ?? "/");
    };
  }

  requireAuth(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const cookies = parseCookies(req.headers.cookie);
        const sessionCookie = cookies[this.cookieName];

        if (!sessionCookie) {
          this.unauthorized(req, res);
          return;
        }

        let session =
          await this.session.decrypt<SessionData>(sessionCookie);
        if (!session) {
          res.clearCookie(this.cookieName, { path: "/" });
          this.unauthorized(req, res);
          return;
        }

        try {
          const payload = await this.verifyToken(session.accessToken);
          req.user = this.payloadToUser(payload);
          next();
        } catch (error) {
          if (
            !(error instanceof errors.JWTExpired) ||
            !session.refreshToken
          ) {
            res.clearCookie(this.cookieName, { path: "/" });
            this.unauthorized(req, res);
            return;
          }

          const refreshRes = await fetch(
            `${this.config.baseUrl}/users/token/refresh`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.config.apiKey}`,
              },
              body: JSON.stringify({
                refreshToken: session.refreshToken,
              }),
            },
          );

          if (!refreshRes.ok) {
            res.clearCookie(this.cookieName, { path: "/" });
            this.unauthorized(req, res);
            return;
          }

          const tokens = (await refreshRes.json()) as {
            access_token: string;
            expires_in: number;
            refresh_token: string;
          };

          const newSession: SessionData = {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt:
              Math.floor(Date.now() / 1000) + tokens.expires_in,
          };

          const payload = await this.verifyToken(
            newSession.accessToken,
          );

          const encrypted = await this.session.encrypt(newSession);
          res.cookie(this.cookieName, encrypted, {
            httpOnly: true,
            secure: req.protocol === "https",
            sameSite: "lax",
            path: "/",
          });

          req.user = this.payloadToUser(payload);
          next();
        }
      } catch (error) {
        this.config.onError?.(error as Error, req);
        res.clearCookie(this.cookieName, { path: "/" });
        this.unauthorized(req, res);
      }
    };
  }

  private payloadToUser(payload: JWTPayload): AuthUser {
    return {
      id: payload.sub as string,
      email: payload.email as string,
      emailVerified: payload.email_verified as boolean,
      permissions: (payload.permissions as string[]) ?? [],
    };
  }

  private unauthorized(req: Request, res: Response): void {
    const accept = req.headers.accept ?? "";
    if (
      accept.includes("text/html") &&
      !accept.includes("application/json")
    ) {
      res.redirect(this.config.loginPath ?? "/auth/login");
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  }
}
```

- [ ] **Step 5: Update src/index.ts**

```ts
export { AuthForge } from "./authforge.js";
export type { AuthForgeConfig, AuthUser } from "./types.js";
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd packages/sdk && pnpm test`

Expected: all tests PASS (pkce, session, jwks, authforge)

- [ ] **Step 7: Typecheck**

Run: `cd packages/sdk && pnpm typecheck`

Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add packages/sdk/
git commit -m "feat(sdk): add AuthForge class with login, callback, and logout"
```

---

### Task 5: requireAuth middleware and integration tests

**Files:**
- Create: `packages/sdk/tests/integration.test.ts`

**Interfaces:**
- Consumes:
  - `AuthForge` class from `authforge.ts` (Task 4) — specifically its `requireAuth()` method
  - All internal modules from Tasks 1–3
- Produces: the final tested SDK (no new public API — `requireAuth` was already added in Task 4's implementation)

- [ ] **Step 1: Write the integration tests**

Create `packages/sdk/tests/integration.test.ts`:

```ts
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
});
```

- [ ] **Step 2: Run the integration tests**

Run: `cd packages/sdk && pnpm test`

Expected: all tests PASS (pkce, session, jwks, authforge, integration)

- [ ] **Step 3: Full typecheck across SDK**

Run: `cd packages/sdk && pnpm typecheck`

Expected: no errors

- [ ] **Step 4: Verify monorepo-wide typecheck**

Run: `pnpm typecheck` (from root)

Expected: all packages pass

- [ ] **Step 5: Commit**

```bash
git add packages/sdk/tests/integration.test.ts
git commit -m "feat(sdk): add requireAuth middleware and integration tests"
```
