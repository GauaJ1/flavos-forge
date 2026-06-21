# Flavos Forge — Guia Completo (Concepção → Produção)

> Novo produto do ecossistema Flavos. Cobre fundamentação científica, arquitetura, modelo de dados, segurança e roadmap (1 fase = 1 semana) até o go-live. Pensado para entrar em `02-Produtos/Flavos-Forge/` no vault.

---

## 1. Conceito

**O que é**: app de desenvolvimento pessoal focado em metas, hábitos e reflexão. Não é mais um "to-do list" — é um sistema que aplica achados de ciência comportamental para aumentar a taxa real de conclusão de metas, em vez de só registrar tarefas.

**Problema real**: a maioria das pessoas que define metas não as conclui — não por falta de motivação, mas por falta de estrutura entre "querer" e "fazer". Apps de hábito no estilo Duolingo resolvem isso com culpa e comparação social, o que aumenta engajamento de curto prazo mas gera ansiedade e abandono no médio prazo.

**Diferencial**: estrutura baseada em evidência — metas específicas, planos "se-então", hábitos medidos por consistência (não streak punitivo), diário privado e revisão semanal. Foco em consistência real, não em métricas de engajamento vaidosas.

**Encaixe no ecossistema**: `forge.flavoscompany.xyz` · JWT compartilhado quando o SSO do Flavos One estiver disponível · mesmo padrão de planos do Flavos Pass.

| App | Status | Backend | Auth | Dados |
|-----|--------|---------|------|-------|
| **Flavos Forge** | 💡 Em concepção | Node.js + Express + PostgreSQL + Prisma | Própria (pré-SSO) | PostgreSQL (Neon) |

---

## 2. Fundamentação científica → decisão de produto

### Metas específicas e desafiadoras
Décadas de pesquisa em Goal-Setting Theory (Locke & Latham) mostram que metas específicas e desafiadoras, com prazo e feedback periódico, geram desempenho muito superior a metas vagas como "ser mais produtivo" — mas o efeito desaparece quando a meta passa do limite real de habilidade da pessoa.
→ **Decisão**: o formulário de meta exige resultado específico e mensurável, nível de dificuldade e prazo. Não existe campo de "meta vaga".

### Planos "se-então"
A meta-análise de Gollwitzer & Sheeran (2006), com 94 estudos e mais de 8 mil participantes, encontrou efeito médio-a-alto (d = 0,65) de planos do tipo "se [gatilho], então [ação]" sobre o alcance de metas. Em estudos específicos, esse tipo de plano chegou a dobrar a taxa de conclusão em relação a apenas declarar a intenção.
→ **Decisão**: toda meta e todo hábito tem um campo obrigatório de plano de ação ("Se eu chegar em casa do trabalho, então treino por 20 min"), não só um título solto.

### Hábitos sem streak shaming
O estudo de Lally et al. (UCL, 2010) acompanhou pessoas formando hábitos por 12 semanas e mediu em 66 dias o tempo médio até o comportamento se tornar automático (variando de 18 a 254 dias) — e descobriu que perder um dia isolado não compromete de forma relevante esse processo. Em paralelo, pesquisas recentes sobre apps de hábito mostram que mecânicas de streak punitivas geram culpa e abandono, principalmente em contextos de bem-estar pessoal.
→ **Decisão**: hábitos são medidos por **consistência em janela móvel de 30 dias (%)**, não por streak bruto. Cada hábito tem direito a "pausas" sem penalização visual nem notificação de culpa.

### Autonomia, competência e pertencimento
A Teoria da Autodeterminação (Deci & Ryan) mostra que motivação sustentável depende de três necessidades psicológicas — autonomia, competência e pertencimento — e que produtos construídos sobre esses pilares geram engajamento genuíno sem precisar de gatilhos artificiais de urgência ou comparação pública.
→ **Decisão**: sem ranking público nem comparação entre usuários por padrão. Personalização de metas e categorias (autonomia). Dashboard mostra progresso real, não "pontos" (competência). Accountability é opcional e privada, entre poucas pessoas escolhidas pelo usuário (pertencimento sem exposição).

