// src/routes/authRoutes.ts
import { Router } from "express";
import { register, login, me, checkFirstAdmin, resetFirstAdmin } from "../controllers/authController";
import { protect, adminOnly } from "../middleware/auth";

const router = Router();

// Register a new user (admin or normal user)
router.post("/register", register);

// Login existing user
router.post("/login", login);

// Get current logged in user info
router.get("/me", protect, me);

// Check if the very first admin account exists
router.get("/check-first-admin", checkFirstAdmin);

// Reset first admin (admin-only route)
router.post("/reset-first-admin", protect, adminOnly, resetFirstAdmin);

export default router;
