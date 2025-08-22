// src/server.ts
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./utils/db";
import postRoutes from "./routes/postRoutes";

dotenv.config();
connectDB();

const app = express();

// Allowed origins from environment variables
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",");

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS error: ${origin} not allowed`));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use("/api/posts", postRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
