import rateLimit from "express-rate-limit";
import { config } from "../config/index.js";

// Global Rate Limiter: Apply to all endpoints to prevent DOS
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.NODE_ENV === "development" ? 1000 : 100, // relaxed in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: "Too many requests, please try again later.",
  },
});

// Authentication Rate Limiter: strictly for login, register, and password reset
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.NODE_ENV === "development" ? 100 : 15, // limit per IP to 15 attempts in production, 100 in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: "Too many authentication attempts. Please try again after 15 minutes.",
  },
});

// Coach IA/AI Generation Rate Limiter: separate to avoid token/cost abuse
export const coachLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.NODE_ENV === "development" ? 100 : 10, // 10 requests per 15 minutes in prod, 100 in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: "Too many Coach IA requests. Please try again later.",
  },
});

// Write Actions Rate Limiter: separate for journal entries, goals, and habits creation to avoid database bloat
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.NODE_ENV === "development" ? 500 : 50, // 50 writes per 15 minutes in prod, 500 in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: "Too many updates. Please wait a moment before trying again.",
  },
});
