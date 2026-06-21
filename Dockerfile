# Build Stage
FROM node:20-slim AS builder

# Install open-ssl for prisma client
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including devDependencies for building TypeScript)
RUN npm ci

COPY src/ ./src/

# Generate Prisma Client
RUN npx prisma generate --schema=src/prisma/schema.prisma

# Build the TypeScript project
RUN npm run build

# Runner Stage
FROM node:20-slim AS runner

# Install openssl for prisma client execution
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app

# Run the app under a non-privileged system user for container security
USER node

# Copy package configuration
COPY --chown=node:node package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy generated Prisma Client and built application from builder stage
COPY --chown=node:node --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=node:node --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/src/prisma ./src/prisma

# Expose server port
EXPOSE 5000

CMD ["node", "dist/index.js"]
