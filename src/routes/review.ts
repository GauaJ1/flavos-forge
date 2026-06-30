import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { prisma } from "../services/db.js";
import { decryptJournal } from "../services/encryption.js";
import { getCurrentWeekRange } from "../utils/dateUtils.js";

const router = Router();

// Secure with authentication
router.use(requireAuth);

/**
 * GET /api/weekly-review
 * Synthesizes the user's progress for the current calendar week (Monday–Sunday)
 * using the user's stored timezone, so the window never flips at UTC midnight.
 */
router.get("/weekly-review", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const timezone = req.user!.timezone;

    // Set time boundary to the current Mon–Sun calendar week in the user's timezone
    const { start: weekStart, end: weekEnd } = getCurrentWeekRange(timezone);

    // 1. Fetch active goals, their action plans, and check-ins within this calendar week
    const goals = await prisma.goal.findMany({
      where: {
        userId,
        status: "ACTIVE",
      },
      include: {
        actionPlans: true,
        checkIns: {
          where: {
            createdAt: {
              gte: weekStart,
              lte: weekEnd,
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // 2. Fetch habits and check-ins within this calendar week
    const habits = await prisma.habit.findMany({
      where: { userId },
      include: {
        checkIns: {
          where: {
            date: {
              gte: weekStart,
              lte: weekEnd,
            },
          },
          orderBy: { date: "asc" },
        },
      },
    });

    // 3. Fetch journal entries within this calendar week (excluding soft-deleted ones)
    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        userId,
        createdAt: {
          gte: weekStart,
          lte: weekEnd,
        },
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
    });

    // Decrypt journal entries for reflection
    const decryptedJournals = journalEntries.map((entry) => {
      try {
        return {
          id: entry.id,
          mood: entry.mood,
          createdAt: entry.createdAt,
          content: decryptJournal(entry.contentEnc, entry.iv, entry.authTag),
        };
      } catch (err) {
        return {
          id: entry.id,
          mood: entry.mood,
          createdAt: entry.createdAt,
          content: "[Failed to decrypt secure journal entry]",
        };
      }
    });

    // Calculate overall weekly consistency across all habits
    let totalWeeklyCheckIns = 0;
    let completedWeeklyCheckIns = 0;
    
    const weeklyHabitsSummary = habits.map((habit) => {
      const completedThisWeek = habit.checkIns.filter((ci) => ci.completed).length;
      const totalThisWeek = habit.checkIns.length;
      
      totalWeeklyCheckIns += totalThisWeek;
      completedWeeklyCheckIns += completedThisWeek;

      return {
        id: habit.id,
        title: habit.title,
        cue: habit.cue,
        freezesUsed: habit.freezesUsed,
        weeklyConsistency: totalThisWeek > 0 ? Math.round((completedThisWeek / totalThisWeek) * 100) : 0,
        weeklyHistory: habit.checkIns.map((ci) => ({ date: ci.date, completed: ci.completed })),
      };
    });

    const overallHabitConsistency = totalWeeklyCheckIns > 0 
      ? Math.round((completedWeeklyCheckIns / totalWeeklyCheckIns) * 100) 
      : 0;

    // Compile mood average
    const moods = journalEntries.map((j) => j.mood).filter((m): m is number => m !== null);
    const averageMood = moods.length > 0 
      ? parseFloat((moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1)) 
      : null;

    res.status(200).json({
      reviewWindow: {
        start: weekStart.toISOString(),
        end: weekEnd.toISOString(),
      },
      goals: goals.map((g) => ({
        id: g.id,
        title: g.title,
        specificOutcome: g.specificOutcome,
        difficulty: g.difficulty,
        deadline: g.deadline,
        weeklyCheckInCount: g.checkIns.length,
        recentNotes: g.checkIns.map((ci) => ci.note).filter(Boolean),
        actionPlans: g.actionPlans.map((ap) => ({ triggerCue: ap.triggerCue, action: ap.action })),
      })),
      habits: {
        overallConsistency: overallHabitConsistency,
        summary: weeklyHabitsSummary,
      },
      reflection: {
        averageMood,
        logsCount: decryptedJournals.length,
        logs: decryptedJournals,
      },
    });
  } catch (error) {
    console.error("Error creating weekly review:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to generate weekly review synthesis" });
  }
});

export default router;
