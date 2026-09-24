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
