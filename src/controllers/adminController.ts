//src/controllers/adminController.ts

import { Request, Response } from "express";
import User from "../models/User";
import bcrypt from "bcryptjs";

// Admin changes any user's password
export const changeUserPassword = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: `Password for ${user.username} has been updated successfully` });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: "Failed to change password", error: err.message });
  }
};
