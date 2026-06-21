import { Request, Response, NextFunction } from "express";
import { prisma } from "../services/db.js";
import { JournalEntry } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      journalEntry?: JournalEntry;
    }
  }
}

/**
 * Middleware to verify that a Journal Entry exists, is not soft-deleted, and is owned by the currently authenticated user.
 * This prevents Horizontal Privilege Escalation (IDOR attacks) as required by the Global Security Rule.
 */
export async function requireJournalOwner(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: "bad_request", message: "Journal entry ID parameter is required" });
      return;
    }

    const journalEntry = await prisma.journalEntry.findUnique({
      where: { id },
    });

    // Treat soft-deleted entries as not found to protect privacy
    if (!journalEntry || journalEntry.deletedAt) {
      res.status(404).json({ error: "not_found", message: "Journal entry not found" });
      return;
    }

    // Verify ownership
    if (journalEntry.userId !== req.user?.id) {
      res.status(403).json({ error: "forbidden", message: "You do not have permission to access this journal entry" });
      return;
    }

    // Attach journal entry to request object for downstream controllers
    req.journalEntry = journalEntry;
    next();
  } catch (error) {
    console.error("Error in requireJournalOwner middleware:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to verify journal entry ownership" });
  }
}
