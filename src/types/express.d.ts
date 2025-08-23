// src/types/express.d.ts
import { IUser } from "../models/User"; // or just use `any` if you don’t have a type

declare global {
  namespace Express {
    interface Request {
      user?: any; // or IUser if you have a type for your User model
    }
  }
}
