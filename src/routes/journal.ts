import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { requireJournalOwner } from "../middlewares/requireJournalOwner.js";
import { CreateJournalEntrySchema, UpdateJournalEntrySchema } from "../schemas/journal.js";
import { encryptJournal, decryptJournal } from "../services/encryption.js";
import { prisma } from "../services/db.js";
import { writeLimiter } from "../middlewares/rateLimiter.js";

const router = Router();

// Secure all endpoints with authentication by default
router.use(requireAuth);

/**
 * POST /api/journal
 * Create a new encrypted journal entry.
 */
router.post("/", writeLimiter, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Validate request body
    const result = CreateJournalEntrySchema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({
        error: "validation_error",
        message: "Invalid journal entry data",
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    const { content, mood } = result.data;

    // Encrypt the content before writing to db
    const { contentEnc, iv, authTag } = encryptJournal(content);

    const entry = await prisma.journalEntry.create({
      data: {
        userId,
        contentEnc,
        iv,
        authTag,
        mood,
      },
    });

    res.status(211).json({
      message: "Journal entry saved securely",
      entry: {
        id: entry.id,
        mood: entry.mood,
        createdAt: entry.createdAt,
        content, // Echo back plain text for client immediate state sync
      },
    });
  } catch (error) {
    console.error("Error creating journal entry:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to save journal entry" });
  }
});

/**
 * GET /api/journal
 * Retrieve all journal entries of the user, decrypting content for display.
 * Excludes soft-deleted entries.
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const entries = await prisma.journalEntry.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    // Decrypt all entries
    const decryptedEntries = entries.map((entry) => {
      try {
        const plainText = decryptJournal(entry.contentEnc, entry.iv, entry.authTag);
        return {
          id: entry.id,
          mood: entry.mood,
          createdAt: entry.createdAt,
          content: plainText,
        };
      } catch (decErr) {
        console.error(`Decryption failed for journal entry ID: ${entry.id}`, decErr);
        return {
          id: entry.id,
          mood: entry.mood,
          createdAt: entry.createdAt,
          content: "[Error: Failed to decrypt journal entry. Encryption key mismatch or corrupted data.]",
        };
      }
    });

    res.status(200).json({ entries: decryptedEntries });
  } catch (error) {
    console.error("Error fetching journal entries:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to retrieve journal entries" });
  }
});

/**
 * GET /api/journal/:id
 * Retrieve details of a specific journal entry, with decryption. Protected against IDOR.
 */
router.get("/:id", requireJournalOwner, async (req: Request, res: Response) => {
  try {
    const entry = req.journalEntry!; // Populated by requireJournalOwner

    let plainText = "";
    try {
      plainText = decryptJournal(entry.contentEnc, entry.iv, entry.authTag);
    } catch (decErr) {
      console.error(`Decryption failed for journal entry ID: ${entry.id}`, decErr);
      res.status(500).json({
        error: "decryption_failed",
        message: "Failed to decrypt secure journal entry",
      });
      return;
    }

    res.status(200).json({
      entry: {
        id: entry.id,
        mood: entry.mood,
        createdAt: entry.createdAt,
        content: plainText,
      },
    });
  } catch (error) {
    console.error("Error fetching journal details:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to retrieve journal details" });
  }
});

/**
 * PUT /api/journal/:id
 * Update an existing journal entry. Protected against IDOR.
 */
