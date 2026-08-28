# AuthForge

A developer-facing Identity & Access Management platform — authentication as a service that other applications integrate against, rather than a login page bolted onto one app.

Developers register an application, receive credentials, and delegate authentication for their own end-users to AuthForge.

---

## Status

**Foundation phase — complete and tested.** The developer-account layer works end to end: registration, authentication, session tokens, and a guard protecting authenticated routes.

The broader platform described in the [roadmap](#roadmap) — hosted login, OAuth2 authorization-code flow with PKCE, RBAC, MFA — is not built yet. This repository is honest about where that line falls.

| Area | State |
| --- | --- |
| Monorepo, TypeScript, database schema | Done |
| Developer signup / login / session tokens | Done |
| Authenticated-route guard | Done |
| Test suite | 25 tests |
| Applications, API keys, end-user auth | Planned |
| OAuth2 + PKCE, hosted login page | Planned |
| RBAC, MFA, audit log | Planned |

---

## Why this project

Authentication is deceptively hard. The naive version — hash a password, issue a token — passes a code review and fails a security review. This project exists to get the details right and to make the reasoning visible:

- **Timing-safe credential checks.** A login that returns faster for an unknown email than for a wrong password leaks which accounts exist. Both paths here perform the same Argon2 work.
- **Algorithm pinning.** JWT verification is pinned to HS256. A forged `alg: "none"` token is rejected — and there is a test proving it.
- **Race-safe registration.** Two concurrent signups for the same email produce exactly one `201` and one `409`, not a `500` from a raw constraint violation.
- **Revocation on every request.** The guard re-reads the developer from the database rather than trusting the token payload, so a deleted account cannot keep authenticating with a still-valid token.
- **No credential leakage by construction.** The client-visible shape is built in exactly one place, so a column added later cannot leak by default.

---

## Architecture

```
apps/
  api/                     Express + TypeScript service
    src/
      app.ts               createApp() — composable, no port binding
      env.ts               Zod-validated environment, fails fast at boot
      lib/
        password.ts        Argon2id hashing and verification
        session-token.ts   JWT signing and verification (HS256)
      middleware/
        error-handler.ts   HttpError -> JSON, central and last
        require-developer.ts   Bearer-token auth guard
      modules/
        developers/        schema (validation) / service (logic) / routes (HTTP)
    tests/                 Vitest + Supertest
packages/
  db/                      Prisma schema and shared client singleton
```

Each module is split three ways on purpose: **schema** validates input, **service** owns business logic and database access, **routes** handle only HTTP. Routes never touch the database; services never touch `req`/`res`.

`createApp()` returns an Express app without binding a port, so tests exercise the real HTTP stack in-process.

### Tech stack

TypeScript (strict) · Node 20+ · Express · PostgreSQL · Prisma · Argon2id · JSON Web Tokens · Zod · Vitest · Supertest · pnpm workspaces

---

## Quickstart

**Requirements:** Node 20+, pnpm 9+, and a PostgreSQL database.

```bash
git clone https://github.com/EnkayCodes/AuthForge.git
cd AuthForge
pnpm install
```

Create a `.env` in the repository root from the template:

```bash
cp .env.example .env
```

Fill in `DATABASE_URL` and `DIRECT_URL`, then generate a signing secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put that value in `SESSION_JWT_SECRET`. It must be at least 32 characters — the boot-time check rejects anything shorter.

Apply the schema and start the API:

```bash
pnpm db:migrate
pnpm dev:api
```

The API listens on `http://localhost:4000`. Confirm it is up:

```bash
curl http://localhost:4000/health
```

> **Using Supabase?** `.env.example` documents the two connection URLs it needs — the transaction pooler for queries and the session pooler for migrations — along with the TLS and timeout settings that avoid some non-obvious failure modes.

---

## API

All responses are JSON. Errors use a single consistent shape:

```json
{ "error": { "message": "Invalid credentials" } }
```

### `POST /developers/signup`

```json
{ "email": "dev@example.com", "password": "at-least-8-chars", "name": "Dev" }
```

`201` → `{ "developer": { "id", "email", "name" }, "token": "..." }`
`400` invalid payload · `409` email already registered

### `POST /developers/login`

```json
{ "email": "dev@example.com", "password": "at-least-8-chars" }
```

`200` → `{ "developer": { "id", "email", "name" }, "token": "..." }`
`401` invalid credentials — identical response whether the email is unknown or the password is wrong

### `GET /developers/me`

Requires `Authorization: Bearer <token>`.

`200` → `{ "developer": { "id", "email", "name" } }`
`401` missing, malformed, expired, or tampered token — or a token whose developer no longer exists

---

## Testing

```bash
pnpm test
```

25 tests covering password hashing, token signing and verification, and the full HTTP lifecycle of every endpoint.

Notable cases, because they are the ones that matter:

- A forged `alg: "none"` token is rejected
- A validly signed token carrying no subject is rejected
- An expired token is rejected
- A valid token for a deleted developer is rejected
- Concurrent duplicate signups yield exactly one `201` and one `409`
- A unique-constraint violation maps to `409`, while an unrelated database error still surfaces as `500`

Integration tests run against a real PostgreSQL database rather than mocks, so they exercise real constraints and real driver behaviour.

---

## Design decisions

**Argon2id, not bcrypt.** Memory-hard, and the current recommendation for password storage.

**Opaque failures.** Login returns the same status and message for an unknown email and a wrong password. The auth guard returns the same `401` whether the token was malformed or its developer was deleted. Neither should be an oracle.

**Fail fast on configuration.** Environment variables are validated at import time, so a missing or malformed value stops the process at boot instead of surfacing as a 500 on the first request.

**Errors are typed, not stringly.** Services throw `HttpError(status, message)`; one middleware translates them. Unexpected errors log server-side and return a generic message — internal details never reach the client.

**Migrations are checked in.** Schema changes are reviewable in version control and replayable in CI.

---

## Roadmap

Building toward the full platform, in order:

1. **Applications & API keys** — developers register apps and receive credentials
2. **End-user authentication** — accounts scoped per application, with email verification and password reset
3. **OAuth2 authorization-code flow with PKCE** — plus RS256 access tokens and a JWKS endpoint
4. **Hosted login page** — a themed universal login apps redirect to
5. **RBAC** — roles and permissions enforced in middleware
6. **MFA** — TOTP with recovery codes
7. **Refresh-token rotation** with reuse detection, session listing, and revocation
8. **Developer dashboard**, audit log viewer, and a TypeScript SDK

Deliberately out of scope for now: organizations and teams, SSO/SAML/SCIM, billing, and multi-language SDKs.

### Known limitations

Named rather than hidden, since this is a foundation rather than a finished product:

- No rate limiting or account lockout on authentication endpoints yet
- Session tokens are valid until expiry; there is no logout or token blocklist
- No security headers or CORS policy — the API is not browser-facing yet
