import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// ================= REGISTER =================
export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password, role, adminSecret } = req.body;

    const adminExists = await User.findOne({ role: "admin" });

    let assignedRole: "user" | "admin" = "user";

    if (role === "admin") {
      if (!adminExists) {
        // First admin registration
        if (adminSecret !== process.env.ADMIN_SECRET) {
          return res.status(403).json({ message: "Invalid admin registration secret" });
        }
        assignedRole = "admin";
      } else {
        // Subsequent admins require logged-in admin
        if (!req.user || req.user.role !== "admin") {
          return res.status(403).json({ message: "Only existing admins can register new admins" });
        }
        assignedRole = "admin";
      }
    }

    const user = new User({ username, email, password, role: assignedRole });
    await user.save();

    res.status(201).json({
      message: "User registered successfully",
      user: { username, email, role: assignedRole },
    });
  } catch (err) {
    res.status(400).json({ message: "Registration failed", error: err });
  }
};


// ================= LOGIN =================
export const login = async (req: Request, res: Response) => {
  try {
    const { emailOrUsername, password } = req.body;

    // Find by email or username
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    // Compare the hashed password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: { id: user._id, username: user.username, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err });
  }
};


// ================= ME =================
export const me = async (req: any, res: Response) => {
  try {
    res.json(req.user);
  } catch {
    res.status(500).json({ message: "Error fetching user" });
  }
};

// ================= CHECK-FIRST-ADMIN =================
export const checkFirstAdmin = async (req: Request, res: Response) => {
  try {
    const adminExists = await User.findOne({ role: "admin" });
    res.status(200).json({ exists: !!adminExists });
  } catch (err) {
    res.status(500).json({ message: "Failed to check first admin" });
  }
};

// ================= RESET-FIRST-ADMIN =================
export const resetFirstAdmin = async (req: Request, res: Response) => {
  try {
    await User.updateMany({ role: "admin" }, { role: "user" });
    res.json({ message: "First admin reset. You can register again." });
  } catch (err) {
    res.status(500).json({ message: "Failed to reset first admin" });
  }
};
