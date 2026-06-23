import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.js";
import { requireHabitOwner } from "../middlewares/requireHabitOwner.js";
import { CreateHabitSchema, UpdateHabitSchema, HabitCheckInSchema, HabitFreezeSchema } from "../schemas/habits.js";
import { prisma } from "../services/db.js";
import { writeLimiter } from "../middlewares/rateLimiter.js";
import { decideHabitPrompt } from "../services/notificationLogic.js";

const router = Router();

// Secure all endpoints with authentication by default
router.use(requireAuth);

/**
 * Helper function to calculate consistency for a habit in a rolling 30-day window.
 * Formula: Completed check-ins / (Days active in 30-day window - Freezes used)
 */
function calculateConsistency(createdAt: Date, checkIns: { date: Date; completed: boolean; isFrozen?: boolean }[], freezesUsed: number): number {
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  // 1. Count completed check-ins in the last 30 days (excluding frozen ones)
  const completedCount = checkIns.filter(
    (ci) => new Date(ci.date) >= thirtyDaysAgo && ci.completed && !ci.isFrozen
  ).length;

  // 2. Calculate actual active days in the last 30 days
  const diffTime = Math.abs(now.getTime() - createdAt.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const activeDaysInWindow = Math.min(30, Math.max(1, diffDays));

  // 3. Denominator is active days minus freezes used, capped at a minimum of 1
  const denominator = Math.max(1, activeDaysInWindow - freezesUsed);

  // 4. Calculate consistency percentage
  const consistency = Math.round((completedCount / denominator) * 100);
  return Math.min(100, Math.max(0, consistency));
}

/**
 * POST /api/habits
 * Create a new habit.
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Validate request body
    const result = CreateHabitSchema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({
        error: "validation_error",
        message: "Invalid habit data supplied",
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    const { title, cue, minimumVersion, pairWith, goalId } = result.data;

    // Progress Principle — se goalId informado, verifica ownership ANTES de vincular.
    // Nunca confiar em goalId vindo do cliente sem confirmar que pertence ao usuário autenticado (IDOR).
    if (goalId) {
      const goal = await prisma.goal.findFirst({
        where: { id: goalId, userId },
      });
      if (!goal) {
        res.status(404).json({ error: "not_found", message: "Meta não encontrada ou não pertence ao usuário" });
        return;
      }
    }

    const habit = await prisma.habit.create({
      data: {
        userId,
        title,
        cue: cue ?? null,
        minimumVersion: minimumVersion ?? null,
        pairWith: pairWith ?? null,
        goalId: goalId ?? null,
        difficultyStage: 1,
        freezesUsed: 0,
      },
    });

    res.status(201).json({
      message: "Habit successfully created",
      habit: {
        ...habit,
        consistency: 0,
      },
    });
  } catch (error) {
    console.error("Error creating habit:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to create habit" });
  }
});

const BulkCreateHabitsSchema = z.array(CreateHabitSchema)
  .min(1, "At least one habit is required")
  .max(10, "Bulk create limited to 10 habits");

/**
 * POST /api/habits/bulk
 * Create habits in batch.
 */
router.post("/bulk", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Validate bulk payload
    const result = BulkCreateHabitsSchema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({
        error: "validation_error",
        message: "Invalid habits list supplied",
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    // Verify ownership of unique goalIds if any are provided
    const goalIds = [...new Set(result.data.map((h) => h.goalId).filter(Boolean))];
    if (goalIds.length > 0) {
      const userGoals = await prisma.goal.findMany({
        where: { id: { in: goalIds as string[] }, userId },
        select: { id: true },
      });
      const userGoalIds = new Set(userGoals.map(g => g.id));
      const hasInvalidGoal = goalIds.some(id => !userGoalIds.has(id as string));
      if (hasInvalidGoal) {
        res.status(404).json({ 
          error: "not_found", 
          message: "Uma ou mais metas não foram encontradas ou não pertencem ao usuário" 
        });
        return;
      }
    }

    // Create all habits in a transaction
    const habits = await prisma.$transaction(
      result.data.map((h) =>
        prisma.habit.create({
          data: {
            userId,
            title: h.title,
            cue: h.cue ?? null,
            minimumVersion: h.minimumVersion ?? null,
            pairWith: h.pairWith ?? null,
            goalId: h.goalId ?? null,
            difficultyStage: 1,
            freezesUsed: 0,
          },
        })
      )
    );

    res.status(201).json({
      message: "Habits successfully created in bulk",
      habits: habits.map(h => ({
        ...h,
        consistency: 0,
      })),
    });
  } catch (error) {
    console.error("Error creating habits in bulk:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to create habits in bulk" });
  }
});

