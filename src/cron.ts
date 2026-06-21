// src/cron.ts — Job semanal do Coach IA
import { prisma } from "./services/db.js";
import { getOrGenerateCoachInsight } from "./services/coachService.js";

async function runWeeklyCoachJob() {
  console.log("[CRON] Starting weekly Coach IA job...");
  
  // Buscar todos os usuários Pro (plano diferente de FREE)
  const proUsers = await prisma.user.findMany({
    where: {
      plan: { not: "FREE" }
    },
    select: { id: true, email: true, plan: true }
  });
  
  console.log(`[CRON] Found ${proUsers.length} Pro users to process.`);
  
  let successCount = 0;
  let failCount = 0;

  for (const user of proUsers) {
    try {
      console.log(`[CRON] Generating insight for user ${user.email} (ID: ${user.id}, Plan: ${user.plan})...`);
      await getOrGenerateCoachInsight(user.id);
      console.log(`[CRON] Success for user ${user.id}`);
      successCount++;
    } catch (err: any) {
      console.error(`[CRON] Failed for user ${user.id}:`, err.message || err);
      failCount++;
    }
  }
  
  console.log(`[CRON] Weekly Coach IA job completed. Successes: ${successCount}, Failures: ${failCount}`);
  await prisma.$disconnect();
  process.exit(0);
}

runWeeklyCoachJob();
