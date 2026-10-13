FROM node:22-bookworm-slim AS build
WORKDIR /app/cms
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY cms/package.json cms/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY cms/src ./src
COPY cms/config ./config
COPY cms/seed ./seed
COPY cms/public ./public
COPY cms/tsconfig.json cms/favicon.png ./
ARG PUBLIC_URL=https://cms.s4meer.com
ENV NODE_ENV=production PUBLIC_URL=$PUBLIC_URL STRAPI_TELEMETRY_DISABLED=true
RUN npm run build && npm prune --omit=dev --no-audit --no-fund

FROM node:22-bookworm-slim AS runtime
WORKDIR /app/cms
ENV NODE_ENV=production HOST=0.0.0.0 PORT=1337 STRAPI_TELEMETRY_DISABLED=true
COPY --from=build --chown=node:node /app/cms ./
COPY --chown=node:node deploy/check-cms-state.cjs ./check-cms-state.cjs
RUN mkdir -p .tmp public/uploads database/migrations \
    && chown node:node /app/cms .tmp public/uploads database database/migrations
USER node
EXPOSE 1337
CMD ["sh", "-c", "node check-cms-state.cjs && npm run start"]
