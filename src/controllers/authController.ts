// src/controllers/authController.ts
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import User, { IUser } from "../models/User";
import dotenv from "dotenv";

dotenv.config(); // ensure env vars are loaded

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// ---------------- Nodemailer Setup ----------------
if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.warn("SMTP credentials are missing. Password reset emails will fail.");
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false, // TLS over 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // allow self-signed certs
  },
});


// Utility function to send email
const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    if (!process.env.SMTP_HOST) throw new Error("SMTP host is missing");
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("Failed to send email:", err);
    throw err;
  }
};

// ================= REGISTER =================
export const register = async (req: any, res: Response) => {
  try {
    const { username, email, password, role, adminSecret } = req.body;
    const adminExists = await User.anyAdminExists();
    let assignedRole: "user" | "admin" = "user";

    if (role === "admin") {
      if (!adminExists) {
        if (adminSecret !== process.env.ADMIN_SECRET) {
          return res.status(403).json({ message: "Invalid admin registration secret" });
        }
        assignedRole = "admin";
      } else {
        if (!req.user || req.user.role !== "admin") {
          return res.status(403).json({ message: "Only existing admins can register new admins" });
        }
        assignedRole = "admin";
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword, role: assignedRole });
    await user.save();

    res.status(201).json({
      message: "User registered successfully",
      user: { username, email, role: assignedRole },
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Registration failed", error: err });
  }
};

// ================= LOGIN =================
export const login = async (req: Request, res: Response) => {
  try {
    const { emailOrUsername, password } = req.body;
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user._id, username: user.username, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed", error: err });
  }
};

// ================= ME =================
export const me = async (req: any, res: Response) => {
  try {
    res.json(req.user);
  } catch (err) {
    res.status(500).json({ message: "Error fetching user", error: err });
  }
};

// ================= CHECK-FIRST-ADMIN =================
export const checkFirstAdmin = async (req: Request, res: Response) => {
  try {
    const adminExists = await User.anyAdminExists();
    res.status(200).json({ exists: adminExists });
  } catch (err) {
    res.status(500).json({ message: "Failed to check first admin", error: err });
  }
};

// ================= RESET-FIRST-ADMIN =================
export const resetFirstAdmin = async (req: Request, res: Response) => {
  try {
    await User.updateMany({ role: "admin" }, { role: "user" });
    res.json({ message: "First admin reset. You can register again." });
  } catch (err) {
    res.status(500).json({ message: "Failed to reset first admin", error: err });
  }
};

// ================= REQUEST PASSWORD RESET =================
export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.passwordResetToken = resetTokenHash;
    user.passwordResetExpires = new Date(Date.now() + 3600 * 1000); // 1 hour
    await user.save();

    const resetURL = `${FRONTEND_URL}/reset-password/${resetToken}`;
    const emailHtml = `<p>Hello ${user.username},</p>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetURL}" target="_blank">${resetURL}</a>
      <p>This link expires in 1 hour.</p>`;

    await sendEmail(user.email, "Password Reset", emailHtml);

    res.json({ message: "Password reset email sent" });
  } catch (err: any) {
    console.error("Password reset request failed:", err);
    res.status(500).json({ message: err.message || "Failed to send password reset email", error: err });
  }
};

// ================= RESET PASSWORD =================
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    const resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: resetTokenHash,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to reset password", error: err });
  }
};
