import { Router } from "express";
import { requireDeveloper } from "../../middleware/require-developer.js";
import { HttpError } from "../../middleware/error-handler.js";
import { createApplicationSchema } from "./application.schema.js";
import { createApplication } from "./application.service.js";

export const applicationRouter: Router = Router();

applicationRouter.post("/applications", requireDeveloper, async (req, res, next) => {
  try {
    const parsed = createApplicationSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Invalid application payload");
    const developer = req.developer;
    if (!developer) throw new HttpError(401, "Unauthorized");
    const application = await createApplication(developer.id, parsed.data);
    res.status(201).json({ application });
  } catch (err) {
    next(err);
  }
});
