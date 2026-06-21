import { Request, Response, NextFunction } from "express";
import { prisma } from "../services/db.js";
import { Goal } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      goal?: Goal;
    }
  }
}

/**
 * Middleware to verify that a Goal exists and is owned by the currently authenticated user.
 * This prevents Horizontal Privilege Escalation (IDOR attacks) as required by the Global Security Rule.
 */
export async function requireGoalOwner(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: "bad_request", message: "Goal ID parameter is required" });
      return;
    }

    // Retrieve goal and check ownership
    const goal = await prisma.goal.findUnique({
      where: { id },
    });

    if (!goal) {
      // Return 404 to avoid revealing resource existence if not owned, or simply as standard not found
      res.status(404).json({ error: "not_found", message: "Goal not found" });
      return;
    }

    // Verify ownership
    if (goal.userId !== req.user?.id) {
      res.status(403).json({ error: "forbidden", message: "You do not have permission to access this goal" });
      return;
    }

    // Attach goal to request object for downstream controllers
    req.goal = goal;
    next();
  } catch (error) {
    console.error("Error in requireGoalOwner middleware:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to verify goal ownership" });
  }
}
