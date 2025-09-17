import express from "express";
import { adminLogin, getAdminProfile, getAllAdmins } from "../controllers/admin.controllers.js";

const router = express.Router();

// Admin login route
router.post("/login", adminLogin);

// Get admin profile by ID
router.get("/profile/:adminId", getAdminProfile);

// Get all active admins with flexible role filtering (super_admin can filter by specific roles)
router.post("/all", getAllAdmins);

export default router;