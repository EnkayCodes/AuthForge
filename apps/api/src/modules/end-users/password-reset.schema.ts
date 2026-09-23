import { z } from "zod";
import { endUserEmail } from "./end-user.schema.js";

export const requestPasswordResetSchema = z.object({
  email: endUserEmail,
});

export const confirmPasswordResetSchema = z.object({
  token: z.string().min(1).max(200),
  password: z.string().min(8).max(200),
});
