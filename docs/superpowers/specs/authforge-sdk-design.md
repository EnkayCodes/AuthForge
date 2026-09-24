# @authforge/sdk — Design Spec

## Overview

A thin TypeScript SDK for consumer applications to integrate AuthForge authentication. Handles the OAuth2 Authorization Code + PKCE flow, encrypted session management, JWKS-based token verification, and automatic token refresh. Runs as Express-compatible middleware.

## Package Structure

```
packages/sdk/
├── src/
│   ├── index.ts          # Public API re-exports
│   ├── authforge.ts      # AuthForge class (main entry point)
│   ├── pkce.ts           # PKCE code_verifier + code_challenge generation
│   ├── jwks.ts           # Remote JWKS set + token verification
│   ├── session.ts        # Encrypted cookie session (read/write/clear)
│   └── types.ts          # Shared TypeScript interfaces
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Configuration

```ts
interface AuthForgeConfig {
  baseUrl: string;           // AuthForge API origin (e.g. "https://auth.example.com")
  clientId: string;          // Application client_id from AuthForge dashboard
  redirectUri: string;       // OAuth callback URL (e.g. "http://localhost:4000/auth/callback")
  apiKey: {
    id: string;              // API key ID for refresh token endpoint
    secret: string;          // API key secret
  };
  cookieSecret?: string;     // Session encryption key (defaults to apiKey.secret via HKDF)
  cookieName?: string;       // Session cookie name (default: "authforge.session")
  scope?: string;            // OAuth scope string
  postLoginRedirect?: string;  // Where to redirect after callback (default: "/")
  postLogoutRedirect?: string; // Where to redirect after logout (default: "/")
  onError?: (error: Error, req: Request) => void; // Optional error logging hook
}
```

### Dependency

Single external dependency: `jose` (zero-dep JWT/JWE/JWKS library).

## PKCE & OAuth Flow

### `login(req, res)` → void

1. Generates a cryptographically random `code_verifier` (43–128 characters, base64url charset)
2. Derives `code_challenge` via SHA-256 + base64url encoding
3. Generates a random `state` parameter
4. Stores `{ codeVerifier, state }` in an encrypted pending cookie (`authforge.pending`, maxAge 600s)
5. Redirects to `{baseUrl}/authorize` with query parameters:
   - `response_type=code`
   - `client_id`
   - `redirect_uri`
   - `state`
   - `code_challenge`
   - `code_challenge_method=S256`
   - `scope` (if configured)

### `callback(req, res)` → void

1. Reads and decrypts the pending cookie
2. Validates `req.query.state` matches the stored state — returns 403 on mismatch
3. POSTs to `{baseUrl}/token` with:
   - `grant_type=authorization_code`
   - `code` (from query string)
   - `redirect_uri`
   - `client_id`
   - `code_verifier` (from pending cookie)
4. Receives `{ access_token, token_type, expires_in, refresh_token }`
5. Stores tokens in an encrypted session cookie
6. Clears the pending cookie
7. Redirects to `/` (or configurable post-login redirect)

### `logout(req, res)` → void

Clears the session cookie and redirects to `/` (or configurable post-logout redirect).

## JWKS Verification & Token Refresh

### JWKS Setup

Uses `jose.createRemoteJWKSet()` pointing at `{baseUrl}/.well-known/jwks.json`. The jose library handles caching and automatic re-fetch on key-id (kid) miss.

### `requireAuth()` → Express middleware

1. Reads and decrypts the session cookie
2. If no session exists → responds based on `Accept` header: JSON requests get 401, browser requests (Accept: text/html) redirect to login
3. Verifies the access token using the remote JWKS:
   - `jose.jwtVerify(accessToken, jwks, { algorithms: ["RS256"] })`
4. If token is expired but refresh token exists:
   - POSTs to `{baseUrl}/users/token/refresh` with API key auth (`Authorization: Basic base64(keyId:secret)`) and body `{ refreshToken }`
   - Receives new `{ access_token, expires_in, refresh_token }`
   - Updates the session cookie with new tokens
   - Re-verifies the new access token
5. On success, populates `req.user`:
   ```ts
   interface AuthUser {
     id: string;            // JWT sub claim
     email: string;
     emailVerified: boolean;
     permissions: string[];
   }
   ```
6. On failure (invalid token, refresh failed) → clears session, returns 401 (JSON) or redirects to login (HTML)

## Session Management & Security

### Encrypted Cookie Session (`session.ts`)

- Uses `jose.CompactEncrypt` / `jose.compactDecrypt` with A256GCM to encrypt session data into a single httpOnly cookie
- Cookie secret derived from `cookieSecret` config, or from `apiKey.secret` via HKDF if not provided
- Session payload shape: `{ accessToken, refreshToken, expiresAt }` — JSON, encrypted, stored as one cookie value

### Cookie Settings

| Setting     | Value                                                      |
|-------------|-------------------------------------------------------------|
| `httpOnly`  | `true` — no JavaScript access                              |
| `secure`    | `true` in production (auto-detected from `req.protocol`)    |
| `sameSite`  | `"lax"` — allows the OAuth redirect back                   |
| `path`      | `"/"`                                                       |
| `maxAge`    | Not set (browser session lifetime; refresh token expiry is the real TTL) |

### Pending Cookie (PKCE state during login)

- Same encryption scheme, separate cookie name (`authforge.pending`)
- `maxAge: 600` (10 minutes, matches authorization code TTL)
- Cleared after callback completes

## Error Handling

| Scenario                        | Behavior                                                    |
|---------------------------------|--------------------------------------------------------------|
| Network error (API unreachable) | Pass through last valid token if not expired; otherwise 503  |
| Invalid/expired refresh token   | Clear session, redirect to login (or 401 for API routes)     |
| JWKS fetch failure              | `jose` retries internally; if persistent, 503                |
| Malformed cookie                | Treat as no session — redirect to login                      |
| State mismatch on callback      | 403 "Invalid state parameter"                                |

The SDK does not throw from middleware — all errors are caught and result in appropriate HTTP status codes. Consumers can optionally provide an `onError` callback in config for logging/monitoring.

## Testing Strategy

### Unit Tests

- PKCE generation: verifier length within 43–128 range, challenge matches S256 of verifier
- Session encrypt/decrypt round-trip: payload survives encryption and decryption
- `req.user` population: JWT claims correctly mapped to `AuthUser` shape

### Integration Tests

- Mock AuthForge API with a lightweight HTTP server
- Full flow: login → callback → requireAuth → token refresh → logout
- Edge cases: expired tokens, invalid state, malformed cookies

### Test Runner

Vitest — consistent with the rest of the monorepo.
