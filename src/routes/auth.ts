import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../services/db.js";
import { config } from "../config/index.js";
import { requireAuth } from "../middlewares/auth.js";
import { authLimiter } from "../middlewares/rateLimiter.js";
import {
  registerSchema,
  loginSchema,
  recoveryRequestSchema,
  recoveryResetSchema,
} from "../schemas/auth.js";

const router = Router();

// Apply the stricter rate limiter to all authentication routes
router.use(authLimiter);

/**
 * Utility to hash strings (OTP tokens) with SHA256 before saving to the DB.
 * Prevents plain token exposure in case of read-only database compromise.
 */
function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post("/register", async (req: Request, res: Response) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: "validation_error",
        message: "Invalid input data",
        details: validation.error.format(),
      });
      return;
    }

    const { email, password, name } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      res.status(400).json({
        error: "email_in_use",
        message: "This email address is already registered.",
      });
      return;
    }

    // Hash the password (bcrypt with >= 12 rounds)
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user in the database (plan is FREE by default)
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        createdAt: true,
      },
    });

    // Automatically log the user in after registration
    // by creating a session and setting the HttpOnly cookie
    const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + sessionDurationMs);

    const session = await prisma.session.create({
      data: { userId: newUser.id, expiresAt },
    });

    const token = jwt.sign(
      { userId: newUser.id, sessionId: session.id },
      config.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    // In Capacitor native builds, cookies need sameSite: 'none' to work cross-origin.
    // 'secure: false' here because in dev we're on HTTP (10.0.2.2:5000).
    const isNativeRequest = !req.headers.origin || req.headers.origin === 'null';
    res.cookie("forge_session", token, {
      httpOnly: true,
      secure: config.NODE_ENV === "production" || (!isNativeRequest),
      sameSite: config.NODE_ENV === "production" ? "strict" : "lax",
      path: "/",
      maxAge: sessionDurationMs,
    });

    res.status(201).json({
      message: "User registered successfully.",
      user: newUser,
      // Token included in body for native Capacitor clients (cookies unreliable cross-origin on Android WebView)
      token,
    });
  } catch (error) {
    console.error("Registration endpoint error:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to register user." });
  }
});

/**
 * POST /api/auth/login
 * Authenticate credentials and return a signed session token
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: "validation_error",
        message: "Invalid credentials format",
      });
      return;
    }

    const { email, password } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Retrieve user (including soft-deleted validation check)
    const user = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        deletedAt: null,
      },
    });

    // Timing attack mitigation: always run bcrypt comparison even if user doesn't exist
    let isPasswordValid = false;
    if (user) {
      isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    } else {
      // Fake hash compare to consume CPU cycles symmetrically
      const dummyHash = "$2b$12$y4Wv5h7yL6K/d8Xv7c.X0O3B3y/tQ9Q3k2E9rL2q1e0U2t4p5D1mG";
      await bcrypt.compare(password, dummyHash);
    }

    if (!user || !isPasswordValid) {
      // Return identical generic response to prevent user enumeration
      res.status(401).json({
        error: "invalid_credentials",
        message: "Invalid email or password.",
      });
      return;
    }

    // Session lifespan: 7 days
    const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + sessionDurationMs);

    // Create session record in database
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt,
      },
    });

    // Sign JWT token containing user and session metadata
    const token = jwt.sign(
      {
        userId: user.id,
        sessionId: session.id,
      },
      config.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    // Set secure cookie HttpOnly + Secure + SameSite=Lax
    // In Capacitor native builds, requests come without origin header.
    const isNativeLoginRequest = !req.headers.origin || req.headers.origin === 'null';
    res.cookie("forge_session", token, {
      httpOnly: true,
      secure: config.NODE_ENV === "production" || (!isNativeLoginRequest),
      sameSite: config.NODE_ENV === "production" ? "strict" : "lax",
      path: "/",
      maxAge: sessionDurationMs,
    });

    res.status(200).json({
      message: "Logged in successfully.",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
      },
      // Token included in body for native Capacitor clients (cookies unreliable cross-origin on Android WebView)
      token,
    });
  } catch (error) {
    console.error("Login endpoint error:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to login." });
  }
});

/**
 * POST /api/auth/logout
 * Revoke the current active session in DB and clear the HTTP cookie
 */
