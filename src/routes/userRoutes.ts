import { Router } from "express";
import { register, login, me } from "../controllers/authController";
import { protect } from "../middleware/auth";

const router = Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected user route
router.get("/me", protect, me);

export default router;
