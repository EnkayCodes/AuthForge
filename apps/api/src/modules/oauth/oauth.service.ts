import { prisma } from "@authforge/db";
import { generateSingleUseToken, hashSingleUseToken } from "../../lib/single-use-token.js";
import { verifyCodeChallenge } from "../../lib/pkce.js";
import { signAccessToken } from "../../lib/jwks.js";
import { issueRefreshToken } from "../end-users/refresh-token.service.js";
import { toPublicEndUser } from "../end-users/end-user.service.js";
import { parseRefreshTokenTtl } from "../../lib/ttl.js";
import { HttpError } from "../../middleware/error-handler.js";
import { TRANSACTION_OPTIONS } from "../../lib/transaction.js";

const CODE_TTL_SECONDS = 600;

export interface AuthorizeParams {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope?: string;
}

export async function validateAuthorizeRequest(params: AuthorizeParams) {
  if (params.codeChallengeMethod !== "S256") {
    throw new HttpError(400, "Only S256 code_challenge_method is supported");
  }

  const application = await prisma.application.findUnique({
    where: { clientId: params.clientId },
  });
  if (!application) {
    throw new HttpError(400, "Unknown client_id");
  }
  if (!application.redirectUris.includes(params.redirectUri)) {
    throw new HttpError(400, "Invalid redirect_uri");
  }

  return application;
}

export async function issueAuthorizationCode(
  applicationId: string,
  endUserId: string,
  redirectUri: string,
  codeChallenge: string,
  scope: string,
): Promise<string> {
  const { token, tokenHash, expiresAt } = generateSingleUseToken(CODE_TTL_SECONDS);
  await prisma.authorizationCode.create({
    data: {
      applicationId,
      endUserId,
      codeHash: tokenHash,
      redirectUri,
      codeChallenge,
      scope,
      expiresAt,
    },
  });
  return token;
}

export interface TokenResult {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
}

export async function exchangeAuthorizationCode(
  clientId: string,
  code: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<TokenResult> {
  const codeHash = hashSingleUseToken(code);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const authCode = await tx.authorizationCode.findUnique({
      where: { codeHash },
      include: { application: true, endUser: true },
    });

    if (!authCode) throw new HttpError(400, "invalid_grant");
    if (authCode.application.clientId !== clientId) throw new HttpError(400, "invalid_grant");
    if (authCode.usedAt) throw new HttpError(400, "invalid_grant");
    if (authCode.expiresAt <= now) throw new HttpError(400, "invalid_grant");
    if (authCode.redirectUri !== redirectUri) throw new HttpError(400, "invalid_grant");

    if (!verifyCodeChallenge(codeVerifier, authCode.codeChallenge)) {
      throw new HttpError(400, "invalid_grant");
    }

    await tx.authorizationCode.update({
      where: { id: authCode.id },
      data: { usedAt: now },
    });

    const pub = toPublicEndUser(authCode.endUser);
    const accessToken = signAccessToken(
      {
        sub: pub.id,
        email: pub.email,
        email_verified: pub.emailVerified,
        aud: authCode.application.clientId,
      },
      authCode.application.accessTokenTtl,
    );

    const ttlSeconds = parseRefreshTokenTtl(authCode.application.refreshTokenTtl);
    const { token: refreshToken } = await issueRefreshToken(
      authCode.endUserId,
      ttlSeconds,
    );

    const accessTtlSeconds = parseRefreshTokenTtl(authCode.application.accessTokenTtl);

    return {
      access_token: accessToken,
      token_type: "Bearer" as const,
      expires_in: accessTtlSeconds,
      refresh_token: refreshToken,
    };
  }, TRANSACTION_OPTIONS);
}