### Diário de reflexão
Desde os anos 1980, a linha de pesquisa de James Pennebaker mostra que escrever sobre pensamentos e emoções em sessões curtas (cerca de 15 min) já produz benefícios mensuráveis de saúde física e psicológica — e que o benefício está no ato de escrever, não em compartilhar ou reler o texto depois.
→ **Decisão**: diário 100% privado por padrão. Nem o Coach IA lê o texto bruto sem opt-in explícito. Prompt diário curto para reduzir a fricção do "não sei o que escrever".

### Revisão semanal
O próprio Goal-Setting Theory mostra que feedback periódico sobre o progresso é o que sustenta o comprometimento com a meta ao longo do tempo — sem feedback, mesmo metas bem definidas perdem força.
→ **Decisão**: ritual semanal (dia configurável) que resume metas, hábitos e diário da semana e pede um ajuste consciente de plano, não só mostra números.

---

## 3. Pilares de produto

| Pilar | Pesquisa-base | Funcionalidade |
|-------|---------------|-----------------|
| Metas | Goal-Setting Theory | Meta específica + mensurável + prazo + dificuldade |
| Plano de ação | Implementation Intentions | Campo "se-então" obrigatório por meta/hábito |
| Hábitos | Lally et al. + gamificação ética | Consistência 30 dias, pausa sem culpa |
| Diário | Expressive Writing (Pennebaker) | Texto privado, criptografado, prompt diário |
| Revisão semanal | Feedback loop (GST) | Resumo + ajuste de plano, não só números |
| Dashboard | Self-Determination Theory | Progresso real, sem ranking público |
| Coach IA (Pro) | — | Insight semanal a partir de métricas agregadas |

---

## 4. MVP — Free vs Pro

> [!NOTE]
> Os recursos Pro (ex: Coach IA, busca avançada, exportação) e as restrições de volumes no plano gratuito (até 3 metas/hábitos) estão suspensos e serão implementados apenas a partir de **Fevereiro de 2027**. No MVP atual, todos os usuários têm acesso a metas e hábitos **ilimitados**.

| Recurso | MVP (Free / Atual) | Pro (Pós-Fevereiro 2027) |
|---------|--------------------|--------------------------|
| Metas ativas | **Ilimitadas** | Ilimitadas |
| Hábitos ativos | **Ilimitados** | Ilimitados |
| Diário | ilimitado | ilimitado + busca |
| Revisão semanal | manual | manual + sugestão automática |
| Dashboard | básico | analytics avançado |
| Coach IA | — | resumo semanal personalizado |
| Exportação de dados | — | PDF / CSV |

Incluso automaticamente no **Flavos Pass** e **Flavos Pass Founder**, seguindo o padrão já definido para os outros apps.

---

## 5. Arquitetura técnica

**Stack**: Node.js + Express + TypeScript · PostgreSQL + Prisma (Neon, `DATABASE_URL` com `?pgbouncer=true&connection_limit=1`) · React + TypeScript + Vite + Tailwind + Framer Motion · JWT HS256 + bcrypt · Resend (e-mail) · Gemini API (Coach IA, opcional/Pro) · Deploy: Fly.io.

**Por que Node/Express/Prisma e não FastAPI (como o Study)?** O Study usa IA em quase toda interação (resumir, explicar, gerar quiz), o que justificou Python/FastAPI. O Forge usa IA só para o insight semanal (job assíncrono, baixo volume) — não há razão técnica para sair do stack padrão da empresa.

**Fase pré-SSO**: igual ao Study, o Forge nasce com auth própria (JWT local), pensada desde o início para ser substituída pelo SSO do Flavos One sem breaking change — por isso `User.id` já nasce como `String(36)` UUID (mesma lição já aprendida no Study).

**Estrutura de pastas (backend)**:
```
src/
  routes/        auth, goals, habits, journal, coach
  middlewares/   auth.ts, requireOwner.ts, rateLimiter.ts
  services/      encryption.ts, coachService.ts, emailService.ts
  schemas/       zod schemas por entidade
  prisma/        schema.prisma
```

