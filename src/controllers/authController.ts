// src/controllers/authController.ts
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import User, { IUserDocument } from "../models/User";
import dotenv from "dotenv";
import { Types } from "mongoose";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// ---------------- Nodemailer Setup ----------------
if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn("SMTP credentials are missing. Password reset emails will fail.");
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: Number(process.env.EMAIL_PORT) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Utility function to send email
const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}`);
  } catch (err: any) {
    console.error("Failed to send email:", err);
    throw new Error(`Email send failed: ${err.message}`);
  }
};

// ---------------- JWT Helper ----------------
const generateToken = (res: Response, userId: Types.ObjectId, role: string) => {
  const token = jwt.sign({ id: userId.toString(), role }, JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  return token;
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
      } else if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ message: "Only existing admins can register new admins" });
      } else assignedRole = "admin";
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user: IUserDocument = new User({ username, email, password: hashedPassword, role: assignedRole });
    await user.save();

    const token = generateToken(res, user._id, assignedRole);

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: { id: user._id.toString(), username, email, role: assignedRole },
    });
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ message: "Registration failed", error: err.message });
  }
};

// ================= LOGIN =================
export const login = async (req: Request, res: Response) => {
  try {
    const { emailOrUsername, password } = req.body;
    const user: IUserDocument | null = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(res, user._id, user.role);

    res.json({
      token,
      user: { id: user._id.toString(), username: user.username, role: user.role },
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

// ================= ME =================
export const me = async (req: any, res: Response) => {
  try {
    res.json(req.user);
  } catch (err: any) {
    res.status(500).json({ message: "Error fetching user", error: err.message });
  }
};

// ================= CHECK-FIRST-ADMIN =================
export const checkFirstAdmin = async (req: Request, res: Response) => {
  try {
    const adminExists = await User.anyAdminExists();
    res.status(200).json({ exists: adminExists });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to check first admin", error: err.message });
  }
};

// ================= RESET-FIRST-ADMIN =================
export const resetFirstAdmin = async (req: Request, res: Response) => {
  try {
    await User.updateMany({ role: "admin" }, { role: "user" });
    res.json({ message: "First admin reset. You can register again." });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to reset first admin", error: err.message });
  }
};

// ================= REQUEST PASSWORD RESET =================
export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user: IUserDocument | null = await User.findOne({ email });
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

    const user: IUserDocument | null = await User.findOne({
      passwordResetToken: resetTokenHash,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: "Failed to reset password", error: err.message });
  }
};
