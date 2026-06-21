/**
 * Fresh Start Effect (Dai, Milkman & Riis, 2014)
 *
 * Marcos temporais criam uma sensação psicológica de "novo capítulo",
 * distanciando a pessoa de falhas passadas SEM culpa.
 *
 * Implementação deliberada:
 *   - Segunda-feira: ponto de retomada semanal.
 *   - Início de mês (dias 1–3): janela alargada para capturar quem acessa
 *     no primeiro dia útil em vez da meia-noite de sábado.
 *
 * O tom de TODOS os textos que usam estas flags deve soar como convite,
 * nunca como cobrança. Releia em voz alta — se soar como "você devia ter
 * feito isso antes", ajuste a cópia, não esta função.
 */
export function getFreshStartContext(): { isMonday: boolean; isMonthStart: boolean } {
  const today = new Date();
  return {
    isMonday: today.getDay() === 1,
    isMonthStart: today.getDate() <= 3,
  };
}
