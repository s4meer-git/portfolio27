FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY astro.config.mjs tsconfig.json ./
COPY cms/package.json ./cms/package.json
COPY src ./src
COPY public ./public
ARG CMS_URL=https://cms.s4meer.com
ARG SITE_URL=https://s4meer.com
ENV CMS_URL=$CMS_URL SITE_URL=$SITE_URL
RUN pnpm build && pnpm prune --prod

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321 IMAGE_CACHE_DIR=/app/.cache
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
RUN mkdir -p /app/.cache && chown node:node /app/.cache
USER node
EXPOSE 4321
CMD ["node", "dist/server/entry.mjs"]
