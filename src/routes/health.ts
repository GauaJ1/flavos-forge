import { Router, Request, Response } from "express";
import { prisma } from "../services/db.js";

const router = Router();

router.get("/health", async (req: Request, res: Response) => {
  try {
    // Perform a simple check query on the database to verify connectivity
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "OK",
      timestamp: new Date().toISOString(),
      services: {
        database: "healthy",
      },
    });
  } catch (error) {
    // Safe error log: we log the exact error inside the console for debugging
    console.error("Healthcheck database error:", error);

    // Fail closed: do NOT leak the error message or connection strings to the client
    res.status(500).json({
      status: "ERROR",
      timestamp: new Date().toISOString(),
      services: {
        database: "unhealthy",
      },
    });
  }
});

export default router;