---

## 6. Modelo de dados (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL") // Neon: ?pgbouncer=true&connection_limit=1
}

enum Plan {
  FREE
  FORGE_PRO
  FLAVOS_PASS
  FLAVOS_PASS_FOUNDER
}

enum GoalStatus { ACTIVE COMPLETED ARCHIVED }
enum Difficulty { MODERATE HIGH }

model User {
  id           String    @id @default(uuid()) @db.VarChar(36) // UUID desde o início
  email        String    @unique
  passwordHash String
  name         String?
  plan         Plan      @default(FREE)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?

  goals          Goal[]
  habits         Habit[]
  journalEntries JournalEntry[]
  sessions       Session[]
}

model Session {
  id        String    @id @default(uuid()) @db.VarChar(36)
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  expiresAt DateTime
  createdAt DateTime  @default(now())
  revokedAt DateTime?
}

model Goal {
  id              String        @id @default(uuid()) @db.VarChar(36)
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  title           String
  specificOutcome String        // "específico" do Goal-Setting Theory
  metric          String?       // "mensurável"
  difficulty      Difficulty    @default(MODERATE)
  deadline        DateTime?
  status          GoalStatus    @default(ACTIVE)
  actionPlans     ActionPlan[]
  checkIns        GoalCheckIn[]
  createdAt       DateTime      @default(now())
}

model ActionPlan {
  id         String   @id @default(uuid()) @db.VarChar(36)
  goalId     String
  goal       Goal     @relation(fields: [goalId], references: [id])
  triggerCue String   // "Se ..."
  action     String   // "...então ..."
  createdAt  DateTime @default(now())
}

model GoalCheckIn {
  id        String   @id @default(uuid()) @db.VarChar(36)
  goalId    String
  goal      Goal     @relation(fields: [goalId], references: [id])
  note      String?
  createdAt DateTime @default(now())
}

model Habit {
  id          String         @id @default(uuid()) @db.VarChar(36)
  userId      String
  user        User           @relation(fields: [userId], references: [id])
  title       String
  cue         String?
  freezesUsed Int            @default(0) // "pausas" sem penalização
  createdAt   DateTime       @default(now())
  checkIns    HabitCheckIn[]
}

model HabitCheckIn {
  id        String   @id @default(uuid()) @db.VarChar(36)
  habitId   String
  habit     Habit    @relation(fields: [habitId], references: [id])
  date      DateTime @db.Date
  completed Boolean
  createdAt DateTime @default(now())

  @@unique([habitId, date])
}