router.put("/:id", requireJournalOwner, async (req: Request, res: Response) => {
  try {
    const entry = req.journalEntry!;

    const result = UpdateJournalEntrySchema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({
        error: "validation_error",
        message: "Invalid journal data supplied",
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    const { content, mood } = result.data;

    let updatedData: any = {};
    if (mood !== undefined) {
      updatedData.mood = mood;
    }

    if (content !== undefined) {
      // Re-encrypt updated content
      const { contentEnc, iv, authTag } = encryptJournal(content);
      updatedData.contentEnc = contentEnc;
      updatedData.iv = iv;
      updatedData.authTag = authTag;
    }

    const updatedEntry = await prisma.journalEntry.update({
      where: { id: entry.id },
      data: updatedData,
    });

    const plainText = content !== undefined ? content : decryptJournal(updatedEntry.contentEnc, updatedEntry.iv, updatedEntry.authTag);

    res.status(200).json({
      message: "Journal entry updated successfully",
      entry: {
        id: updatedEntry.id,
        mood: updatedEntry.mood,
        createdAt: updatedEntry.createdAt,
        content: plainText,
      },
    });
  } catch (error) {
    console.error("Error updating journal entry:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to update journal entry" });
  }
});

/**
 * DELETE /api/journal/:id
 * Soft delete a journal entry. Protected against IDOR.
 */
router.delete("/:id", requireJournalOwner, async (req: Request, res: Response) => {
  try {
    const entry = req.journalEntry!;

    await prisma.journalEntry.update({
      where: { id: entry.id },
      data: {
        deletedAt: new Date(),
      },
    });

    res.status(200).json({ message: "Journal entry deleted successfully (soft-delete)" });
  } catch (error) {
    console.error("Error soft-deleting journal entry:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to delete journal entry" });
  }
});

/**
 * POST /api/journal/export
 * LGPD Compliance: Export all user data. Returns full profile, decrypted journal entries,
 * active goals with plans, and habits with histories.
 */
router.post("/export", writeLimiter, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Retrieve full user profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "user_not_found", message: "User profile not found" });
      return;
    }

    // Retrieve goals and plans
    const goals = await prisma.goal.findMany({
      where: { userId },
      include: {
        actionPlans: true,
        checkIns: true,
      },
    });

    // Retrieve habits and check-ins
    const habits = await prisma.habit.findMany({
      where: { userId },
      include: {
        checkIns: true,
      },
    });

    // Retrieve all non-deleted journal entries and decrypt them
    const journalEntries = await prisma.journalEntry.findMany({
      where: { userId, deletedAt: null },
    });

    const decryptedJournals = journalEntries.map((entry) => {
      try {
        return {
          id: entry.id,
          mood: entry.mood,
          createdAt: entry.createdAt,
          content: decryptJournal(entry.contentEnc, entry.iv, entry.authTag),
        };
      } catch {
        return {
          id: entry.id,
          mood: entry.mood,
          createdAt: entry.createdAt,
          content: "[Error: Failed to decrypt secure journal entry.]",
        };
      }
    });

    // Package the full data archive
    const exportData = {
      exportedAt: new Date().toISOString(),
      legalNotice: "Este arquivo contém a totalidade dos seus dados pessoais armazenados no Flavos Forge, em conformidade com o Artigo 18 da Lei Geral de Proteção de Dados (LGPD).",
      profile: user,
      goals: goals.map(g => ({
        id: g.id,
        title: g.title,
        specificOutcome: g.specificOutcome,
        metric: g.metric,
        difficulty: g.difficulty,
        deadline: g.deadline,
        status: g.status,
        createdAt: g.createdAt,
        actionPlans: g.actionPlans.map(ap => ({ triggerCue: ap.triggerCue, action: ap.action })),
        checkIns: g.checkIns.map(ci => ({ date: ci.createdAt, note: ci.note }))
      })),
      habits: habits.map(h => ({
        id: h.id,
        title: h.title,
        cue: h.cue,
        freezesUsed: h.freezesUsed,
        createdAt: h.createdAt,
        checkIns: h.checkIns.map(ci => ({ date: ci.date, completed: ci.completed }))
      })),
      journal: decryptedJournals
    };

    // Return full portable JSON structure
    res.setHeader("Content-Disposition", 'attachment; filename="flavos-forge-export.json"');
    res.status(200).json(exportData);
  } catch (error) {
    console.error("Error generating LGPD data export:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to generate data export" });
  }
});

export default router;
