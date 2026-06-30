interface CheckInLike {
  createdAt: string;
}

interface GoalProgressInput {
  hasDeadline: boolean;
  checkIns: CheckInLike[];
  expectedCheckIns?: number; // opcional — meta explícita de quantos check-ins até o prazo
}

/**
 * Progresso é calculado por ESFORÇO (quantidade de check-ins), nunca por
 * tempo decorrido. O deadline é usado só como contexto de exibição
 * (ver getDeadlineContext), nunca como fator que reduz o progresso.
 */
export function calculateGoalProgress(input: GoalProgressInput): number {
  const checkInsCount = input.checkIns.length;

  if (checkInsCount === 0) return 0;

  // Se o usuário definiu uma meta explícita de check-ins, usar como base
  if (input.expectedCheckIns && input.expectedCheckIns > 0) {
    return Math.min(100, Math.round((checkInsCount / input.expectedCheckIns) * 100));
  }

  // Fallback padrão (igual para metas com ou sem prazo): 10% por check-in
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
