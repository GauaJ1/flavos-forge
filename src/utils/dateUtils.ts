import { toZonedTime, format } from 'date-fns-tz';
import { startOfWeek, endOfWeek } from 'date-fns';

/**
 * Retorna a data no formato YYYY-MM-DD para o fuso horário informado.
 */
export function getTodayInTimezone(timezone: string): string {
  const now = new Date();
  const zoned = toZonedTime(now, timezone);
  return format(zoned, 'yyyy-MM-dd', { timeZone: timezone });
}

/**
 * Retorna o início do dia (00:00:00) no fuso horário informado.
 */
export function getStartOfDayInTimezone(timezone: string): Date {
  const today = getTodayInTimezone(timezone);
  return toZonedTime(new Date(`${today}T00:00:00`), timezone);
}

/**
 * Retorna o fim do dia (23:59:59) no fuso horário informado.
 */
export function getEndOfDayInTimezone(timezone: string): Date {
  const today = getTodayInTimezone(timezone);
  return toZonedTime(new Date(`${today}T23:59:59`), timezone);
}

/**
 * Retorna o intervalo da semana atual no fuso horário informado,
 * começando na Segunda-feira (weekStartsOn: 1).
 */
export function getCurrentWeekRange(timezone: string): { start: Date; end: Date } {
  const now = toZonedTime(new Date(), timezone);
  const start = startOfWeek(now, { weekStartsOn: 1 });
  const end = endOfWeek(now, { weekStartsOn: 1 });
  return { start, end };
}
