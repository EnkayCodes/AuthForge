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
