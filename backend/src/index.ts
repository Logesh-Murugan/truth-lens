import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import checkRouter from "./routes/check";
import { initDB } from "./db/cache";

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Render's proxy (required for express-rate-limit to work behind cloud platforms)
app.set('trust proxy', 1);

// CORS configuration
// Allow all origins because the Chrome extension's content script makes requests
// from the hosted webpage's domain (e.g., https://gemini.google.com), not chrome-extension://
app.use(cors({ origin: '*' }));
app.use(express.json());

// Rate Limiting on API
const checkLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per windowMs
  message: { error: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/check", checkLimiter);

// Request Logging using middleware interceptor
app.use("/api/check", (req, res, next) => {
  const originalSend = res.send;
  res.send = function (body) {
    let resultLog = "unknown";
    try {
      const parsed = JSON.parse(body);
      resultLog = parsed.result || resultLog;
    } catch (e) {}

    const sentence: string = req.body?.sentence || "";
    const shortSentence = sentence.length > 50 ? sentence.substring(0, 50) + "..." : sentence;
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] POST /api/check | "${shortSentence}" ➔ [${resultLog.toUpperCase()}]`);

    // @ts-ignore
    return originalSend.apply(this, arguments);
  };
  next();
});

// Routes
app.use("/api", checkRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

// Start server
app.listen(PORT, async () => {
  console.log(`[STARTUP] NODE_ENV is set to: ${process.env.NODE_ENV || 'development'}`);
  await initDB();
  console.log(`TruthLens backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Check endpoint: POST http://localhost:${PORT}/api/check`);
});
