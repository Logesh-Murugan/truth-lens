import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import checkRouter from "./routes/check";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow all origins for Chrome extension requests
app.use(express.json());

// Routes
app.use("/api", checkRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

// Start server
app.listen(PORT, () => {
  console.log(`TruthLens backend running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Check endpoint: POST http://localhost:${PORT}/api/check`);
});
