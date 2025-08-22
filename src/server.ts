//src/server.ts
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./utils/db";
import postRoutes from "./routes/postRoutes";

dotenv.config();
connectDB();

const app = express();
app.use(cors({
    origin: [
      "https://intelli-trend.vercel.app", // your Vercel frontend URL
      "http://localhost:3000"             // optional: for local dev
    ],
    credentials: true,
  }));
app.use(express.json());

app.use("/api/posts", postRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
