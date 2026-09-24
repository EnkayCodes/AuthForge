# Acme Notes Demo App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal Express app at `apps/demo/` that showcases `@authforge/sdk` integration — login, protected routes, user display, and logout via OAuth2 PKCE.

**Architecture:** Single Express server (`app.ts`) with 5 routes. Three SDK middleware handlers (`login()`, `callback()`, `logout()`) plus `requireAuth()` guarding the dashboard. HTML rendered via template literal functions — no template engine. Config from environment variables.

**Tech Stack:** Express 4, `@authforge/sdk` (workspace dependency), tsx (dev runner), TypeScript (NodeNext modules)

## Global Constraints

- Package name: `@authforge/demo`
- Port: 3001 (avoids API on 4000, web on 3000)
- Module system: ESM (`"type": "module"`) — all local imports use `.js` extensions
- tsconfig extends `../../tsconfig.base.json` (target ES2022, module NodeNext)
- No template engine — HTML via template literal functions only
- No test suite — the demo IS the integration test of the SDK; verification is manual
- 4 files total: `apps/demo/src/app.ts`, `apps/demo/package.json`, `apps/demo/tsconfig.json`, `apps/demo/.env.example`

---

### Task 1: Package scaffold and configuration

**Files:**
- Create: `apps/demo/package.json`
- Create: `apps/demo/tsconfig.json`
- Create: `apps/demo/.env.example`

**Interfaces:**
- Consumes: nothing
- Produces: A valid pnpm workspace package that later tasks build on. `pnpm install` succeeds, `pnpm --filter @authforge/demo typecheck` will work once `app.ts` exists.

- [ ] **Step 1: Create `apps/demo/package.json`**

```json
{
  "name": "@authforge/demo",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/app.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@authforge/sdk": "workspace:*",
    "express": "^4.21.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "tsx": "^4.19.0"
  }
}
```

- [ ] **Step 2: Create `apps/demo/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `apps/demo/.env.example`**

```env
AUTHFORGE_URL=http://localhost:4000
CLIENT_ID=<your-application-client-id>
REDIRECT_URI=http://localhost:3001/auth/callback
API_KEY=<your-api-key>
PORT=3001
```

- [ ] **Step 4: Install dependencies**

Run: `pnpm install` (from repo root)

Expected: Installs successfully, `apps/demo/node_modules` is populated, `@authforge/sdk` resolves to the workspace package.

- [ ] **Step 5: Verify typecheck scaffold**

Run: `pnpm --filter @authforge/demo typecheck`

Expected: Succeeds (no `.ts` files yet, so nothing to check — confirms config is valid).

- [ ] **Step 6: Commit**

```bash
git add apps/demo/package.json apps/demo/tsconfig.json apps/demo/.env.example pnpm-lock.yaml
git commit -m "feat(demo): scaffold Acme Notes demo package"
```

---

### Task 2: Express app with SDK integration

**Files:**
- Create: `apps/demo/src/app.ts`

**Interfaces:**
- Consumes: `@authforge/sdk` exports `AuthForge` class and `AuthForgeConfig` type. The `AuthForge` constructor takes an `AuthForgeConfig` object. Methods used: `auth.login()`, `auth.callback()`, `auth.logout()` each return `RequestHandler`. `auth.requireAuth()` returns `RequestHandler` that populates `req.user` with `{ id: string, email: string, emailVerified: boolean, permissions: string[] }`.
- Produces: A runnable Express server — the final deliverable.

- [ ] **Step 1: Create `apps/demo/src/app.ts` with the layout helper**

Write the `layout()` template function and the `homePage()` template function at the top of the file, plus the Express app skeleton with no routes yet:

```ts
import express from "express";
import { AuthForge } from "@authforge/sdk";

const app = express();
const port = Number(process.env.PORT) || 3001;

// --- HTML templates ---

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 640px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
    a { color: #2563eb; }
    h1 { margin-bottom: 0.5rem; }
    p { margin-bottom: 1rem; }
    dl { margin: 1rem 0; }
    dt { font-weight: 600; margin-top: 0.75rem; }
    dd { margin-left: 1rem; color: #4b5563; }
  </style>
</head>
<body>${body}</body>
</html>`;
}

function homePage(): string {
  return layout(
    "Acme Notes",
    `<h1>Acme Notes</h1>
     <p>A demo app powered by AuthForge.</p>
     <p><a href="/auth/login">Sign in with AuthForge &rarr;</a></p>`,
  );
}

function dashboardPage(user: { id: string; email: string; emailVerified: boolean; permissions: string[] }): string {
  return layout(
    "Dashboard — Acme Notes",
    `<h1>Dashboard</h1>
     <dl>
       <dt>User ID</dt>
       <dd>${user.id}</dd>
       <dt>Email</dt>
       <dd>${user.email}</dd>
       <dt>Email verified</dt>
       <dd>${String(user.emailVerified)}</dd>
       <dt>Permissions</dt>
       <dd>${user.permissions.length > 0 ? user.permissions.join(", ") : "none"}</dd>
     </dl>
     <p><a href="/auth/logout">Sign out</a></p>`,
  );
}

// --- AuthForge SDK ---

const auth = new AuthForge({
  baseUrl: process.env.AUTHFORGE_URL!,
  clientId: process.env.CLIENT_ID!,
  redirectUri: process.env.REDIRECT_URI!,
  apiKey: process.env.API_KEY!,
  postLoginRedirect: "/dashboard",
  postLogoutRedirect: "/",
  onError: (err) => console.error("[AuthForge]", err.message),
});

// --- Routes ---

app.get("/", (_req, res) => {
  res.type("html").send(homePage());
});

app.get("/auth/login", auth.login());
app.get("/auth/callback", auth.callback());
app.get("/auth/logout", auth.logout());

app.get("/dashboard", auth.requireAuth(), (req, res) => {
  res.type("html").send(dashboardPage(req.user!));
});

// --- Start ---

app.listen(port, () => {
  console.log(`Acme Notes demo running at http://localhost:${port}`);
});
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm --filter @authforge/demo typecheck`

Expected: Succeeds with no errors. Confirms all SDK types resolve, `req.user` augmentation works, and template functions type-check.

- [ ] **Step 3: Verify server starts**

Run: `pnpm --filter @authforge/demo dev`

Expected: Prints `Acme Notes demo running at http://localhost:3001`. Kill the process after confirming.

Note: The SDK requires `AUTHFORGE_URL`, `CLIENT_ID`, `REDIRECT_URI`, and `API_KEY` to be set. For a quick start test, copy `.env.example` to `.env` and fill in real values from an AuthForge application, or just confirm the server starts (the routes will fail at runtime without valid config, but the process won't crash — `onError` catches SDK errors).

- [ ] **Step 4: Commit**

```bash
git add apps/demo/src/app.ts
git commit -m "feat(demo): add Express app with SDK login, dashboard, and logout"
```

- [ ] **Step 5: Add root dev script for the demo**

In the root `package.json`, add a `dev:demo` script alongside the existing `dev:api` and `dev:web`:

```json
"dev:demo": "pnpm --filter @authforge/demo dev"
```

- [ ] **Step 6: Commit root package.json change**

```bash
git add package.json
git commit -m "chore: add dev:demo script to root package.json"
```
