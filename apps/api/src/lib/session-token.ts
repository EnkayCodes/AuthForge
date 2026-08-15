import jwt from "jsonwebtoken";
import { env } from "../env.js";

export interface SessionPayload {
  developerId: string;
}

export function signSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, env.SESSION_JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: env.SESSION_JWT_TTL as jwt.SignOptions["expiresIn"],
  });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    // Pin the algorithm explicitly rather than relying on the library
    // inferring it from the secret's type, so an `alg: "none"` or
    // cross-algorithm forgery cannot be accepted.
    const decoded = jwt.verify(token, env.SESSION_JWT_SECRET, {
      algorithms: ["HS256"],
    });
    if (typeof decoded === "object" && decoded !== null) {
      const developerId = (decoded as Record<string, unknown>).developerId;
      if (typeof developerId === "string" && developerId.length > 0) {
        return { developerId };
      }
    }
    return null;
  } catch {
    return null;
  }
}