router.post("/logout", requireAuth, async (req: Request, res: Response) => {
  try {
    const sessionId = req.sessionId;

    if (sessionId) {
      // Revoke the session inside database
      await prisma.session.update({
        where: { id: sessionId },
        data: { revokedAt: new Date() },
      });
    }

    // Securely clear cookie
    res.clearCookie("forge_session", {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    res.status(200).json({ message: "Logged out successfully." });
  } catch (error) {
    console.error("Logout endpoint error:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to logout." });
  }
});

/**
 * POST /api/auth/recovery/request
 * Request a 6-digit OTP to reset the user password
 */
router.post("/recovery/request", async (req: Request, res: Response) => {
  try {
    const validation = recoveryRequestSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: "validation_error", message: "Invalid email structure" });
      return;
    }

    const { email } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        deletedAt: null,
      },
    });

    // Fail safe to prevent user enumeration: always respond with success
    if (!user) {
      res.status(200).json({
        message: "If this email is registered in our system, a password reset code has been sent.",
      });
      return;
    }

    // Generate numeric 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = hashOtp(otp);

    // Invalidate any active/unused resets for this user first (cleanup)
    await prisma.passwordReset.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        expiresAt: new Date(), // Set expiration to now
      },
    });

    // Save hashed reset token (1 hour duration, single use)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        otpHash,
        expiresAt,
      },
    });

    // Trigger email (uses Resend in production or mocks to console in development)
    const emailService = await import("../services/emailService.js");
    const mailSent = await emailService.sendOtpEmail(user.email, otp);

    if (!mailSent) {
      res.status(500).json({ error: "email_delivery_failed", message: "Failed to deliver reset email." });
      return;
    }

    res.status(200).json({
      message: "If this email is registered in our system, a password reset code has been sent.",
    });
  } catch (error) {
    console.error("Password recovery request error:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to request password reset." });
  }
});

/**
 * POST /api/auth/recovery/reset
 * Verify OTP and update the user's password
 */
router.post("/recovery/reset", async (req: Request, res: Response) => {
  try {
    const validation = recoveryResetSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: "validation_error",
        message: "Invalid reset input format",
        details: validation.error.format(),
      });
      return;
    }

    const { email, otp, newPassword } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        deletedAt: null,
      },
    });

    if (!user) {
      // Generic error response
      res.status(400).json({ error: "invalid_request", message: "Invalid email or reset code." });
      return;
    }

    const otpHash = hashOtp(otp);

    // Find valid reset request
    const resetRequest = await prisma.passwordReset.findFirst({
      where: {
        userId: user.id,
        otpHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetRequest) {
      res.status(400).json({ error: "invalid_request", message: "Invalid email or reset code." });
      return;
    }

    // 1. Mark OTP reset code as used (single use)
    await prisma.passwordReset.update({
      where: { id: resetRequest.id },
      data: { usedAt: new Date() },
    });

    // 2. Hash new password (bcrypt with 12 rounds)
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // 3. Update password in User table
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    // 4. Revoke ALL active sessions for this user (security best practice on reset)
    await prisma.session.updateMany({
      where: {
        userId: user.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    res.status(200).json({ message: "Password has been successfully reset. Please login with your new password." });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to reset password." });
  }
});

/**
 * POST /api/auth/upgrade
 * Toggles the user's plan between FREE and FORGE_PRO for simulation/MVP testing.
 */
router.post("/upgrade", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!user) {
      res.status(404).json({ error: "not_found", message: "User not found" });
      return;
    }

    const nextPlan = user.plan === "FREE" ? "FORGE_PRO" : "FREE";
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { plan: nextPlan }
    });

    res.status(200).json({
      message: `Plan updated to ${nextPlan}`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        plan: updatedUser.plan
      }
    });
  } catch (error) {
    console.error("POST /upgrade error:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to toggle plan." });
  }
});

/**
 * GET /api/auth/me
 * Returns the current user from the active session (used by the frontend to verify auth)
 */
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, plan: true },
    });

    if (!user) {
      res.status(401).json({ error: "unauthorized", message: "Session invalid." });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("GET /me error:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to fetch user." });
  }
});

export default router;