/**
 * GET /api/habits
 * Retrieve all habits of the user, calculating consistency dynamically.
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const habits = await prisma.habit.findMany({
      where: { userId },
      include: {
        checkIns: {
          orderBy: { date: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Map habits and calculate consistency for each
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const habitsWithConsistency = habits.map((habit) => {
      const consistency = calculateConsistency(habit.createdAt, habit.checkIns, habit.freezesUsed);
      const completedToday = habit.checkIns.some(
        (ci) => ci.date.toISOString().startsWith(today) && ci.completed
      );
      return {
        id: habit.id,
        title: habit.title,
        cue: habit.cue,
        minimumVersion: habit.minimumVersion,
        pairWith: habit.pairWith,
        goalId: habit.goalId,
        difficultyStage: habit.difficultyStage,
        freezesUsed: habit.freezesUsed,
        createdAt: habit.createdAt,
        consistency,
        completedToday,
        recentCheckIns: habit.checkIns.slice(0, 30),
      };
    });

    res.status(200).json({ habits: habitsWithConsistency });
  } catch (error) {
    console.error("Error fetching habits:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to retrieve habits" });
  }
});

/**
 * GET /api/habits/:id
 * Retrieve details of a specific habit. Protected against IDOR.
 */
router.get("/:id", requireHabitOwner, async (req: Request, res: Response) => {
  try {
    const habitId = req.params.id;

    const habit = await prisma.habit.findUnique({
      where: { id: habitId },
      include: {
        checkIns: {
          orderBy: { date: "desc" },
        },
        goal: true,
      },
    });

    if (!habit) {
      res.status(404).json({ error: "not_found", message: "Habit not found" });
      return;
    }

    const consistency = calculateConsistency(habit.createdAt, habit.checkIns, habit.freezesUsed);

    res.status(200).json({
      habit: {
        ...habit,
        consistency,
      },
    });
  } catch (error) {
    console.error("Error fetching habit details:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to retrieve habit details" });
  }
});

/**
 * PUT /api/habits/:id
 * Update an existing habit. Protected against IDOR.
 */
router.put("/:id", requireHabitOwner, async (req: Request, res: Response) => {
  try {
    const habitId = req.params.id;

    const result = UpdateHabitSchema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({
        error: "validation_error",
        message: "Invalid habit data supplied",
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    const { title, cue, minimumVersion, pairWith, goalId, freezesUsed } = result.data;

    // Progress Principle — re-check ownership when changing goalId
    if (goalId !== undefined && goalId !== null) {
      const goal = await prisma.goal.findFirst({
        where: { id: goalId, userId: req.user!.id },
      });
      if (!goal) {
        res.status(404).json({ error: "not_found", message: "Meta não encontrada ou não pertence ao usuário" });
        return;
      }
    }

    const updatedHabit = await prisma.habit.update({
      where: { id: habitId },
      data: {
        title,
        cue,
        minimumVersion,
        pairWith,
        goalId,
        freezesUsed,
      },
      include: {
        checkIns: true,
        goal: true,
      },
    });

    const consistency = calculateConsistency(updatedHabit.createdAt, updatedHabit.checkIns, updatedHabit.freezesUsed);

    res.status(200).json({
      message: "Habit successfully updated",
      habit: {
        ...updatedHabit,
        consistency,
      },
    });
  } catch (error) {
    console.error("Error updating habit:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to update habit" });
  }
});

/**
 * DELETE /api/habits/:id
 * Hard delete a habit and its check-ins. Protected against IDOR.
 */
router.delete("/:id", requireHabitOwner, async (req: Request, res: Response) => {
  try {
    const habitId = req.params.id;

    await prisma.$transaction(async (tx) => {
      // Delete child check-ins first
      await tx.habitCheckIn.deleteMany({
        where: { habitId },
      });

      // Delete the Habit
      await tx.habit.delete({
        where: { id: habitId },
      });
    });

    res.status(200).json({ message: "Habit successfully deleted" });
  } catch (error) {
    console.error("Error deleting habit:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to delete habit" });
  }
});

/**
 * POST /api/habits/:id/checkin
 * Register/toggle a check-in for a specific date (YYYY-MM-DD). Protected against IDOR.
 */
