import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { requireHabitOwner } from "../middlewares/requireHabitOwner.js";
import { CreateHabitSchema, UpdateHabitSchema, HabitCheckInSchema, HabitFreezeSchema } from "../schemas/habits.js";
import { prisma } from "../services/db.js";
import { writeLimiter } from "../middlewares/rateLimiter.js";

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

    const { title, cue } = result.data;

    const habit = await prisma.habit.create({
      data: {
        userId,
        title,
        cue,
        freezesUsed: 0,
      },
    });

    res.status(211).json({
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
        freezesUsed: habit.freezesUsed,
        createdAt: habit.createdAt,
        consistency,
        completedToday,
        recentCheckIns: habit.checkIns.slice(0, 30), // Return recent 30 checkins
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

    const { title, cue, freezesUsed } = result.data;

    const updatedHabit = await prisma.habit.update({
      where: { id: habitId },
      data: {
        title,
        cue,
        freezesUsed,
      },
      include: {
        checkIns: true,
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

    // Fetch all check-ins to recalculate consistency
    const habit = await prisma.habit.findUnique({
      where: { id: habitId },
      include: { checkIns: true },
    });

    const consistency = calculateConsistency(habit!.createdAt, habit!.checkIns, habit!.freezesUsed);

    res.status(211).json({
      message: "Habit check-in registered successfully",
      checkIn: updateResult,
      consistency,
      freezesUsed: habit!.freezesUsed,
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
