import { z } from "zod";

// Compare the parsed hostname rather than matching a string prefix. A prefix
// check would accept http://localhost.attacker.com, which is a different host
// entirely — and handing an authorization code to it is an open redirect.
const redirectUri = z
  .string()
  .url()
  .refine(
    (value) => {
      let url: URL;
      try {
        url = new URL(value);
      } catch {
        return false;
      }
      if (url.protocol === "https:") return true;
      return url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    },
    { message: "redirect uris must use https, or http on localhost" },
  );

export const createApplicationSchema = z.object({
  name: z.string().min(1).max(80),
  environment: z.enum(["development", "staging", "production"]).optional(),
  redirectUris: z.array(redirectUri).max(20).optional(),
});

export const issueApiKeySchema = z.object({
  label: z.string().min(1).max(60),
});

export const updateApplicationSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    redirectUris: z.array(redirectUri).max(20).optional(),
    accessTokenTtl: z.string().regex(/^\d+(\.\d+)?\s?(ms|s|m|h|d|w|y)?$/).optional(),
    refreshTokenTtl: z.string().regex(/^\d+(\.\d+)?\s?(ms|s|m|h|d|w|y)?$/).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "at least one field must be provided",
  });
