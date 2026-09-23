import { z } from "zod";
import { endUserEmail } from "./end-user.schema.js";

export const confirmVerificationSchema = z.object({
  token: z.string().min(1).max(200),
});

export const resendVerificationSchema = z.object({
  email: endUserEmail,
});
