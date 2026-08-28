import { Router } from "express";
import { requireDeveloper } from "../../middleware/require-developer.js";
import { HttpError } from "../../middleware/error-handler.js";
import { createApplicationSchema, updateApplicationSchema } from "./application.schema.js";
import {
  createApplication,
  deleteApplication,
  getApplication,
  listApplications,
  updateApplication,
} from "./application.service.js";

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

applicationRouter.get("/applications", requireDeveloper, async (req, res, next) => {
  try {
    const developer = req.developer;
    if (!developer) throw new HttpError(401, "Unauthorized");
    const applications = await listApplications(developer.id);
    res.status(200).json({ applications });
  } catch (err) {
    next(err);
  }
});

applicationRouter.get("/applications/:id", requireDeveloper, async (req, res, next) => {
  try {
    const developer = req.developer;
    if (!developer) throw new HttpError(401, "Unauthorized");
    const application = await getApplication(developer.id, req.params.id);
    res.status(200).json({ application });
  } catch (err) {
    next(err);
  }
});

applicationRouter.patch("/applications/:id", requireDeveloper, async (req, res, next) => {
  try {
    const developer = req.developer;
    if (!developer) throw new HttpError(401, "Unauthorized");
    const parsed = updateApplicationSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Invalid application payload");
    const application = await updateApplication(developer.id, req.params.id, parsed.data);
    res.status(200).json({ application });
  } catch (err) {
    next(err);
  }
});

applicationRouter.delete("/applications/:id", requireDeveloper, async (req, res, next) => {
  try {
    const developer = req.developer;
    if (!developer) throw new HttpError(401, "Unauthorized");
    await deleteApplication(developer.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
