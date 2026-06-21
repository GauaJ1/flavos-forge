import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters long").max(100),
  name: z.string().max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(1, "Password is required").max(100),
});

export const recoveryRequestSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
});

export const recoveryResetSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  otp: z.string().length(6, "OTP must be exactly 6 characters"),
  newPassword: z.string().min(8, "Password must be at least 8 characters long").max(100),
});
