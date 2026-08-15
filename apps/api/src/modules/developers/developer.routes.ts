import { Router } from "express";
import { signupSchema, loginSchema } from "./developer.schema.js";
import { createDeveloper, authenticateDeveloper } from "./developer.service.js";
import { signSessionToken } from "../../lib/session-token.js";
import { HttpError } from "../../middleware/error-handler.js";
import { requireDeveloper } from "../../middleware/require-developer.js";

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

developerRouter.post("/developers/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Invalid login payload");
    const developer = await authenticateDeveloper(parsed.data);
    const token = signSessionToken({ developerId: developer.id });
    res.status(200).json({ developer, token });
  } catch (err) {
    next(err);
  }
});

developerRouter.get("/developers/me", requireDeveloper, (req, res) => {
  res.status(200).json({ developer: req.developer });
});