model JournalEntry {
  id         String    @id @default(uuid()) @db.VarChar(36)
  userId     String
  user       User      @relation(fields: [userId], references: [id])
  contentEnc Bytes     // AES-256-GCM — nunca texto puro
  iv         Bytes
  authTag    Bytes
  mood       Int?      // escala opcional, usada pelo Coach IA em vez do texto bruto
  createdAt  DateTime  @default(now())
  deletedAt  DateTime?
}
```

---

## 7. Segurança (aplicação da Global Security Rule)

### Segurança aplicada
- Auth própria: bcrypt ≥ 12 rounds, JWT HS256, cookie HttpOnly + Secure + SameSite, rate limit em login/cadastro/recuperação de senha
- Ownership check obrigatório em toda rota que acessa goal/habit/journal por `id` (nunca confiar em `userId` vindo do cliente)
- Diário criptografado em repouso (AES-256-GCM), chave própria (`JOURNAL_ENC_KEY`) separada do `JWT_SECRET_KEY`
- Coach IA: só recebe métricas agregadas (consistência, progresso, mood numérico) — nunca o texto bruto do diário, a menos que o usuário dê opt-in explícito; system prompt separado do conteúdo do usuário; saída validada por schema (zod) antes de salvar
- CORS com allowlist, `helmet()`, logs sem dado sensível, segredos só em `.env`/provedor
- `User.id` como UUID `String(36)` desde o dia 1 — evita o mesmo problema de migração que o Study enfrenta hoje

### Riscos mitigados
- IDOR entre usuários (acesso à meta, hábito ou diário de outra pessoa)
- Vazamento de diário em caso de dump do banco (criptografia em repouso)
- Prompt injection / exfiltração de dado sensível via IA
- Brute force em login/cadastro/recuperação de senha
- Exposição de segredo (chave de IA, JWT secret, chave de criptografia) em frontend ou log

### Riscos restantes (aceitáveis no MVP — corrigir antes de escalar)
- Sem 2FA — alinhado ao roadmap geral do ecossistema (2FA é Fase 8 global, dependente do Flavos One)
- Sem Redis blacklist de sessão — logout funciona, mas revogação imediata de token comprometido depende de expiração curta até integrar SSO
- Chave de criptografia do diário sem rotação no MVP — definir rotação antes do lançamento público em escala

### Testes recomendados
- Acessar `/api/goals/:id`, `/api/habits/:id`, `/api/journal/:id` autenticado como outro usuário (IDOR)
- Forçar `plan: "FORGE_PRO"` no payload do cliente e confirmar que o backend ignora
- Token expirado / adulterado / cookie ausente
- Payload gigante no diário (limite de tamanho)
- Resposta da IA fora do schema esperado (deve falhar de forma segura, sem salvar lixo)
- Rate limit em login e em geração de insight

### Próximos passos (pós-MVP)
- Migrar para SSO do Flavos One quando disponível (reaproveitar `JWT_SECRET_KEY` compartilhado)
- Redis blacklist + 2FA TOTP, acompanhando a Fase 8 do roadmap geral
- Rotação de chave de criptografia do diário

**Trechos ilustrativos** (não é o código completo, só a decisão de implementação):

```ts
// services/encryption.ts — diário nunca em texto puro
const ALGO = "aes-256-gcm";
const KEY = Buffer.from(process.env.JOURNAL_ENC_KEY!, "hex"); // 32 bytes, != JWT_SECRET

export function encryptJournal(plain: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const content = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return { content, iv, authTag: cipher.getAuthTag() };
}
```

```ts
// middlewares/requireOwner.ts — bloqueia acesso horizontal indevido
export async function requireOwner(req, res, next) {
  const goal = await prisma.goal.findUnique({ where: { id: req.params.id } });
  if (!goal) return res.status(404).json({ error: "not_found" });
  if (goal.userId !== req.user.id) return res.status(403).json({ error: "forbidden" });
  req.goal = goal;
  next();
}
```

```ts
// services/coachService.ts — system prompt separado, sem texto bruto do diário
const insightSchema = z.object({
  summary: z.string().max(400),
  highlight: z.string().max(120),
  suggestion: z.string().max(200),
});

const raw = await callGemini({
  system: COACH_SYSTEM_PROMPT,                    // nunca inclui dado do usuário
  user: buildMetricsOnlyPrompt(userMetrics),       // só números agregados
});

