import { prisma } from "./db.js";

type PromptType = "signal" | "facilitator";

interface PromptDecision {
  type: PromptType;
  title: string;
  body: string;
}

/**
 * Fogg Behavior Model (B=MAP) — decide o tipo de lembrete adaptativo para um hábito.
 *
 * APENAS dois tipos existem:
 *   - "signal"      → usuário consistente (≥70% nos últimos 7 dias): lembrete simples, sem pressão extra.
 *   - "facilitator" → usuário em dificuldade (<70%): oferece facilitar, nunca cobra.
 *
 * NÃO existe um terceiro tipo "spark de culpa". Isso é intencional — releia a
 * Regra Não-Negociável do prompt de engajamento ético antes de adicionar qualquer variação.
 *
 * A janela mínima é 7 dias (conforme especificado) para evitar classificar erroneamente
 * um usuário consistente por um único dia ruim isolado.
 */
export async function decideHabitPrompt(habitId: string): Promise<PromptDecision> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const last7Days = await prisma.habitCheckIn.findMany({
    where: {
      habitId,
      date: { gte: sevenDaysAgo },
    },
    select: { completed: true },
  });

  const completedCount = last7Days.filter((c) => c.completed).length;
  // Denominador fixo de 7 para manter a janela estável mesmo se o hábito for novo
  const consistency = completedCount / 7;

  if (consistency >= 0.7) {
    // Usuário consistente — lembrete simples, sem pressão extra
    return {
      type: "signal",
      title: "Hora do ritual",
      body: "Seu hábito de hoje está esperando.",
    };
  }

  // Usuário em dificuldade — oferece facilitar, NUNCA cobra
  const habit = await prisma.habit.findUnique({
    where: { id: habitId },
    select: { minimumVersion: true },
  });

  return {
    type: "facilitator",
    title: "Que tal a versão mais simples hoje?",
    body: habit?.minimumVersion
      ? `Só ${habit.minimumVersion} já conta.`
      : "Qualquer passo pequeno já conta hoje.",
  };
}
