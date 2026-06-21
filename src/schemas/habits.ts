import { z } from "zod";

export const CreateHabitSchema = z.object({
  title: z.string({
    required_error: "Habit title is required"
  })
  .min(3, "Habit title must be at least 3 characters")
  .max(100, "Habit title must be under 100 characters")
  .trim(),
  
  cue: z.string()
    .max(150, "Cue must be under 150 characters")
    .trim()
    .optional()
    .nullable()
});

export const UpdateHabitSchema = z.object({
  title: z.string().min(3).max(100).trim().optional(),
  cue: z.string().max(150).trim().optional().nullable(),
  freezesUsed: z.number().int().nonnegative().optional()
});

export const HabitCheckInSchema = z.object({
  date: z.string({
    required_error: "Check-in date is required"
  })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  
  completed: z.boolean({
    required_error: "Completed status must be a boolean"
  })
});

export const HabitFreezeSchema = z.object({
  date: z.string({
    required_error: "Freeze date is required"
  })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
});
