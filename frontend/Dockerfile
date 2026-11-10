FROM node:24-alpine AS base

# dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# build React SPA
FROM base AS build
WORKDIR /app
COPY . ./
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

# production runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/server.js ./server.js
COPY --from=build --chown=node:node /app/package.json ./package.json

USER node
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-3000}/ > /dev/null || exit 1

CMD ["node", "server.js"]
