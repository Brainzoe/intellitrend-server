// src/server.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./utils/db";
import postRoutes from "./routes/postRoutes";

dotenv.config();
connectDB();

const app = express();

// Dynamic CORS origin validation
const allowedOrigins = [
  "https://intelli-trend.vercel.app",
  "http://localhost:3000",
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow requests with no origin (like server-side)
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use("/api/posts", postRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
