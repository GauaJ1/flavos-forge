import { PrismaClient } from "@prisma/client";

// Instantiate PrismaClient
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "info", "warn", "error"] : ["error", "warn"],
});
