import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { config } from "./config/index.js";
import { globalLimiter } from "./middlewares/rateLimiter.js";
import healthRouter from "./routes/health.js";
import authRouter from "./routes/auth.js";
import goalsRouter from "./routes/goals.js";
import habitsRouter from "./routes/habits.js";
import journalRouter from "./routes/journal.js";
import reviewRouter from "./routes/review.js";
import coachRouter from "./routes/coach.js";

const app = express();

// Enable trust proxy so rate limiters receive the correct client IP address when running behind a proxy (like Fly.io or Vite proxy)
app.set("trust proxy", 1);

// 1. Helmet for secure HTTP headers
app.use(helmet());

// 2. CORS Allowlist validation
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Capacitor native apps may send no origin (file:// or capacitor://) or a null origin.
    // In development, also allow no-origin requests from tools.
    const isNativeApp = !origin;
    const isAllowedOrigin = origin && config.CORS_ORIGINS.includes(origin);

    if (config.NODE_ENV === "development" && isNativeApp) {
      // Allow no-origin only in development (Capacitor native, Postman, curl)
      callback(null, true);
    } else if (isAllowedOrigin) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Required for HttpOnly cookies
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
};

app.use(cors(corsOptions));

// 3. Request Parsers
app.use(express.json({ limit: "1mb" })); // Limit payload size to 1MB to prevent Denial of Service
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// 4. Rate Limiter
app.use(globalLimiter);

// 5. Routes
app.use("/api/auth", authRouter);
app.use("/api/goals", goalsRouter);
app.use("/api/habits", habitsRouter);
app.use("/api/journal", journalRouter);
app.use("/api/coach", coachRouter);
app.use("/api", reviewRouter);
app.use("/api", healthRouter);
app.use("/", healthRouter); // Mount on both root and /api for convenience

// 6. 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "not_found", message: "Resource not found" });
});

// 7. Global Error Handler - Never expose stack traces to users
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandle server error:", err);

  // If it's a CORS error, customize response
  if (err.message === "Not allowed by CORS") {
    res.status(403).json({ error: "cors_forbidden", message: "Origin not allowed by CORS policy" });
    return;
  }

  res.status(500).json({
    error: "internal_server_error",
    message: "An unexpected error occurred on the server.",
  });
});

// Start the server
const server = app.listen(config.PORT, () => {
  console.log(`🚀 Flavos Forge API starting in [${config.NODE_ENV}] mode on port ${config.PORT}`);
});

export { app, server };
