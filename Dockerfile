# Stage 1: Install dependencies
FROM oven/bun:latest AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install

# Stage 2: Build the application
FROM oven/bun:latest AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Stage 3: Runner 
FROM node:24-alpine AS runner
WORKDIR /app

# ENVIRONMENT
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# COPY stage builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000

# Run Frontend
CMD ["node", "server.js"]