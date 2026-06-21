import { prisma } from "./db.js";

interface UserMetrics {
  goals: any[];
  habits: {
    overallConsistency: number;
    summary: any[];
  };
  reflection: {
    averageMood: number | null;
    logsCount: number;
  };
}

export interface CoachInsightResponse {
  summary: string;
  highlight: string;
  suggestion: string;
}

const COACH_SYSTEM_PROMPT = `Você é o Coach IA do Flavos Forge, um assistente especializado em ciência comportamental.
Seu papel é analisar as métricas agregadas de metas, hábitos e humor de um usuário durante a última semana para fornecer um feedback objetivo, científico e encorajador (baseado em Teorias de Estabelecimento de Metas e Intenções de Implementação).

Regras de conduta:
1. Nunca invente dados. Analise estritamente o que foi enviado.
2. Sua sugestão DEVE ser no formato "Se [gatilho/obstáculo], então [ação corretiva/alternativa]" (plano de contingência prático).
3. Seja conciso e direto.
4. Responda estritamente no formato JSON fornecido pelo schema.`;

/**
 * Fetches user metrics for the last 7 days.
 * Excludes raw plaintext of journals to guarantee user privacy.
 */
export async function getUserWeeklyMetrics(userId: string): Promise<UserMetrics> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // 1. Fetch active goals, their action plans, and check-ins in the last 7 days
  const goals = await prisma.goal.findMany({
    where: {
      userId,
      status: "ACTIVE",
    },
    include: {
      actionPlans: true,
      checkIns: {
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
      },
    },
  });

  // 2. Fetch habits and check-ins in the last 7 days
  const habits = await prisma.habit.findMany({
    where: { userId },
    include: {
      checkIns: {
        where: {
          date: { gte: sevenDaysAgo },
        },
        orderBy: { date: "asc" },
      },
    },
  });

  // 3. Fetch journal entries (mood only, to protect privacy) in the last 7 days
  const journalEntries = await prisma.journalEntry.findMany({
    where: {
      userId,
      createdAt: { gte: sevenDaysAgo },
      deletedAt: null,
    },
    select: {
      mood: true,
    },
  });

  // Calculations
  let totalWeeklyCheckIns = 0;
  let completedWeeklyCheckIns = 0;

  const weeklyHabitsSummary = habits.map((habit) => {
    const completedThisWeek = habit.checkIns.filter((ci) => ci.completed).length;
    const totalThisWeek = habit.checkIns.length;
    
    totalWeeklyCheckIns += totalThisWeek;
    completedWeeklyCheckIns += completedThisWeek;

    return {
      title: habit.title,
      cue: habit.cue,
      freezesUsed: habit.freezesUsed,
      weeklyConsistency: totalThisWeek > 0 ? Math.round((completedThisWeek / totalThisWeek) * 100) : 0,
    };
  });

  const overallHabitConsistency = totalWeeklyCheckIns > 0 
    ? Math.round((completedWeeklyCheckIns / totalWeeklyCheckIns) * 100) 
    : 0;

  const moods = journalEntries.map((j) => j.mood).filter((m): m is number => m !== null);
  const averageMood = moods.length > 0 
    ? parseFloat((moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1)) 
    : null;

  return {
    goals: goals.map((g) => ({
      title: g.title,
      specificOutcome: g.specificOutcome,
      difficulty: g.difficulty,
      weeklyCheckInCount: g.checkIns.length,
      actionPlans: g.actionPlans.map((ap) => ({ triggerCue: ap.triggerCue, action: ap.action })),
    })),
    habits: {
      overallConsistency: overallHabitConsistency,
      summary: weeklyHabitsSummary,
    },
    reflection: {
      averageMood,
      logsCount: journalEntries.length,
    },
  };
}

/**
 * Calls Gemini API via HTTPS Fetch to generate weekly insight
 */