router.post("/:id/checkin", writeLimiter, requireHabitOwner, async (req: Request, res: Response) => {
  try {
    const habitId = req.params.id;

    // Validate check-in request
    const result = HabitCheckInSchema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({
        error: "validation_error",
        message: "Invalid check-in details",
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    const { date, completed } = result.data;
    const parsedDate = new Date(date + "T00:00:00.000Z"); // Store as date without timezone shifts

    // Get the existing check-in to see if it was frozen
    const existingCheckIn = await prisma.habitCheckIn.findUnique({
      where: {
        habitId_date: {
          habitId,
          date: parsedDate,
        },
      },
    });

    const wasFrozen = existingCheckIn?.isFrozen || false;

    // Create or update the check-in in a transaction
    const updateResult = await prisma.$transaction(async (tx) => {
      // If it was frozen, we decrement freezesUsed on the Habit
      if (wasFrozen) {
        await tx.habit.update({
          where: { id: habitId },
          data: {
            freezesUsed: {
              decrement: 1,
            },
          },
        });
      }

      const checkIn = await tx.habitCheckIn.upsert({
        where: {
          habitId_date: {
            habitId,
            date: parsedDate,
          },
        },
        update: {
          completed,
          isFrozen: false,
        },
        create: {
          habitId,
          date: parsedDate,
          completed,
          isFrozen: false,
        },
      });

      return checkIn;
    });

    // Fetch habit with goal relation to recalculate consistency and compute goalImpact
    const habit = await prisma.habit.findUnique({
      where: { id: habitId },
      include: { checkIns: true, goal: true },
    });

    const consistency = calculateConsistency(habit!.createdAt, habit!.checkIns, habit!.freezesUsed);

    // Progress Principle — retorna impacto na meta vinculada quando existir
    let goalImpact: { goalTitle: string; relatedProgressSignal: number } | null = null;
    if (habit?.goal && completed) {
      const totalCheckIns = await prisma.habitCheckIn.count({
        where: { habit: { goalId: habit.goal.id }, completed: true },
      });
      goalImpact = {
        goalTitle: habit.goal.title,
        relatedProgressSignal: totalCheckIns,
      };
    }

    // Fogg B=MAP — decide tipo de prompt adaptativo para próxima notificação
    const prompt = await decideHabitPrompt(habitId);

    res.status(200).json({
      message: "Habit check-in registered successfully",
      checkIn: updateResult,
      consistency,
      freezesUsed: habit!.freezesUsed,
      goalImpact,
      nextPrompt: prompt,
    });
  } catch (error) {
    console.error("Error registering habit check-in:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to register habit check-in" });
  }
});

/**
 * POST /api/habits/:id/freeze
 * Freeze a specific date (allows skipping habit without penalizing consistency). Protected against IDOR.
 */
router.post("/:id/freeze", writeLimiter, requireHabitOwner, async (req: Request, res: Response) => {
  try {
    const habitId = req.params.id;

    // Validate date parameter
    const result = HabitFreezeSchema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({
        error: "validation_error",
        message: "Invalid freeze date",
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    const { date } = result.data;
    const parsedDate = new Date(date + "T00:00:00.000Z");

    // Check if check-in already exists and is completed
    const existingCheckIn = await prisma.habitCheckIn.findUnique({
      where: {
        habitId_date: {
          habitId,
          date: parsedDate,
        },
      },
    });

    // If it already exists, is completed, and is NOT frozen, we don't need to freeze it (already done)
    if (existingCheckIn && existingCheckIn.completed && !existingCheckIn.isFrozen) {
      res.status(400).json({
        error: "already_completed",
        message: "This date is already marked as completed. No need to freeze.",
      });
      return;
    }

    // If it is ALREADY frozen, we don't want to freeze it again!
    if (existingCheckIn && existingCheckIn.isFrozen) {
      res.status(400).json({
        error: "already_frozen",
        message: "This date is already frozen.",
      });
      return;
    }

    // Process the freeze in a transaction
    const updateResult = await prisma.$transaction(async (tx) => {
      // 1. Increment freezesUsed on the Habit
      const updatedHabit = await tx.habit.update({
        where: { id: habitId },
        data: {
          freezesUsed: {
            increment: 1,
          },
        },
      });

      // 2. Set the check-in to completed: true and isFrozen: true (to count as a free pass)
      const checkIn = await tx.habitCheckIn.upsert({
        where: {
          habitId_date: {
            habitId,
            date: parsedDate,
          },
        },
        update: {
          completed: true,
          isFrozen: true,
        },
        create: {
          habitId,
          date: parsedDate,
          completed: true,
          isFrozen: true,
        },
      });

      return { updatedHabit, checkIn };
    });

    // Fetch full check-ins to compute new consistency
    const habit = await prisma.habit.findUnique({
      where: { id: habitId },
      include: { checkIns: true },
    });

    const consistency = calculateConsistency(habit!.createdAt, habit!.checkIns, habit!.freezesUsed);

    res.status(211).json({
      message: "Habit paused/frozen successfully for this date",
      freezesUsed: updateResult.updatedHabit.freezesUsed,
      checkIn: updateResult.checkIn,
      consistency,
    });
  } catch (error) {
    console.error("Error freezing habit date:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to freeze habit date" });
  }
});

export default router;
