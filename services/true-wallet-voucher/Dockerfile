# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app

# Install ALL deps (incl. prisma CLI + ts-node) before setting NODE_ENV, so the
# runtime image can run `prisma migrate deploy` and the ts-node bootstrap command.
# NODE_ENV=production is set afterwards so it only affects the running app.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
ENV NODE_ENV=production

COPY --from=build /app/dist ./dist

RUN mkdir -p /app/data
VOLUME ["/app/data"]
EXPOSE 3611

CMD ["npm", "run", "start:prod"]
