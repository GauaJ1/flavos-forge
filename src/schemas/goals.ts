import { z } from "zod";

export const DifficultyEnum = z.enum(["easy", "medium", "hard", "extreme", "MODERATE", "HIGH", "moderate", "high"]);
export const GoalStatusEnum = z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]);

export const ActionPlanSchema = z.object({
  triggerCue: z.string({
    required_error: "Trigger cue is required (e.g., 'Se eu chegar em casa do trabalho')"
  })
  .min(3, "Trigger cue must be at least 3 characters")
  .max(150, "Trigger cue must be under 150 characters")
  .trim(),
  
  action: z.string({
    required_error: "Action is required (e.g., 'treino por 20 minutos')"
  })
  .min(3, "Action must be at least 3 characters")
  .max(150, "Action must be under 150 characters")
  .trim()
});

export const CreateGoalSchema = z.object({
  title: z.string({
    required_error: "Goal title is required"
  })
  .min(3, "Goal title must be at least 3 characters")
  .max(100, "Goal title must be under 100 characters")
  .trim(),
  
  specificOutcome: z.string({
    required_error: "Specific outcome is required"
  })
  .min(5, "Specific outcome must be at least 5 characters")
  .max(255, "Specific outcome must be under 255 characters")
  .trim(),
  
  metric: z.string().max(100, "Metric must be under 100 characters").trim().optional().nullable(),
  
  difficulty: DifficultyEnum.default("medium"),
  
  deadline: z.string()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Deadline must be a valid date string",
    })
    .optional()
    .nullable()
    .or(z.date())
    .transform((val) => {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    }),
  
  actionPlans: z.array(ActionPlanSchema)
    .min(1, "At least one Action Plan (if-then cue) is required for behavioral commitment")
});

export const UpdateGoalSchema = z.object({
  title: z.string().min(3).max(100).trim().optional(),
  specificOutcome: z.string().min(5).max(255).trim().optional(),
  metric: z.string().max(100).trim().optional().nullable(),
  difficulty: DifficultyEnum.optional(),
  deadline: z.string()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Deadline must be a valid date string",
    })
    .optional()
    .nullable()
    .or(z.date())
    .transform((val) => {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    }),
  status: GoalStatusEnum.optional(),
  actionPlans: z.array(ActionPlanSchema).optional()
});

export const GoalCheckInSchema = z.object({
  note: z.string().max(255, "Check-in note must be under 255 characters").trim().optional().nullable()
});

