import { Router } from "express";
import { signupSchema } from "./developer.schema.js";
import { createDeveloper } from "./developer.service.js";
import { signSessionToken } from "../../lib/session-token.js";
import { HttpError } from "../../middleware/error-handler.js";

export const developerRouter: Router = Router();

developerRouter.post("/developers/signup", async (req, res, next) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Invalid signup payload");
    const developer = await createDeveloper(parsed.data);
    const token = signSessionToken({ developerId: developer.id });
    res.status(201).json({ developer, token });
  } catch (err) {
    next(err);
  }
});