const parsed = insightSchema.safeParse(JSON.parse(raw));
if (!parsed.success) {
  // fallback: não salva, não exibe, loga só metadado (sem prompt/resposta completos)
}
```

---

## 8. Monetização & encaixe no ecossistema

- Plano sugerido: **Flavos Forge Pro** — R$ 7,90/mês (R$ 3,95/mês estudante), no mesmo patamar do Healthy/Sync, já que o uso de IA aqui é leve (1 insight/semana, não por interação como no Study)
- Campo `plan` (`FREE` / `FORGE_PRO`) já existe no schema desde a Semana 1, mas **sem checkout próprio**: igual ao Study, a ativação de Pro fica congelada (entitlement manual/local) até o checkout centralizado do Flavos One estar no ar — mesma estratégia-ponte já decidida para o resto do ecossistema
- Quando o SSO existir: o app só passa a ler o `plan` do JWT compartilhado, sem tocar em pagamento

---

## 9. Roadmap — 8 fases, 1 semana cada

| Semana | Entregável principal | Critério de "pronto" |
|--------|----------------------|------------------------|
| **1 — Fundação** | Repo, Express+TS+Prisma, Postgres Neon, `.env.example`, `helmet()`, CORS allowlist, healthcheck sem dado sensível, deploy esqueleto no Fly.io | App sobe vazio, seguro por padrão (fail closed) |
| **2 — Auth própria** | Registro/login/logout, bcrypt ≥12, JWT+cookie httpOnly, recuperação de senha (Resend, OTP, 1h, single-use), rate limit | Fluxo de auth testado, brute force bloqueado |
| **3 — Metas** | CRUD de metas (específico/mensurável/prazo/dificuldade) + ActionPlan (se-então) obrigatório + ownership check | Acesso à meta de outro usuário retorna 403/404 |
| **4 — Hábitos** | CRUD de hábitos com cue, check-in diário, consistência em janela de 30 dias, mecânica de pausa sem penalidade | Perder um dia não "reseta" a percepção de progresso |
| **5 — Diário & Revisão** | Diário criptografado (AES-256-GCM), soft delete, exportação LGPD, tela de revisão semanal | Conteúdo do diário ilegível em texto puro no banco |
| **6 — Dashboard & UI** | React+Vite+Tailwind+Framer Motion, identidade visual própria (ver mockup), sanitização de conteúdo renderizado | Fluxo completo login → dashboard → meta → hábito → diário → revisão navegável |
| **7 — Coach IA & escopo Pro** | Job semanal assíncrono (métricas agregadas, nunca texto bruto), schema da IA validado, campo `plan` pronto sem checkout | Insight gerado corretamente para usuário marcado Pro manualmente |
| **8 — Auditoria & go-live** | Checklist completo da Global Security Rule, `npm audit`, testes de IDOR/JWT/rate limit/payload, CORS restrito a produção, backup do Postgres, política de privacidade/termos | App no ar em `forge.flavoscompany.xyz` com checklist 100% revisado |

**Total: 8 semanas (~2 meses)** até produção — sem contar a integração final de SSO, que depende do lançamento do Flavos One.

---

## 10. Riscos & perguntas abertas

- Ativação de Pro antes do Flavos One existir: mesma decisão pendente do Flavos Study — usar entitlement local até o SSO existir (recomendado: sim, mesma estratégia)
- Limite de uso de IA no Free: zero, ou 1 insight grátis por mês como teaser de conversão?
- Retenção do diário após exclusão de conta: quanto tempo de soft delete antes da purga definitiva?
- Notificações: push (exige infra extra) ou só lembrete dentro do app na Fase 1?
- Esse projeto entra em paralelo com a Fase 6.1 do Study (SSO, 19–26/06) ou só começa depois? Isso define se a Semana 1 começa nesta semana ou na próxima.

---

## 11. Mockup

Tela principal (artifact React em anexo): **Focus Dial** — anel de consistência diária inspirado em um dial de cofre, o elemento de marca do app — metas com plano "se-então" visível, hábitos mostrando consistência (não streak), diário privado com indicador de criptografia, e o Coach IA aparecendo como teaser bloqueado (Pro), reforçando visualmente a divisão Free/Pro.

**Identidade visual**: alinhada à paleta oficial da marca Flavos (gradiente verde → ciano → azul-marinho da logo), em vez de uma cor isolada nova. Fundo grafite quente (`#15131B`), texto bege claro (`#F4EFE6`); accent primário "forge teal" (`#22B8CF`, o ciano da logo) para ações e CTAs, "forge green" (`#2F9E5C`) para metas/progresso, "forge navy" (`#0B2545`) para elementos de estrutura/header. O símbolo da bigorna (logo do Forge) pode aparecer sutilmente como marca d'água no Focus Dial. Display em Bricolage Grotesque, corpo em Manrope, dados/números em IBM Plex Mono — mantém a mesma qualidade de identidade da família Flavos, mas agora consistente com as cores da marca-mãe em vez de uma paleta própria isolada (correção em relação à primeira versão do guia, que usava ember/laranja).

---

## Tags
#produto/flavos-forge #técnico #segurança #estratégia #roadmap