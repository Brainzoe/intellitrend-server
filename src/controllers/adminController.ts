// src/controllers/adminController.ts
import { Request, Response } from "express";
import crypto from "crypto";
import User from "../models/User";
import { sendEmail } from "./authController"; // reuse your existing sendEmail function
import dotenv from "dotenv";

dotenv.config();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Admin requests a password reset for a user
export const sendUserPasswordResetLink = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Save hashed token and expiry
    user.passwordResetToken = resetTokenHash;
    user.passwordResetExpires = new Date(Date.now() + 3600 * 1000); // 1 hour
    await user.save();

    const resetURL = `${FRONTEND_URL}/reset-password/${resetToken}`;

    const emailHtml = `
      <p>Hello ${user.username},</p>
      <p>An admin has requested a password reset for your account.</p>
      <p>Click the link below to set your new password:</p>
      <a href="${resetURL}" target="_blank">${resetURL}</a>
      <p>This link expires in 1 hour.</p>
    `;

    await sendEmail(user.email, "Password Reset Request", emailHtml);

    res.json({ message: `Password reset link sent to ${user.email}` });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: "Failed to send password reset link", error: err.message });
  }
};
