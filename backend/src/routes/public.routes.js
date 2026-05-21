import { Router } from "express";
import * as publicController from "../controllers/public.controller.js";

const router = Router();

// Public profile endpoint (Feature 2)
router.get("/:username", publicController.getPublicProfile);

export default router;
