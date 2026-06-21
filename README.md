# Flavos Forge 🚀

> **Flavos Forge** é uma plataforma de desenvolvimento pessoal baseada em ciência comportamental (Teoria de Estabelecimento de Metas e Intenções de Implementação), projetada para ajudar os usuários a gerenciar metas, criar hábitos consistentes e realizar reflexões diárias de humor e diário com total privacidade através de criptografia de ponta.

O ecossistema é composto por um aplicativo móvel híbrido (Android/iOS via Capacitor) e um backend escalável em Node.js com Express e Prisma.

---

## 🏗️ Arquitetura do Projeto

```
                ┌─────────────────────────────────┐
                │        Dispositivo Híbrido      │
                │     (Capacitor + React SPA)     │
                └────────────────┬────────────────┘
                                 │ HTTPS
                                 ▼
                   ┌───────────────────────────┐
                   │    Oracle Cloud VPS       │
                   │                           │
                   │   ┌───────────────────┐   │
                   │   │    Caddy Proxy    │   │ (Portas 80/443, SSL automático)
                   │   └─────────┬─────────┘   │
                   │             │ proxy reverso (Porta 5000)
                   │             ▼
                   │   ┌───────────────────┐   │
                   │   │  Express Backend  │   │ (Docker Container)
                   │   └────┬───────────┬──┘   │
                   └────────┼───────────┼──────┘
                            │           │
           Leitura/Escrita  │           │ API Call
                            ▼           ▼
             ┌──────────────┴──┐     ┌──┴───────────────┐
             │ Postgres (Neon) │     │    Gemini API    │
             └─────────────────┘     └──────────────────┘
```

---

## 🛠️ Stack Tecnológica

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, `@capacitor/core` / `@capacitor/android`
- **Backend:** Node.js, Express, TypeScript, Prisma Client, Express-Rate-Limit, Helmet
- **Banco de Dados:**
  - **Desenvolvimento Local:** SQLite (banco em arquivo `dev.db`, prático para setup rápido)
  - **Produção:** PostgreSQL (Neon Tech / Serverless PostgreSQL)
- **Integração de IA:** Gemini API (`gemini-2.5-flash`) para geração do insight semanal do Coach IA
- **Proxy & Segurança:** Caddy Server (emissão e renovação automática de certificado TLS Let's Encrypt)
- **Infraestrutura:** Docker, Docker Compose, Oracle Cloud Infrastructure (Always Free VPS)

---

## 🔒 Segurança (Global Security Rule Aplicada)

Este projeto segue diretrizes rígidas de segurança em todas as camadas:
1. **Zero Trust no Frontend:** O frontend não possui segredos e todas as permissões são auditadas rigorosamente no backend.
2. **CORS Restrito:** Origens permitidas são configuradas de forma explícita via variável de ambiente, bloqueando requisições não autorizadas.
3. **Criptografia no Diário:** Entradas de diário sensíveis são criptografadas antes de serem armazenadas no banco de dados.
4. **Rate Limit:** Limitadores de taxa aplicados globalmente e rotas sensíveis protegidas contra abuso de requisições.
5. **Fail-Closed Auth:** Verificação estrita de propriedade de recursos por ID de usuário no banco de dados.

---

## 💻 Configuração Local (Desenvolvimento)

### Pré-requisitos
- Node.js (v20 ou superior)
- npm ou yarn

### 1. Clonar e Instalar as Dependências

Na raiz do projeto (para instalar dependências do backend):
```bash
npm install
```

Para instalar as dependências do frontend:
```bash
cd client
npm install
cd ..
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas chaves locais. Para desenvolvimento local com SQLite, mantenha a variável de banco apontando para o arquivo local:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="file:./dev.db"
JWT_SECRET_KEY="sua_chave_secreta_com_pelo_menos_32_caracteres"
JOURNAL_ENC_KEY="uma_chave_hexadecimal_de_64_caracteres_gerada_com_openssl"
CORS_ORIGINS="http://localhost:5173"
```

### 3. Executar o Prisma localmente
```bash
# Executa a geração do Prisma Client
npm run prisma:generate

# Cria o arquivo de banco SQLite local e executa as migrations
npm run prisma:migrate
```

### 4. Rodar o Ambiente de Desenvolvimento

Para rodar o backend e o frontend simultaneamente:
```bash
# Na raiz do projeto, roda o watcher do TypeScript para o backend
npm run dev
```

E em outro terminal, para o frontend:
```bash
npm run dev:client
```

---

## 🚀 Deploy em Produção (Oracle Cloud VPS)

O deploy é orquestrado através do Docker Compose, facilitando o gerenciamento do container Node.js e do proxy reverso Caddy com SSL automático.

Consulte o guia detalhado de provisionamento de VPS, configuração de rede/VNIC, liberação do firewall do Ubuntu (`iptables`) e deploy no arquivo:
👉 **[Guia de Deploy na Oracle Cloud VPS](file:///C:/Users/Usuario/.gemini/antigravity-ide/brain/e88966ad-cd5d-41bc-acff-76bbd6bab468/deploy_oracle_vps_guide.md)**

### Comandos rápidos no Servidor VPS:

```bash
# 1. Clonar o repositório
git clone https://github.com/flavoscompany/flavos-forge-backend.git
cd flavos-forge-backend

# 2. Criar o arquivo de produção .env.production
nano .env.production

# 3. Rodar as migrations no banco Postgres de Produção (Neon)
export DATABASE_URL="seu_link_neon_do_env_production"
npx prisma db push --schema=src/prisma/schema.prisma

# 4. Subir os containers do Docker Compose
docker compose up -d --build
```

---

## ⏰ Tarefas Agendadas (Cron Job)

O **Coach IA** gera resumos semanais de forma assíncrona. Ele é executado por um script independente compilado em `dist/cron.js`.

Para agendar a execução periódica na VPS sem desperdiçar recursos de RAM:
1. Acesse as tarefas agendadas da VPS:
   ```bash
   crontab -e
   ```
2. Adicione a linha abaixo para executar toda segunda-feira às 08:00 UTC dentro do container em execução:
   ```cron
   0 8 * * 1 /usr/bin/docker exec forge-backend node dist/cron.js >> /home/ubuntu/flavos-forge-backend/cron.log 2>&1
   ```
