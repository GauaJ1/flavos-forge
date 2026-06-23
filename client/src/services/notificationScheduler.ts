import { LocalNotifications } from '@capacitor/local-notifications';

export async function scheduleAllForgeReminders() {
  // Cancela todas as notificações anteriores pra evitar duplicatas
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel(pending);
  }

  await LocalNotifications.schedule({
    notifications: [
      // 1. Lembrete de hábitos matinais — 8h todo dia
      {
        id: 1,
        title: 'Bom dia — hora dos rituais',
        body: 'Academia, hidratação e o que mais tiver pra hoje.',
        schedule: {
          on: { hour: 8, minute: 0 },
          repeats: true,
          allowWhileIdle: true,
        },
      },

      // 2. CHECK DA TARDE — 13h30 todo dia (mais importante)
      {
        id: 2,
        title: '⚠️ Check da tarde',
        body: 'Você tem algo concreto pra fazer agora? Se não — abre o projeto técnico por 10 minutos.',
        schedule: {
          on: { hour: 13, minute: 30 },
          repeats: true,
          allowWhileIdle: true,
        },
      },

      // 3. Lembrete de leitura — 13h30 (junto ao check, âncora da tarde)
      {
        id: 3,
        title: 'Leitura da tarde',
        body: 'Só 2 páginas já conta. Pega o livro antes do celular.',
        schedule: {
          on: { hour: 14, minute: 0 },
          repeats: true,
          allowWhileIdle: true,
        },
      },

      // 4. Hidratação — lembrete à tarde pra completar os 3L
      {
        id: 4,
        title: 'Hidratação 💧',
        body: 'Já bebeu água hoje? Vai completando os 3L.',
        schedule: {
          on: { hour: 16, minute: 0 },
          repeats: true,
          allowWhileIdle: true,
        },
      },

      // 5. Encerramento do dia — 21h
      {
        id: 5,
        title: 'Hora de fechar o dia',
        body: 'Abre o Forge e registra como foi a tarde — 1 frase já basta.',
        schedule: {
          on: { hour: 21, minute: 0 },
          repeats: true,
          allowWhileIdle: true,
        },
      },

      // 6. Revisão semanal — domingo às 18h
      {
        id: 6,
        title: 'Revisão semanal',
        body: 'Olhe para trás com curiosidade, não com julgamento.',
        schedule: {
          on: { weekday: 1, hour: 18, minute: 0 },
          repeats: true,
          allowWhileIdle: true,
        },
      },

      // 7. Fresh Start — segunda-feira às 8h (Fresh Start Effect)
      {
        id: 7,
        title: 'Nova semana, novo começo',
        body: 'O que ficou pra trás, fica pra trás. Hoje é um novo ponto de partida.',
        schedule: {
          on: { weekday: 2, hour: 8, minute: 0 },
          repeats: true,
          allowWhileIdle: true,
        },
      },
    ],
  });
}

// Notificação de teste — usar só durante desenvolvimento
export async function scheduleTestNotification() {
  await LocalNotifications.schedule({
    notifications: [{
      id: 99,
      title: 'Forge ✓',
      body: 'Notificações funcionando.',
      schedule: { at: new Date(Date.now() + 10 * 1000) },
    }],
  });
}
