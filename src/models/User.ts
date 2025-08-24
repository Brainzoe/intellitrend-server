// src/models/User.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";
import bcrypt from "bcryptjs";

// ---------------- User Interface ----------------
export interface IUser {
  username: string;
  email: string;
  password: string;
  role: "user" | "admin";
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

// ---------------- User Document ----------------
// Extend Document with _id as ObjectId
export interface IUserDocument extends IUser, Document<Types.ObjectId> {}

// ---------------- User Model ----------------
interface IUserModel extends Model<IUserDocument> {
  anyAdminExists(): Promise<boolean>;
}

// ---------------- Schema ----------------
const UserSchema = new Schema<IUserDocument>(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
  },
  { timestamps: true }
);

// ---------------- Pre-save Hook ----------------
UserSchema.pre<IUserDocument>("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ---------------- Methods ----------------
UserSchema.methods.comparePassword = async function (candidate: string) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

// ---------------- Statics ----------------
UserSchema.statics.anyAdminExists = async function () {
  const admin = await this.findOne({ role: "admin" });
  return !!admin;
};

// ---------------- Export Model ----------------
const User = mongoose.model<IUserDocument, IUserModel>("User", UserSchema);
export default User;
