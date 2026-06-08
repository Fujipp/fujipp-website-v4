# Combined image: the orchestrator (bot-runtime-service) plus the central-bot it
# launches via PM2 inside this container. Build context is ./services so both can
# be copied in.
FROM node:20-bookworm-slim

WORKDIR /app

# central-bot deps + source (the orchestrator spawns it via PM2)
COPY central-bot/package.json central-bot/package-lock.json ./central-bot/
RUN cd central-bot && npm ci --omit=dev
COPY central-bot ./central-bot

# orchestrator deps + source
COPY bot-runtime-service/package.json bot-runtime-service/package-lock.json ./bot-runtime-service/
RUN cd bot-runtime-service && npm ci --omit=dev
COPY bot-runtime-service ./bot-runtime-service

ENV NODE_ENV=production \
    PORT=8090 \
    CENTRAL_BOT_ENTRY=/app/central-bot/src/server.js

WORKDIR /app/bot-runtime-service
EXPOSE 8090
CMD ["node", "src/server.js"]
