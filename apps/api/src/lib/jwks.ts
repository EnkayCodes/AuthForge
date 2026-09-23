import crypto from "node:crypto";
import jwt from "jsonwebtoken";

export interface JwkPublicKey {
  kty: "RSA";
  use: "sig";
  alg: "RS256";
  kid: string;
  n: string;
  e: string;
}

export interface Jwks {
  keys: JwkPublicKey[];
}

interface KeyMaterial {
  kid: string;
  privateKey: string;
  publicKey: string;
}

let _keys: KeyMaterial | undefined;

function base64urlEncode(buf: Buffer): string {
  return buf.toString("base64url");
}

function loadOrGenerateKeys(): KeyMaterial {
  if (_keys) return _keys;

  const envPrivate = process.env.RS256_PRIVATE_KEY;
  const envPublic = process.env.RS256_PUBLIC_KEY;
  const envKid = process.env.RS256_KEY_ID;

  if (envPrivate && envPublic && envKid) {
    _keys = {
      kid: envKid,
      privateKey: envPrivate.replace(/\\n/g, "\n"),
      publicKey: envPublic.replace(/\\n/g, "\n"),
    };
    return _keys;
  }

  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  _keys = {
    kid: crypto.randomUUID(),
    privateKey,
    publicKey,
  };
  return _keys;
}

export function getJwks(): Jwks {
  const { kid, publicKey } = loadOrGenerateKeys();
  const keyObj = crypto.createPublicKey(publicKey);
  const exported = keyObj.export({ format: "jwk" }) as { n: string; e: string };

  return {
    keys: [
      {
        kty: "RSA",
        use: "sig",
        alg: "RS256",
        kid,
        n: exported.n,
        e: exported.e,
      },
    ],
  };
}

export interface AccessTokenClaims {
  sub: string;
  email: string;
  email_verified: boolean;
  aud: string;
  permissions?: string[];
}

export function signAccessToken(claims: AccessTokenClaims, expiresIn: string): string {
  const { kid, privateKey } = loadOrGenerateKeys();
  return jwt.sign(
    {
      sub: claims.sub,
      email: claims.email,
      email_verified: claims.email_verified,
      aud: claims.aud,
      permissions: claims.permissions ?? [],
    },
    privateKey,
    { algorithm: "RS256", keyid: kid, expiresIn: expiresIn as jwt.SignOptions["expiresIn"] },
  );
}

export function verifyAccessToken(token: string): jwt.JwtPayload | null {
  const { publicKey } = loadOrGenerateKeys();
  try {
    const decoded = jwt.verify(token, publicKey, { algorithms: ["RS256"] });
    if (typeof decoded === "object" && decoded !== null) return decoded;
    return null;
  } catch {
    return null;
  }
}

export function resetKeysForTesting(): void {
  _keys = undefined;
}
