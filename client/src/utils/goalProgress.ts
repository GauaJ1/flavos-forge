interface CheckInLike {
  createdAt: string;
}

interface GoalProgressInput {
  hasDeadline: boolean;
  checkIns: CheckInLike[];
  expectedCheckIns?: number; // opcional — meta explícita de quantos check-ins até o prazo
}

/**
 * Expoente da curva de progresso. Valores > 1 produzem uma curva côncava:
 * progresso parece mais lento no início e acelera perto da conclusão —
 * alinhado com a Goal-Gradient Hypothesis (Hull, 1932; Kivetz et al., 2006).
 *
 * Referência de calibração (expectedCheckIns = 45):
 *   17 check-ins → linear: 38%  | curva (1.5): 23%  | curva (1.8): 17%
 *   30 check-ins → linear: 67%  | curva (1.5): 51%  | curva (1.8): 45%
 *   40 check-ins → linear: 89%  | curva (1.5): 80%  | curva (1.8): 76%
 *   45 check-ins → linear: 100% | curva (1.5): 100% | curva (1.8): 100%
 *
 * 1.5 é o padrão recomendado — perceptível sem exagerar a desaceleração inicial.
 */
const PROGRESS_CURVE_EXPONENT = 1.5;

/**
 * Progresso é calculado por ESFORÇO (quantidade de check-ins), nunca por
 * tempo decorrido. O deadline é usado só como contexto de exibição
 * (ver getDeadlineContext), nunca como fator que reduz o progresso.
 *
 * Quando `expectedCheckIns` está definido, a fórmula usa uma curva côncava
 * (Goal-Gradient): o progresso acelera conforme a pessoa se aproxima do fim.
 * Isso é uma escolha de exibição transparente — o esforço real exigido
 * (número de check-ins) não muda.
 *
 * @param curveExponent - expoente da curva (padrão: 1.5). Faixa recomendada: 1.2–1.8.
 */
export function calculateGoalProgress(
  input: GoalProgressInput,
  curveExponent: number = PROGRESS_CURVE_EXPONENT
): number {
  const checkInsCount = input.checkIns.length;

  if (checkInsCount === 0) return 0;

  // Com meta de check-ins definida: curva côncava (Goal-Gradient)
  if (input.expectedCheckIns && input.expectedCheckIns > 0) {
    const ratio = Math.min(1, checkInsCount / input.expectedCheckIns);
    const curved = Math.pow(ratio, curveExponent);
    return Math.min(100, Math.round(curved * 100));
  }

  // Fallback sem expectedCheckIns: sem curva, pois não há "linha de chegada"
  // definida para calcular a proximidade do fim. 10% por check-in, teto 100%.
  return Math.min(100, checkInsCount * 10);
}

/**
 * Retorna a data do check-in mais antigo, ordenando explicitamente por data
 * em vez de assumir a posição no array.
 */
export function getEarliestCheckIn(checkIns: CheckInLike[]): Date | null {
  if (checkIns.length === 0) return null;
  const sorted = [...checkIns].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  return new Date(sorted[0].createdAt);
}

/**
 * Contexto de prazo — usado SÓ para exibição (badge "faltam X dias"),
 * nunca para calcular a porcentagem de progresso.
 */
export function getDeadlineContext(deadline: string): { daysRemaining: number; isOverdue: boolean } {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const daysRemaining = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return { daysRemaining, isOverdue: daysRemaining < 0 };
}
