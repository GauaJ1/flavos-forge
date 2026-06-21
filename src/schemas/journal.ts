import { z } from "zod";

export const CreateJournalEntrySchema = z.object({
  content: z.string({
    required_error: "Journal content is required"
  })
  .min(10, "Journal content must be at least 10 characters long to promote expressive writing")
  .max(10000, "Journal content must be under 10,000 characters"),
  
  mood: z.number().int().min(1).max(5).optional().nullable()
});

export const UpdateJournalEntrySchema = z.object({
  content: z.string().min(10).max(10000).optional(),
  mood: z.number().int().min(1).max(5).optional().nullable()
});
