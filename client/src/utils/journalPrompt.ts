/**
 * Daily Prompt logic based on the hour of the day.
 * Helps contextualize the user's reflection dynamically.
 */
export function getDailyPrompt(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Como você está chegando neste dia? O que quer preservar da manhã?';
  }
  if (hour < 17) {
    return 'Você tem algo concreto pra fazer agora? O que está travando o foco da tarde?';
  }
  return 'O que travou seu foco hoje — e o que destravou?';
}
