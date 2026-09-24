# Acme Notes Demo App — Design Spec

## Overview

A minimal Express app that showcases the `@authforge/sdk` in a real consumer application. Demonstrates the full OAuth2 PKCE login flow, protected routes, user identity display, and logout — the exact integration a developer would build when adopting AuthForge.

Lives at `apps/demo/` in the monorepo. Nicknamed "Acme Notes" but the app itself is a simple authenticated dashboard, not a notes CRUD — the goal is to demonstrate SDK integration, not build a feature-rich app.

## App Structure & Routes

```
apps/demo/
├── src/
│   └── app.ts          # Express app: config, routes, server
├── package.json
├── tsconfig.json
└── .env.example
```

Single Express file with 5 routes:

| Route              | Handler               | Auth     | Purpose                                    |
|--------------------|----------------------|----------|--------------------------------------------|
| `GET /`            | Inline                | Public   | Landing page with "Sign in" link           |
| `GET /auth/login`  | `auth.login()`        | Public   | SDK redirects to AuthForge `/authorize`    |
| `GET /auth/callback`| `auth.callback()`    | Public   | SDK handles token exchange, sets session   |
| `GET /auth/logout` | `auth.logout()`       | Public   | SDK clears session, redirects to `/`       |
| `GET /dashboard`   | `auth.requireAuth()` + handler | Protected | Shows authenticated user info     |

The `GET /` route renders a public landing page. If the user visits `/dashboard` without a session, the SDK's `requireAuth()` middleware detects the HTML `Accept` header and redirects to `/auth/login` automatically.

## SDK Integration & Configuration

One `AuthForge` instance created at startup:

```ts
import { AuthForge } from "@authforge/sdk";

const auth = new AuthForge({
  baseUrl: process.env.AUTHFORGE_URL!,
  clientId: process.env.CLIENT_ID!,
  redirectUri: process.env.REDIRECT_URI!,
  apiKey: process.env.API_KEY!,
  postLoginRedirect: "/dashboard",
  postLogoutRedirect: "/",
  onError: (err) => console.error("[AuthForge]", err.message),
});
```

### Environment Variables

`.env.example` contains:

```env
AUTHFORGE_URL=http://localhost:4000
CLIENT_ID=<your-application-client-id>
REDIRECT_URI=http://localhost:3001/auth/callback
API_KEY=<your-api-key>
PORT=3001
```

### Package Configuration

- **Port:** 3001 (avoids conflict with API on 4000 and web on 3000)
- **Dependencies:** `express`, `@authforge/sdk`
- **Dev dependencies:** `tsx`, `@types/express`
- **Dev script:** `tsx watch src/app.ts`
- **Package name:** `@authforge/demo`

## HTML Templates & Error Handling

Two pages rendered via template literal functions — no template engine dependency.

### Layout Helper

A `layout(title, body)` function wraps content in a shared HTML shell with minimal inline CSS for readability.

### Home Page (`GET /`)

Displays:
- App name ("Acme Notes")
- Brief tagline
- "Sign in with AuthForge" link pointing to `/auth/login`

### Dashboard Page (`GET /dashboard`)

Protected by `auth.requireAuth()`. Displays `req.user` fields:
- **id** — the end-user's AuthForge ID
- **email** — the user's email address
- **emailVerified** — boolean verification status
- **permissions** — array of permission strings (empty if none assigned)
- "Sign out" link pointing to `/auth/logout`

### Error Handling

- `onError` callback logs to console — no crash on SDK errors
- The SDK handles 401 → redirect to login automatically via `requireAuth()`
- No custom error page; Express default error handling is sufficient for a demo

## File Count

4 files total: `app.ts`, `package.json`, `tsconfig.json`, `.env.example`.
