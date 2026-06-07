# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS build
WORKDIR /app

# Prisma's query engine needs OpenSSL; the slim image ships without it, which
# makes prisma misdetect the engine. Install it before `npm ci` runs prisma generate.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app

# OpenSSL for the Prisma query engine at runtime (and for prisma generate during
# this stage's npm ci). Without it Prisma fails with "libssl.so cannot open".
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install ALL deps (incl. prisma CLI + ts-node) before setting NODE_ENV, so the
# runtime image can run `prisma migrate deploy` and the ts-node bootstrap command.
# NODE_ENV=production is set afterwards so it only affects the running app.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
ENV NODE_ENV=production

COPY --from=build /app/dist ./dist

# The ts-node `db:bootstrap` command runs scripts/bootstrap.ts, which imports
# from src/ — ship those sources + tsconfig so it can run in the prod image.
# The app itself still runs from dist (start:prod = node dist/main.js).
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts

RUN mkdir -p /app/data
VOLUME ["/app/data"]
EXPOSE 3611

CMD ["npm", "run", "start:prod"]
