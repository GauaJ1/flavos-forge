import { Request, Response, NextFunction } from "express";
import { prisma } from "../services/db.js";
import { Habit } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      habit?: Habit;
    }
  }
}

/**
 * Middleware to verify that a Habit exists and is owned by the currently authenticated user.
 * This prevents Horizontal Privilege Escalation (IDOR attacks) as required by the Global Security Rule.
 */
export async function requireHabitOwner(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: "bad_request", message: "Habit ID parameter is required" });
      return;
    }

    const habit = await prisma.habit.findUnique({
      where: { id },
    });

    if (!habit) {
      res.status(404).json({ error: "not_found", message: "Habit not found" });
      return;
    }

    // Verify ownership
    if (habit.userId !== req.user?.id) {
      res.status(403).json({ error: "forbidden", message: "You do not have permission to access this habit" });
      return;
    }

    // Attach habit to request object for downstream controllers
    req.habit = habit;
    next();
  } catch (error) {
    console.error("Error in requireHabitOwner middleware:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to verify habit ownership" });
  }
}
