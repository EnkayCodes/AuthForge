import { z } from "zod";

// Normalise before validating so that trailing whitespace and casing cannot
// produce two rows that the composite unique constraint considers distinct but
// a human considers the same address.
export const endUserEmail = z
  .string()
  .max(320)
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.string().email());

export const registerEndUserSchema = z.object({
  email: endUserEmail,
  password: z.string().min(8).max(200),
});

// Login does not apply the registration length policy: an existing password
// must remain usable after the policy tightens, and rejecting on length here
// would leak the rule to anyone probing the endpoint.
export const loginEndUserSchema = z.object({
  email: endUserEmail,
  password: z.string().min(1).max(200),
});
