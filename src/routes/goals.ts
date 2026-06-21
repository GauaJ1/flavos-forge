import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { requireGoalOwner } from "../middlewares/requireGoalOwner.js";
import { CreateGoalSchema, UpdateGoalSchema, GoalCheckInSchema } from "../schemas/goals.js";
import { prisma } from "../services/db.js";
import { writeLimiter } from "../middlewares/rateLimiter.js";

const router = Router();

// Secure all endpoints with authentication by default
router.use(requireAuth);

/**
 * POST /api/goals
 * Create a new goal with at least one Action Plan (se-então plan).
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Validate request body
    const result = CreateGoalSchema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({
        error: "validation_error",
        message: "Invalid goal data supplied",
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    const { title, specificOutcome, metric, difficulty, deadline, actionPlans } = result.data;

    // Create Goal and associated Action Plans in a transaction
    const goal = await prisma.$transaction(async (tx) => {
      const newGoal = await tx.goal.create({
        data: {
          userId,
          title,
          specificOutcome,
          metric,
          difficulty,
          deadline,
          status: "ACTIVE",
        },
      });

      // Create action plans linked to the goal
      const createdActionPlans = await Promise.all(
        actionPlans.map((ap) =>
          tx.actionPlan.create({
            data: {
              goalId: newGoal.id,
              triggerCue: ap.triggerCue,
              action: ap.action,
            },
          })
        )
      );

      return {
        ...newGoal,
        actionPlans: createdActionPlans,
      };
    });

    res.status(211).json({
      message: "Goal successfully created",
      goal,
    });
  } catch (error) {
    console.error("Error creating goal:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to create goal" });
  }
});

/**
 * GET /api/goals
 * Retrieve all goals of the authenticated user.
 * Optional query parameter: status (ACTIVE, COMPLETED, ARCHIVED)
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { status } = req.query;

    const whereClause: any = { userId };
    if (status && (status === "ACTIVE" || status === "COMPLETED" || status === "ARCHIVED")) {
      whereClause.status = status;
    }

    const goals = await prisma.goal.findMany({
      where: whereClause,
      include: {
        actionPlans: true,
        checkIns: {
          orderBy: { createdAt: "desc" },
          take: 10, // Limit to recent check-ins for performance
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ goals });
  } catch (error) {
    console.error("Error fetching goals:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to retrieve goals" });
  }
});

/**
 * GET /api/goals/:id
 * Retrieve details of a specific goal. Protected against IDOR.
 */
router.get("/:id", requireGoalOwner, async (req: Request, res: Response) => {
  try {
    const goalId = req.params.id;

    // Goal is already loaded on req.goal by requireGoalOwner middleware,
    // but we retrieve it with relations for full details.
    const goalDetails = await prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        actionPlans: true,
        checkIns: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    res.status(200).json({ goal: goalDetails });
  } catch (error) {
    console.error("Error fetching goal details:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to retrieve goal details" });
  }
});

/**
 * PUT /api/goals/:id
 * Update an existing goal and optionally its action plans. Protected against IDOR.
 */
router.put("/:id", requireGoalOwner, async (req: Request, res: Response) => {
  try {
    const goalId = req.params.id;

    const result = UpdateGoalSchema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({
        error: "validation_error",
        message: "Invalid goal data supplied",
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    const { title, specificOutcome, metric, difficulty, deadline, status, actionPlans } = result.data;

    const updatedGoal = await prisma.$transaction(async (tx) => {
      // 1. Update the Goal metadata
      const goal = await tx.goal.update({
        where: { id: goalId },
        data: {
          title,
          specificOutcome,
          metric,
          difficulty,
          deadline,
          status,
        },
      });

      // 2. If action plans are supplied in the update, replace existing ones
      if (actionPlans) {
        // Delete all old action plans for this goal
        await tx.actionPlan.deleteMany({
          where: { goalId },
        });

        // Insert the new action plans
        await Promise.all(
          actionPlans.map((ap) =>
            tx.actionPlan.create({
              data: {
                goalId,
                triggerCue: ap.triggerCue,
                action: ap.action,
              },
            })
          )
        );
      }

      // Fetch the updated goal with its updated action plans
      return await tx.goal.findUnique({
        where: { id: goalId },
        include: { actionPlans: true },
      });
    });

    res.status(200).json({
      message: "Goal successfully updated",
      goal: updatedGoal,
    });
  } catch (error) {
    console.error("Error updating goal:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to update goal" });
  }
});

/**
 * DELETE /api/goals/:id
 * Hard delete a goal and its associated action plans and check-ins. Protected against IDOR.
 */
router.delete("/:id", requireGoalOwner, async (req: Request, res: Response) => {
  try {
    const goalId = req.params.id;

    await prisma.$transaction(async (tx) => {
      // Delete child associations first to prevent FK constraint errors
      await tx.actionPlan.deleteMany({
        where: { goalId },
      });

      await tx.goalCheckIn.deleteMany({
        where: { goalId },
      });

      // Delete the parent Goal
      await tx.goal.delete({
        where: { id: goalId },
      });
    });

    res.status(200).json({ message: "Goal successfully deleted" });
  } catch (error) {
    console.error("Error deleting goal:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to delete goal" });
  }
});

/**
 * POST /api/goals/:id/checkin
 * Log progress check-in for a goal. Protected against IDOR.
 */
router.post("/:id/checkin", writeLimiter, requireGoalOwner, async (req: Request, res: Response) => {
  try {
    const goalId = req.params.id;

    const result = GoalCheckInSchema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({
        error: "validation_error",
        message: "Invalid check-in note",
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    const { note } = result.data;

    const checkIn = await prisma.goalCheckIn.create({
      data: {
        goalId,
        note,
      },
    });

    res.status(211).json({
      message: "Goal check-in registered successfully",
      checkIn,
    });
  } catch (error) {
    console.error("Error registering goal check-in:", error);
    res.status(500).json({ error: "internal_server_error", message: "Failed to register check-in" });
  }
});

export default router;
