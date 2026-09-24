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

        const session =
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
