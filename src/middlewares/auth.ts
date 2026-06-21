import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { prisma } from "../services/db.js";

// Extend Express Request interface to include authenticated user and session
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        plan: string;
      };
      sessionId?: string;
    }
  }
}

interface JwtPayload {
  userId: string;
  sessionId: string;
}

/**
 * Parses cookies manually from the Cookie header to avoid external package dependencies.
 */
function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const name = parts[0]?.trim();
    if (name) {
      cookies[name] = parts.slice(1).join("=").trim();
    }
  });
  return cookies;
}

/**
 * Authentication middleware to secure private API endpoints.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | null = null;

    // 1. Try to extract token from HttpOnly cookie
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const cookies = parseCookies(cookieHeader);
      if (cookies["forge_session"]) {
        token = cookies["forge_session"];
      }
    }

    // 2. Fallback to Authorization Header (Bearer token)
    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    if (!token) {
      res.status(401).json({ error: "unauthorized", message: "Authentication required" });
      return;
    }

    // 3. Verify JWT signature
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET_KEY) as JwtPayload;
    } catch (err) {
      res.status(401).json({ error: "invalid_token", message: "Invalid or expired session token" });
      return;
    }

    if (!decoded.userId || !decoded.sessionId) {
      res.status(401).json({ error: "invalid_token", message: "Session token payload is malformed" });
      return;
    }

    // 4. Verify Session status in Database (fail closed)
    const session = await prisma.session.findUnique({
      where: { id: decoded.sessionId },
      include: { user: true },
    });

    if (!session) {
      res.status(401).json({ error: "session_not_found", message: "Session does not exist" });
      return;
    }

    if (session.revokedAt) {
      res.status(401).json({ error: "session_revoked", message: "Session has been logged out" });
      return;
    }

    if (new Date() > session.expiresAt) {
      res.status(401).json({ error: "session_expired", message: "Session has expired" });
      return;
    }

    // 5. Verify User status (e.g. check for soft deletion)
    const user = session.user;
    if (user.deletedAt) {
      res.status(401).json({ error: "user_inactive", message: "User account is inactive" });
      return;
    }

    // 6. Bind user and sessionId to the request
    req.user = {
      id: user.id,
      email: user.email,
      plan: user.plan,
    };
    req.sessionId = session.id;

    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to authenticate" });
  }
}
