import jwt from "jsonwebtoken";
import { prisma } from "@authforge/db";
import { env } from "../../env.js";
import { HttpError } from "../../middleware/error-handler.js";
import { issueAuthorizationCode } from "./oauth.service.js";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

interface AuthForgeOAuthState {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scope: string;
}

export function buildGoogleAuthUrl(
  params: AuthForgeOAuthState,
  callbackUrl: string,
): string {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new HttpError(501, "Google login is not configured");
  }

  const statePayload = jwt.sign(params, env.SESSION_JWT_SECRET, {
    expiresIn: "10m",
  });

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", statePayload);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export function decodeGoogleState(state: string): AuthForgeOAuthState {
  try {
    return jwt.verify(state, env.SESSION_JWT_SECRET) as AuthForgeOAuthState;
  } catch {
    throw new HttpError(400, "Invalid or expired state");
  }
}

interface GoogleTokenResponse {
  id_token: string;
  access_token: string;
}

interface GoogleIdTokenPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
}

export async function exchangeGoogleCode(
  code: string,
  callbackUrl: string,
): Promise<GoogleIdTokenPayload> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new HttpError(501, "Google login is not configured");
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: callbackUrl,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    throw new HttpError(400, "Failed to exchange Google authorization code");
  }

  const data = (await res.json()) as GoogleTokenResponse;
  const payload = jwt.decode(data.id_token) as GoogleIdTokenPayload | null;
  if (!payload?.email || !payload.sub) {
    throw new HttpError(400, "Invalid Google ID token");
  }

  return payload;
}

export async function findOrCreateGoogleUser(
  applicationId: string,
  googleUser: GoogleIdTokenPayload,
): Promise<string> {
  const existing = await prisma.endUser.findUnique({
    where: {
      applicationId_email: {
        applicationId,
        email: googleUser.email,
      },
    },
    include: { oauthAccounts: true },
  });

  if (existing) {
    const hasGoogleLink = existing.oauthAccounts.some(
      (a) => a.provider === "google" && a.providerUserId === googleUser.sub,
    );
    if (!hasGoogleLink) {
      await prisma.oAuthAccount.create({
        data: {
          endUserId: existing.id,
          provider: "google",
          providerUserId: googleUser.sub,
        },
      });
    }

    if (googleUser.email_verified && !existing.emailVerifiedAt) {
      await prisma.endUser.update({
        where: { id: existing.id },
        data: { emailVerifiedAt: new Date() },
      });
    }

    return existing.id;
  }

  const endUser = await prisma.endUser.create({
    data: {
      applicationId,
      email: googleUser.email,
      emailVerifiedAt: googleUser.email_verified ? new Date() : null,
      oauthAccounts: {
        create: {
          provider: "google",
          providerUserId: googleUser.sub,
        },
      },
    },
  });

  return endUser.id;
}

export async function handleGoogleCallback(
  code: string,
  stateJwt: string,
  callbackUrl: string,
): Promise<string> {
  const params = decodeGoogleState(stateJwt);
  const googleUser = await exchangeGoogleCode(code, callbackUrl);

  const application = await prisma.application.findUnique({
    where: { clientId: params.clientId },
  });
  if (!application) throw new HttpError(400, "Unknown client_id");
  if (!application.redirectUris.includes(params.redirectUri)) {
    throw new HttpError(400, "Invalid redirect_uri");
  }

  const endUserId = await findOrCreateGoogleUser(application.id, googleUser);

  const authCode = await issueAuthorizationCode(
    application.id,
    endUserId,
    params.redirectUri,
    params.codeChallenge,
    params.scope,
  );

  const redirectUrl = new URL(params.redirectUri);
  redirectUrl.searchParams.set("code", authCode);
  redirectUrl.searchParams.set("state", params.state);
  return redirectUrl.toString();
}
