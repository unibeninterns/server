import express from "express";
import adminController from "../controllers/admin.controller.js";
import { authenticateAdminToken } from "../middleware/auth.middleware.js";
import { upload } from "./auth.routes.js";
import path from "path";

const router = express.Router();

router.use(authenticateAdminToken);

// Researchers management
router.post("/researchers/invite", adminController.inviteResearcher);
router.post(
    "/researchers/add",
    upload.single("profilePicture"),
    adminController.addResearcherProfile
);
router.get("/researchers", adminController.getResearchers);
router.delete("/researchers/:id", adminController.deleteResearcher);

// Invitations management
router.get("/invitations", adminController.getInvitations);
router.post("/invitations/:id/resend", adminController.resendInvitation);
router.delete("/invitations/:id", adminController.deleteInvitation);

export default router;
