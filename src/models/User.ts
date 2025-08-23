// src/models/User.ts
import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: "user" | "admin";
  comparePassword(candidate: string): Promise<boolean>;
}

interface IUserModel extends Model<IUser> {
  anyAdminExists(): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare candidate password with hashed password
UserSchema.methods.comparePassword = async function (candidate: string) {
  if (!this.password) return false; // safety check
  return bcrypt.compare(candidate, this.password);
};

// Static method to check if any admin exists
UserSchema.statics.anyAdminExists = async function () {
  const admin = await this.findOne({ role: "admin" });
  return !!admin;
};

export default mongoose.model<IUser, IUserModel>("User", UserSchema);