async function callGeminiAPI(metrics: UserMetrics): Promise<CoachInsightResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }

  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const promptText = `Aqui estão as métricas de progresso do usuário da última semana:
- Metas ativas e planos se-então: ${JSON.stringify(metrics.goals)}
- Hábitos e consistência individual: ${JSON.stringify(metrics.habits)}
- Média do humor (1-5): ${metrics.reflection.averageMood !== null ? metrics.reflection.averageMood : "Nenhum registro"}
- Frequência de escrita no diário: ${metrics.reflection.logsCount} dias na semana.

Analise as métricas e retorne um objeto JSON válido contendo:
- "summary": Um resumo motivador focado em ciência comportamental (máximo 400 caracteres).
- "highlight": O destaque da semana ou ponto de maior atenção (máximo 120 caracteres).
- "suggestion": Um plano se-então prático para melhorar ou manter o foco (máximo 200 caracteres).`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: promptText }
        ]
      }
    ],
    systemInstruction: {
      parts: [
        { text: COACH_SYSTEM_PROMPT }
      ]
    },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          summary: { 
            type: "STRING", 
            description: "Resumo de até 400 caracteres avaliando o progresso da consistência do usuário." 
          },
          highlight: { 
            type: "STRING", 
            description: "Destaque positivo ou ponto crítico de até 120 caracteres." 
          },
          suggestion: { 
            type: "STRING", 
            description: "Sugestão acionável no formato 'Se... então...' de até 200 caracteres para contornar os desafios." 
          }
        },
        required: ["summary", "highlight", "suggestion"]
      }
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(10000) // 10-second timeout
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`GEMINI_API_ERROR (HTTP ${response.status}): ${errorBody}`);
  }

  interface GeminiResponse {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  }
  const data = (await response.json()) as GeminiResponse;
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("GEMINI_EMPTY_RESPONSE");
  }

  const parsed = JSON.parse(rawText.trim());
  
  if (
    typeof parsed.summary !== "string" ||
    typeof parsed.highlight !== "string" ||
    typeof parsed.suggestion !== "string"
  ) {
    throw new Error("GEMINI_INVALID_SCHEMA");
  }

  return {
    summary: parsed.summary.substring(0, 400),
    highlight: parsed.highlight.substring(0, 120),
    suggestion: parsed.suggestion.substring(0, 200)
  };
}

/**
 * Checks, generates, and caches a CoachInsight for the user
 */
export async function getOrGenerateCoachInsight(userId: string): Promise<CoachInsightResponse> {
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

  // 1. Check if an insight was already generated in the last 5 days
  const existingInsight = await prisma.coachInsight.findFirst({
    where: {
      userId,
      createdAt: { gte: fiveDaysAgo }
    },
    orderBy: { createdAt: "desc" }
  });

  if (existingInsight) {
    return {
      summary: existingInsight.summary,
      highlight: existingInsight.highlight,
      suggestion: existingInsight.suggestion
    };
  }

  // 2. Fetch Weekly Metrics
  const metrics = await getUserWeeklyMetrics(userId);

  // 3. Check for Gemini Key and generate
  try {
    const generated = await callGeminiAPI(metrics);

    // Save to Database
    await prisma.coachInsight.create({
      data: {
        userId,
        summary: generated.summary,
        highlight: generated.highlight,
        suggestion: generated.suggestion
      }
    });

    return generated;
  } catch (err: any) {
    console.error("Failed to call Gemini API:", err.message || err);

    // Fallback: Default behavioral science feedback if Gemini is unavailable
    const fallbackInsight: CoachInsightResponse = {
      summary: `Olá! Seu painel de métricas da semana está pronto. Sua consistência média em hábitos foi de ${metrics.habits.overallConsistency}%. Continue registrando seus comportamentos para receber feedbacks dinâmicos completos da IA.`,
      highlight: metrics.habits.overallConsistency >= 70 ? "Bom foco!" : "Atenção ao ritmo da consistência",
      suggestion: "Se eu me sentir sem rumo no dia, então vou abrir minhas metas e ler meu plano se-então por 1 minuto."
    };

    return fallbackInsight;
  }
}
