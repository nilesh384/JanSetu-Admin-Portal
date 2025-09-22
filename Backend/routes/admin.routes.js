import express from "express";
import { adminLogin, sendAdminOTP, verifyAdminOTP, getAdminProfile, getAllAdmins } from "../controllers/admin.controllers.js";

const router = express.Router();

// Admin OTP routes
router.post("/send-otp", sendAdminOTP);
router.post("/verify-otp", verifyAdminOTP);

// Admin login route (legacy - kept for backward compatibility)
router.post("/login", adminLogin);

// Get admin profile by ID
router.get("/profile/:adminId", getAdminProfile);

// Get all active admins with flexible role filtering (super_admin can filter by specific roles)
router.post("/all", getAllAdmins);

export default router;