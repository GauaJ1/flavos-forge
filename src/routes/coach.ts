import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { coachLimiter } from "../middlewares/rateLimiter.js";
import { prisma } from "../services/db.js";
import { getOrGenerateCoachInsight } from "../services/coachService.js";

const router = Router();

// Apply auth to all routes in this router
router.use(requireAuth);

/**
 * GET /api/coach/insight
 * Generates or retrieves the cached weekly Coach IA insight.
 * Respects user plan limits and handles API keys safely.
 */
router.get("/insight", coachLimiter, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Check user plan to enforce premium access
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true }
    });

    const isPro = user?.plan && user.plan !== "FREE";
    const isDev = process.env.NODE_ENV === "development";

    // If not Pro and not in local dev mode, return teaser status
    if (!isPro && !isDev) {
      return res.status(200).json({
        isLocked: true,
        message: "O Coach IA é um recurso exclusivo do Forge Pro. Seu resumo semanal estará disponível após o upgrade do plano."
      });
    }

    // Call service to get cached or generate new weekly insight
    const insight = await getOrGenerateCoachInsight(userId);

    return res.status(200).json({
      isLocked: false,
      insight
    });
  } catch (error) {
    console.error("GET /coach/insight endpoint error:", error);
    return res.status(500).json({
      error: "internal_server_error",
      message: "Falha ao recuperar insight do Coach IA."
    });
  }
});

export default router;
